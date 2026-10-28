import type { InstallmentLink } from './loanLinks';
import { normalizeLinks } from './loanLinks';
import { normalizeAdjustments, normalizePayments, type LoanAdjustment, type ManualPayment } from './loanPayments';
import { normalizeRoles, type LoanRole } from './loanRoles';
import { normalizeLoan, type Loan } from './loans';

// How loans and everything attached to them are written to, and read back from, the account's tables. This file knows
// the table layout (see supabase/migrations/20261015120000_loan_persistence.sql) and nothing about screens or queues.
//
// Every write is a compare-and-set on the row's revision, and deleting is a tombstone, so a device that was offline can
// neither overwrite a newer change nor bring a deleted record back. What the person typed is never changed by the cloud:
// reading a row goes through the same validators the app used for its own storage.

/* ------------------------------------------------------------------------------------------------- the entities */
export type EntityName = 'loan' | 'link' | 'payment' | 'adjustment' | 'role';
export const ENTITIES: EntityName[] = ['loan', 'link', 'payment', 'adjustment', 'role'];

export interface EntityRecords {
  loan: Loan;
  link: InstallmentLink;
  payment: ManualPayment;
  adjustment: LoanAdjustment;
  role: LoanRole;
}

export interface Versioned<T = unknown> {
  value: T;
  revision: number; // the row's revision when it was read
}
export type Snapshot = Record<EntityName, Record<string, Versioned>>;
export const emptySnapshot = (): Snapshot => ({ loan: {}, link: {}, payment: {}, adjustment: {}, role: {} });

export interface Op {
  id: string; // identifies this attempt across restarts
  entity: EntityName;
  kind: 'put' | 'remove';
  key: string;
  record?: unknown; // for a put: the whole record as it should be
  baseRevision: number | null; // the revision this change was made on top of; null for a record created here
  queuedAt: number;
  attempts: number;
}

export type ApplyResult =
  | { ok: true; revision: number }
  | { ok: false; kind: 'conflict'; reason: 'changed' | 'deleted'; remote?: Versioned }
  | { ok: false; kind: 'rejected'; message: string }; // the database will never accept it as it is

// Anything that goes wrong for a reason that may pass (no network, a server error) is thrown, so it is retried.
export interface RemoteApi {
  fetch(userId: string): Promise<Snapshot>;
  apply(userId: string, op: Op): Promise<ApplyResult>;
}

/* -------------------------------------------------------------------------------------------------- keys, labels */
export const keyOf = (entity: EntityName, record: unknown): string => String((record as { id: string }).id);

export function labelOf(entity: EntityName, record: unknown, loans: Record<string, Versioned> = {}): string {
  const r = record as Record<string, unknown>;
  const loanName = (id: unknown) => String((loans[String(id)]?.value as Loan | undefined)?.lender ?? 'a loan');
  if (entity === 'loan') return `the ${r.lender || 'loan'} loan`;
  if (entity === 'link') return `a payment link on ${loanName(r.loanId)}`;
  if (entity === 'payment') return `a payment you recorded on ${loanName(r.loanId)}`;
  if (entity === 'adjustment') return `an adjustment on ${loanName(r.loanId)}`;
  return `a transaction tied to ${loanName(r.loanId)}`;
}

// A record in one fixed form, so two copies can be compared whatever order their fields were written in.
export function canonical(entity: EntityName, record: unknown, uid = 'x'): string {
  const row = toRows(uid, entity, record);
  const back = fromRows(entity, row.main, row.details);
  return stable(back ?? record);
}
export const sameRecord = (entity: EntityName, a: unknown, b: unknown) => canonical(entity, a) === canonical(entity, b);

// For a loan, whether the loan itself matches, leaving out what it paid for (which is written separately).
export function sameLoanTerms(a: unknown, b: unknown) {
  const { bnpl: _a, ...x } = a as Loan;
  const { bnpl: _b, ...y } = b as Loan;
  return canonical('loan', x) === canonical('loan', y);
}

export function stable(value: unknown): string {
  return JSON.stringify(value, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v));
}

/* ---------------------------------------------------------------------------------------------------- the rows */
type Row = Record<string, unknown>;
const cents = (n: number) => Math.round(n * 100);
const money = (c: unknown) => Math.round(Number(c)) / 100;
const iso = (v: unknown) => (typeof v === 'string' ? v.slice(0, 10) : '');
const stamp = (v: unknown) => (typeof v === 'string' && v ? v : null);
const live = { deleted_at: null, deleted_by: null };
const opt = <T,>(v: T | undefined) => (v === undefined ? null : v);

