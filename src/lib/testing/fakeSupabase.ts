import type { ClientLike } from '../loanCloud.ts';

// A stand-in for the Supabase client that behaves like the loan tables in
// supabase/migrations/20261015120000_loan_persistence.sql: each client acts as one signed-in user, so row-level security
// is applied (other users' rows are invisible and cannot be written); revision goes up on every update; deleting a loan
// tombstones what hangs off it; a child needs a live loan; one transaction pays one installment. It also fails on demand,
// the way a network does. It is only for tests: what the real database does is checked in supabase/tests/.

type Row = Record<string, unknown>;
interface DbError { code?: string; message: string }

const CHILD_TABLES = ['loan_installment_links', 'loan_manual_payments', 'loan_adjustments', 'loan_transaction_roles', 'loan_bnpl_purchases'];
const PK: Record<string, string[]> = { loan_bnpl_purchases: ['user_id', 'loan_id'] };
const pkOf = (table: string) => PK[table] ?? ['user_id', 'id'];

export interface FakeDb {
  tables: Record<string, Row[]>;
  client(userId: string): ClientLike;
  net: { down: boolean; failNext: number; loseReplyNext: number; calls: number; log: string[] };
}

export function createFakeDb(): FakeDb {
  const tables: Record<string, Row[]> = {};
  const net = { down: false, failNext: 0, loseReplyNext: 0, calls: 0, log: [] as string[] };
  const rows = (t: string) => (tables[t] ??= []);

  function find(table: string, key: Row) {
    return rows(table).find((r) => pkOf(table).every((c) => r[c] === key[c]));
  }

  function check(table: string, r: Row): DbError | null {
    if (table === 'loans' && (Number(r.amount_cents) <= 0 || !['weekly', 'biweekly', 'monthly'].includes(String(r.frequency)))) return { code: '23514', message: 'new row for relation "loans" violates check constraint' };
    if (table === 'loan_manual_payments' && Number(r.amount_cents) <= 0) return { code: '23514', message: 'violates check constraint' };
    // A live row needs a live loan.
    if (table !== 'loans' && !r.deleted_at && !rows('loans').some((l) => l.user_id === r.user_id && l.id === r.loan_id && !l.deleted_at)) return { code: '23503', message: 'The loan this belongs to has been deleted' };
    const live = (x: Row) => !x.deleted_at;
    if (table === 'loan_installment_links' && r.status === 'linked' && live(r) && rows(table).some((x) => x.user_id === r.user_id && x.txn_id === r.txn_id && x.status === 'linked' && live(x))) return { code: '23505', message: 'duplicate key value violates unique constraint "loan_installment_links_one_payment_per_txn"' };
    if (table === 'loan_transaction_roles' && live(r) && rows(table).some((x) => x.user_id === r.user_id && x.txn_id === r.txn_id && live(x))) return { code: '23505', message: 'duplicate key value violates unique constraint "loan_transaction_roles_one_role_per_txn"' };
    return null;
  }

  function insert(table: string, uid: string, input: Row): { row?: Row; error?: DbError } {
    if (input.user_id !== uid) return { error: { code: '42501', message: 'new row violates row-level security policy' } };
    const row: Row = { revision: 1, created_at: 'now', updated_at: 'now', deleted_at: null, deleted_by: null, ...input };
    const error = check(table, row);
    if (error) return { error };
    rows(table).push(row);
    return { row };
  }

  function update(table: string, old: Row, patch: Row): { error?: DbError } {
    const next: Row = { ...old, ...patch, revision: Number(old.revision) + 1 };
    if (next.user_id !== old.user_id || next.id !== old.id || next.loan_id !== old.loan_id) return { error: { code: '23514', message: 'The owner and identity of a loan record cannot change' } };
    // The row's own old copy does not count against it.
    const saved = tables[table];
    tables[table] = saved.filter((x) => x !== old);
    const error = check(table, next);
    tables[table] = saved;
    if (error) return { error };
    const wasLive = !old.deleted_at;
    Object.assign(old, next);
    if (table === 'loans' && wasLive && next.deleted_at) {
      for (const child of CHILD_TABLES) {
        for (const c of rows(child)) if (c.user_id === old.user_id && c.loan_id === old.id && !c.deleted_at) Object.assign(c, { deleted_at: next.deleted_at, deleted_by: next.deleted_by, revision: Number(c.revision) + 1 });
      }
    }
    return {};
  }

  class Query {
    private kind: 'select' | 'insert' | 'update' = 'select';
    private filters: { col: string; test: (v: unknown) => boolean }[] = [];
    private patch: Row = {};
    private input: Row = {};
    private opts: { ignoreDuplicates?: boolean } = {};
    private returning = false;
    private single = false;
    private window: [number, number] | null = null;
    private sortBy: string | null = null;
    private table: string;
    private uid: string;
    constructor(table: string, uid: string) {
      this.table = table;
      this.uid = uid;
    }

    select() { this.returning = true; return this; }
    eq(col: string, val: unknown) { this.filters.push({ col, test: (v) => v === val }); return this; }
    is(col: string, val: null) { this.filters.push({ col, test: (v) => (v ?? null) === val }); return this; }
    not(col: string, _op: string, val: null) { this.filters.push({ col, test: (v) => (v ?? null) !== val }); return this; }
    order(col: string) { this.sortBy = col; return this; }
    range(a: number, b: number) { this.window = [a, b]; return this; }
    maybeSingle() { this.single = true; return this; }
    upsert(row: Row, opts: { ignoreDuplicates?: boolean } = {}) { this.kind = 'insert'; this.input = row; this.opts = opts; return this; }
    update(patch: Row) { this.kind = 'update'; this.patch = patch; return this; }

    then<T>(resolve: (v: { data: unknown; error: DbError | null }) => T, reject?: (e: unknown) => T) {
      return Promise.resolve(this.run()).then(resolve, reject);
    }

    private run(): { data: unknown; error: DbError | null } {
      net.calls += 1;
      net.log.push(`${this.kind} ${this.table}`);
      if (net.down) return { data: null, error: { message: 'TypeError: Failed to fetch' } };
      if (net.failNext > 0) {
        net.failNext -= 1;
        return { data: null, error: { message: 'Server error (503)' } };
      }
      const lose = this.kind !== 'select' && net.loseReplyNext > 0 ? (net.loseReplyNext -= 1, true) : false;
      const out = this.execute();
      if (lose) return { data: null, error: { message: 'TypeError: Failed to fetch' } }; // it happened; the reply was lost
      return out;
    }

    private visible() {
      // Row-level security: only the signed-in user's own rows.
      return rows(this.table).filter((r) => r.user_id === this.uid && this.filters.every((f) => f.test(r[f.col])));
    }

    private execute(): { data: unknown; error: DbError | null } {
      if (this.kind === 'select') {
        let list = this.visible();
        if (this.sortBy) list = [...list].sort((a, b) => String(a[this.sortBy!]).localeCompare(String(b[this.sortBy!])));
        if (this.window) list = list.slice(this.window[0], this.window[1] + 1);
        const clone = list.map((r) => ({ ...r }));
        return this.single ? { data: clone[0] ?? null, error: null } : { data: clone, error: null };
      }
      if (this.kind === 'insert') {
        const existing = find(this.table, this.input);
        if (existing) {
          if (existing.user_id !== this.uid) return { data: null, error: { code: '42501', message: 'new row violates row-level security policy' } };
          if (this.opts.ignoreDuplicates) return { data: this.returning ? [] : null, error: null };
          const { error } = update(this.table, existing, this.input);
          return error ? { data: null, error } : { data: this.returning ? [{ ...existing }] : null, error: null };
        }
        const { row, error } = insert(this.table, this.uid, this.input);
        return error ? { data: null, error } : { data: this.returning ? [{ ...row! }] : null, error: null };
      }
      const hit = this.visible();
      for (const r of hit) {
        const { error } = update(this.table, r, this.patch);
        if (error) return { data: null, error };
      }
      return { data: this.returning ? hit.map((r) => ({ ...r })) : null, error: null };
    }
  }

  return {
    tables,
    net,
    client: (uid) => ({ from: (table: string) => new Query(table, uid) }),
  };
}