export const TABLE: Record<EntityName, string> = {
  loan: 'loans',
  link: 'loan_installment_links',
  payment: 'loan_manual_payments',
  adjustment: 'loan_adjustments',
  role: 'loan_transaction_roles',
};
export const DETAILS_TABLE = 'loan_bnpl_purchases';

// The row for a record, and for a loan the second row holding what it paid for (null when there is none).
export function toRows(userId: string, entity: EntityName, record: unknown): { main: Row; details: Row | null } {
  if (entity === 'loan') {
    const l = record as Loan;
    const b = l.bnpl;
    return {
      main: { user_id: userId, id: l.id, lender: l.lender, item: l.item, amount_cents: cents(l.amount), apr: Math.round(l.apr * 10000) / 10000, installment_count: l.count, frequency: l.frequency, first_date: l.firstDate, loan_type: opt(l.type), ...live },
      details: b
        ? { user_id: userId, loan_id: l.id, merchant: opt(b.merchant), category: opt(b.category), purchase_date: opt(b.purchaseDate), purchase_cents: b.purchaseAmount === undefined ? null : cents(b.purchaseAmount), down_payment_cents: b.downPayment === undefined ? null : cents(b.downPayment), plan_id: opt(b.planId), ...live }
        : null,
    };
  }
  if (entity === 'link') {
    const l = record as InstallmentLink;
    return {
      main: { user_id: userId, id: l.id, loan_id: l.loanId, installment: l.installment, lender: l.lender, txn_id: l.txnId, account_id: l.accountId, expected_cents: cents(l.expectedAmount), actual_cents: cents(l.actualAmount), expected_date: l.expectedDate, actual_date: l.actualDate, status: l.status, source: l.source, pending_at_link: l.pendingAtLink, previous_txn_ids: l.previousTxnIds ?? [], client_created_at: stamp(l.createdAt), ...live },
      details: null,
    };
  }
  if (entity === 'payment') {
    const p = record as ManualPayment;
    return { main: { user_id: userId, id: p.id, loan_id: p.loanId, installment: opt(p.installment), amount_cents: cents(p.amount), paid_on: p.date, source: p.source, note: opt(p.note), client_created_at: stamp(p.createdAt), ...live }, details: null };
  }
  if (entity === 'adjustment') {
    const a = record as LoanAdjustment;
    return { main: { user_id: userId, id: a.id, loan_id: a.loanId, kind: a.kind, installment: opt(a.installment), amount_cents: a.amount === undefined ? null : cents(a.amount), adjusted_on: opt(a.date), note: opt(a.note), client_created_at: stamp(a.createdAt), ...live }, details: null };
  }
  const r = record as LoanRole;
  return { main: { user_id: userId, id: r.id, loan_id: r.loanId, txn_id: r.txnId, account_id: r.accountId, role: r.role, amount_cents: cents(r.amount), txn_date: r.date, note: opt(r.note), client_created_at: stamp(r.createdAt), ...live }, details: null };
}

// A record from its row(s), through the same checks the app applies to anything it reads. null if it does not pass.
export function fromRows(entity: EntityName, main: Row, details: Row | null): unknown | null {
  const nil = <T,>(v: T | null | undefined) => (v === null || v === undefined ? undefined : v);
  if (entity === 'loan') {
    const b = details && !details.deleted_at
      ? {
          merchant: nil(details.merchant),
          category: nil(details.category),
          purchaseDate: details.purchase_date ? iso(details.purchase_date) : undefined,
          purchaseAmount: details.purchase_cents == null ? undefined : money(details.purchase_cents),
          downPayment: details.down_payment_cents == null ? undefined : money(details.down_payment_cents),
          planId: nil(details.plan_id),
        }
      : undefined;
    return normalizeLoan({ id: main.id, lender: main.lender, item: main.item, amount: money(main.amount_cents), apr: Number(main.apr), count: main.installment_count, frequency: main.frequency, firstDate: iso(main.first_date), type: nil(main.loan_type), bnpl: b });
  }
  if (entity === 'link') {
    return normalizeLinks([{ id: main.id, loanId: main.loan_id, installment: main.installment, lender: main.lender, txnId: main.txn_id, accountId: main.account_id, expectedAmount: money(main.expected_cents), actualAmount: money(main.actual_cents), expectedDate: iso(main.expected_date), actualDate: iso(main.actual_date), status: main.status, source: main.source, pendingAtLink: main.pending_at_link, previousTxnIds: Array.isArray(main.previous_txn_ids) && main.previous_txn_ids.length ? main.previous_txn_ids : undefined, createdAt: typeof main.client_created_at === 'string' ? main.client_created_at : '' }])[0] ?? null;
  }
  if (entity === 'payment') {
    return normalizePayments([{ id: main.id, loanId: main.loan_id, installment: nil(main.installment), amount: money(main.amount_cents), date: iso(main.paid_on), source: main.source, note: nil(main.note), createdAt: typeof main.client_created_at === 'string' ? main.client_created_at : '' }])[0] ?? null;
  }
  if (entity === 'adjustment') {
    return normalizeAdjustments([{ id: main.id, loanId: main.loan_id, kind: main.kind, installment: nil(main.installment), amount: main.amount_cents == null ? undefined : money(main.amount_cents), date: main.adjusted_on ? iso(main.adjusted_on) : undefined, note: nil(main.note), createdAt: typeof main.client_created_at === 'string' ? main.client_created_at : '' }])[0] ?? null;
  }
  return normalizeRoles([{ loanId: main.loan_id, txnId: main.txn_id, accountId: main.account_id, role: main.role, amount: money(main.amount_cents), date: iso(main.txn_date), note: nil(main.note), createdAt: typeof main.client_created_at === 'string' ? main.client_created_at : '' }])[0] ?? null;
}

/* ------------------------------------------------------------------------------------------------ talking to it */
// The slice of the Supabase client used here, so tests can stand in for it.
export interface ClientLike {
  from(table: string): any; // eslint-disable-line @typescript-eslint/no-explicit-any
}
type DbError = { code?: string; message: string; status?: number } | null;

const PAGE = 1000;

function classify(error: NonNullable<DbError>): 'deleted' | 'rejected' | 'transient' {
  const code = error.code ?? '';
  if (code === '23503') return 'deleted'; // the loan it belongs to is gone
  if (code.startsWith('23') || code.startsWith('22') || code === '42501') return 'rejected';
  return 'transient'; // no network, a server error, an expired session: try again later
}

export function supabaseRemote(client: ClientLike, deviceId: string, now: () => string = () => new Date().toISOString()): RemoteApi {
  const fail = (error: NonNullable<DbError>): never => {
    throw new Error(error.message);
  };

  async function readAll(table: string, userId: string): Promise<Row[]> {
    const out: Row[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await client.from(table).select('*').eq('user_id', userId).is('deleted_at', null).order('id', { ascending: true }).range(from, from + PAGE - 1);
      if (error) fail(error);
      out.push(...(data ?? []));
      if ((data ?? []).length < PAGE) return out;
    }
  }

  async function readDetails(userId: string): Promise<Row[]> {
    const out: Row[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await client.from(DETAILS_TABLE).select('*').eq('user_id', userId).is('deleted_at', null).order('loan_id', { ascending: true }).range(from, from + PAGE - 1);
      if (error) fail(error);
      out.push(...(data ?? []));
      if ((data ?? []).length < PAGE) return out;
    }
  }

  async function readOne(entity: EntityName, userId: string, key: string): Promise<Row | null> {
    const { data, error } = await client.from(TABLE[entity]).select('*').eq('user_id', userId).eq('id', key).maybeSingle();
    if (error) fail(error);
    return (data as Row | null) ?? null;
  }

  async function readDetail(userId: string, loanId: string): Promise<Row | null> {
    const { data, error } = await client.from(DETAILS_TABLE).select('*').eq('user_id', userId).eq('loan_id', loanId).maybeSingle();
    if (error) fail(error);
    return (data as Row | null) ?? null;
  }

  // What a loan paid for is written after the loan itself. It belongs to the loan, so the loan's own revision settles any
  // clash; this row just takes whatever the person last saved.
  async function writeDetails(userId: string, loan: Loan): Promise<ApplyResult | null> {
    const { details } = toRows(userId, 'loan', loan);
    if (!details) {
      const { error } = await client.from(DETAILS_TABLE).update({ deleted_at: now(), deleted_by: deviceId }).eq('user_id', userId).eq('loan_id', loan.id).is('deleted_at', null);
      if (error) return outcome(error);
      return null;
    }
    const { error } = await client.from(DETAILS_TABLE).upsert(details, { onConflict: 'user_id,loan_id' });
    return error ? outcome(error) : null;
  }

  function outcome(error: NonNullable<DbError>): ApplyResult {
    const kind = classify(error);
    if (kind === 'transient') throw new Error(error.message);
    if (kind === 'deleted') return { ok: false, kind: 'conflict', reason: 'deleted' };
    return { ok: false, kind: 'rejected', message: error.message };
  }

  const revisionOf = (row: Row) => Number(row.revision);

  return {
    async fetch(userId) {
      const snap = emptySnapshot();
      const [loanRows, detailRows] = await Promise.all([readAll(TABLE.loan, userId), readDetails(userId)]);
      const detailByLoan = new Map(detailRows.map((d) => [String(d.loan_id), d]));
      for (const row of loanRows) {
        const value = fromRows('loan', row, detailByLoan.get(String(row.id)) ?? null);
        if (value) snap.loan[String(row.id)] = { value, revision: revisionOf(row) };
      }
      for (const entity of ['link', 'payment', 'adjustment', 'role'] as const) {
        for (const row of await readAll(TABLE[entity], userId)) {
          const value = fromRows(entity, row, null);
          // A row whose loan is gone is not shown, whatever state it was left in.
          if (value && snap.loan[String(row.loan_id)]) snap[entity][String(row.id)] = { value, revision: revisionOf(row) };
        }
      }
      return snap;
    },

    async apply(userId, op) {
      const { entity, key } = op;
      const table = TABLE[entity];

      if (op.kind === 'remove') {
        // Deleting wins over any edit, so no revision is checked. Deleting what is already gone is fine.
        const { error } = await client.from(table).update({ deleted_at: now(), deleted_by: deviceId }).eq('user_id', userId).eq('id', key).is('deleted_at', null);
        if (error) return outcome(error);
        return { ok: true, revision: 0 };
      }

      const { main } = toRows(userId, entity, op.record);
      const isLoan = entity === 'loan';
      const same = (row: Row) => {
        const v = fromRows(entity, row, null);
        return v !== null && (isLoan ? sameLoanTerms(v, op.record) : sameRecord(entity, v, op.record));
      };
      const finish = async (revision: number): Promise<ApplyResult> => {
        if (isLoan) {
          const failed = await writeDetails(userId, op.record as Loan);
          if (failed) return failed;
        }
        return { ok: true, revision };
      };

      // A record made here: add it. If it is already there, this may be the same write arriving a second time.
      if (op.baseRevision === null) {
        const { data, error } = await client.from(table).upsert(main, { onConflict: 'user_id,id', ignoreDuplicates: true }).select();
        if (error) return outcome(error);
        if ((data ?? []).length) return finish(revisionOf(data[0]));
        const current = await readOne(entity, userId, key);
        if (!current) throw new Error('The record could not be added. It will be tried again.');
        if (!current.deleted_at) return same(current) ? finish(revisionOf(current)) : { ok: false, kind: 'conflict', reason: 'changed', remote: remoteOf(entity, current) };
        // Deleted. If this device did the deleting, it is adding the record back; if another did, it stays deleted.
        if (current.deleted_by !== deviceId) return { ok: false, kind: 'conflict', reason: 'deleted' };
        const revived = await client.from(table).update({ ...main }).eq('user_id', userId).eq('id', key).eq('revision', current.revision).not('deleted_at', 'is', null).select();
        if (revived.error) return outcome(revived.error);
        return revived.data?.length ? finish(revisionOf(revived.data[0])) : { ok: false, kind: 'conflict', reason: 'changed' };
      }

      // A change to a record read at some revision: only if nobody has changed it since.
      const { data, error } = await client.from(table).update({ ...main }).eq('user_id', userId).eq('id', key).eq('revision', op.baseRevision).is('deleted_at', null).select();
      if (error) return outcome(error);
      if ((data ?? []).length) return finish(revisionOf(data[0]));
      const current = await readOne(entity, userId, key);
      if (!current || current.deleted_at) return { ok: false, kind: 'conflict', reason: 'deleted' };
      if (same(current)) return finish(revisionOf(current)); // already written, and the reply was lost
      return { ok: false, kind: 'conflict', reason: 'changed', remote: remoteOf(entity, current) };

      function remoteOf(e: EntityName, row: Row): Versioned | undefined {
        const value = fromRows(e, row, null);
        return value ? { value, revision: revisionOf(row) } : undefined;
      }
    },
  };
}
