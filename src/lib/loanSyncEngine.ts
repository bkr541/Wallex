import { ENTITIES, emptySnapshot, keyOf, labelOf, sameLoanTerms, sameRecord, stable, type EntityName, type Op, type RemoteApi, type Snapshot, type Versioned } from './loanCloud.ts';

// Keeps one signed-in person's loans, and everything attached to them, the same on the account and on this device.
//
// The account is the record. This device holds three things for the person who is signed in, under a key that names them:
// the last copy it read (so loans can be shown with no network), and the changes made here that the account has not
// accepted yet (so they survive a restart), and changes the account turned down (so they are not silently lost).
// Nothing from one person is ever read for another.
//
// The rules, in short:
//   * A change is queued first, then sent. Sending is idempotent, so a retry after a lost reply does no harm.
//   * A change is applied to the account only if the record there is still the one it was made on top of. If someone
//     (another device) changed it meanwhile, the account's copy wins, and the change is set aside and shown to the person,
//     who can apply it again on top of the newer copy.
//   * A delete always wins over an edit, and leaves a tombstone, so nothing a device does later can bring it back.
//   * Failed sends are retried with a growing pause, and again when the network returns. They are never dropped.
// Plain logic with everything it needs handed in, so it can be tested without a network or a screen.

export interface KeyValue {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export interface Conflict {
  id: string;
  entity: EntityName;
  key: string;
  label: string; // "the Klarna loan"
  mine: unknown | null; // what the person had changed it to; null for a delete
  reason: 'changed-elsewhere' | 'deleted-elsewhere' | 'rejected';
  message?: string; // for "rejected": what the database said
  at: number;
}

export type Phase = 'signed-out' | 'loading' | 'ready' | 'offline';

export interface SyncStatus {
  owner: string | null;
  phase: Phase; // loading: first read from the account; offline: the account could not be reached
  busy: boolean; // sending or reading right now
  pending: number; // changes made here that the account does not have yet
  conflicts: Conflict[];
  error: string | null;
  deviceCopyFailed: boolean; // this device could not keep its own copy, so changes would be lost on a restart
}

export type View = Record<EntityName, unknown[]>;

export interface EngineDeps {
  remote: RemoteApi;
  storage: KeyValue;
  show: (view: View) => void; // put the records on screen: hydrates the stores
  claim?: (sink: ((entity: EntityName, next: unknown[]) => void) | null) => void; // where the stores send changes
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => () => void;
  newId?: () => string;
}

interface Session {
  userId: string;
  base: Snapshot; // the account's records as last read
  pending: Op[];
  conflicts: Conflict[];
  phase: Phase;
  busy: boolean;
  error: string | null;
  deviceCopyFailed: boolean;
  flushing: Promise<void> | null;
  lock: Promise<unknown>; // reading and sending take turns
  cancelRetry: (() => void) | null;
  failures: number; // in a row, for the pause before the next try
  loaded: boolean; // the account has been read at least once in this session
}

export const SYNC_KEY = (userId: string) => `wallex-loan-sync:${userId}`;
const BLOB_VERSION = 1;
const RANK: Record<string, number> = { 'put:loan': 0, 'put:link': 1, 'put:payment': 1, 'put:adjustment': 1, 'put:role': 1 };
const rank = (op: Op) => (op.kind === 'remove' ? 2 : RANK[`put:${op.entity}`]);

export const EMPTY_VIEW = (): View => ({ loan: [], link: [], payment: [], adjustment: [], role: [] });

export function createSyncEngine(deps: EngineDeps) {
  const now = deps.now ?? (() => Date.now());
  const setTimer = deps.setTimer ?? ((fn, ms) => { const t = setTimeout(fn, ms); return () => clearTimeout(t); });
  const newId = deps.newId ?? (() => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `op-${now().toString(36)}${Math.random().toString(36).slice(2, 8)}`));

  let session: Session | null = null;
  const listeners = new Set<() => void>();
  let cached: SyncStatus | null = null;

  const status = (): SyncStatus => {
    if (cached) return cached;
    cached = session
      ? { owner: session.userId, phase: session.phase, busy: session.busy, pending: session.pending.length, conflicts: session.conflicts, error: session.error, deviceCopyFailed: session.deviceCopyFailed }
      : { owner: null, phase: 'signed-out', busy: false, pending: 0, conflicts: [], error: null, deviceCopyFailed: false };
    return cached;
  };
  const notify = () => {
    cached = null;
    listeners.forEach((l) => l());
  };

  /* ------------------------------------------------------------------------------------------- this device's copy */
  function persist(s: Session, withBase = true) {
    try {
      deps.storage.set(SYNC_KEY(s.userId), JSON.stringify({ v: BLOB_VERSION, owner: s.userId, base: withBase ? s.base : undefined, pending: s.pending, conflicts: s.conflicts }));
      s.deviceCopyFailed = false;
    } catch {
      s.deviceCopyFailed = true;
    }
  }

  function readBlob(userId: string): { base: Snapshot; pending: Op[]; conflicts: Conflict[] } {
    const empty = { base: emptySnapshot(), pending: [] as Op[], conflicts: [] as Conflict[] };
    try {
      const raw = deps.storage.get(SYNC_KEY(userId));
      if (!raw) return empty;
      const blob = JSON.parse(raw);
      if (!blob || blob.v !== BLOB_VERSION || blob.owner !== userId) return empty; // never another person's
      const base = emptySnapshot();
      for (const e of ENTITIES) if (blob.base?.[e] && typeof blob.base[e] === 'object') base[e] = blob.base[e];
      const pending = Array.isArray(blob.pending) ? blob.pending.filter((o: Op) => o && ENTITIES.includes(o.entity) && typeof o.key === 'string' && (o.kind === 'put' || o.kind === 'remove')) : [];
      return { base, pending, conflicts: Array.isArray(blob.conflicts) ? blob.conflicts : [] };
    } catch {
      return empty;
    }
  }

  /* ------------------------------------------------------------------------------------------------ what is shown */
  // The account's records with the changes not yet accepted laid over them: what the person should see.
  function viewOf(s: Session): View {
    const maps = Object.fromEntries(ENTITIES.map((e) => [e, new Map(Object.entries(s.base[e]).map(([k, v]) => [k, v.value]))])) as Record<EntityName, Map<string, unknown>>;
    for (const op of s.pending) {
      if (op.kind === 'put') maps[op.entity].set(op.key, op.record);
      else maps[op.entity].delete(op.key);
    }
    const out = EMPTY_VIEW();
    const liveLoans = new Set(maps.loan.keys());
    for (const e of ENTITIES) {
      for (const [, record] of maps[e]) {
        // A record whose loan is gone is not shown.
        if (e !== 'loan' && !liveLoans.has((record as { loanId: string }).loanId)) continue;
        out[e].push(record);
      }
    }
    return out;
  }

  const publish = () => {
    if (session) deps.show(viewOf(session));
  };

  /* ----------------------------------------------------------------------------------------------- queueing changes */
  function enqueue(s: Session, entity: EntityName, key: string, kind: 'put' | 'remove', record?: unknown) {
    const baseRevision = s.base[entity][key]?.revision ?? null;
    const at = s.pending.findIndex((o) => o.entity === entity && o.key === key);
    if (at < 0) {
      s.pending.push({ id: newId(), entity, kind, key, record, baseRevision, queuedAt: now(), attempts: 0 });
      return;
    }
    const before = s.pending[at];
    if (kind === 'put') {
      // Edits stack on the same starting point. A put after a pending delete is an edit of what is on the account.
      s.pending[at] = { ...before, kind: 'put', record, baseRevision, attempts: 0 };
    } else if (before.kind === 'put' && before.baseRevision === null) {
      s.pending.splice(at, 1); // made here and deleted here before the account ever saw it: nothing to send
    } else {
      s.pending[at] = { ...before, kind: 'remove', record: undefined, attempts: 0 };
    }
  }

  // The stores call this with a whole list whenever something in it changes. It works out what changed from what is shown.
  function save(entity: EntityName, next: unknown[]) {
    const s = session;
    if (!s) return;
    const shown = new Map<string, unknown>();
    for (const r of viewOf(s)[entity]) shown.set(keyOf(entity, r), r);
    // A payment or link whose loan is not there (just deleted) is not a change to keep.
    const liveLoans = new Set(viewOf(s).loan.map((l) => keyOf('loan', l)));
    const incoming = new Map(next.filter((r) => entity === 'loan' || liveLoans.has((r as { loanId: string }).loanId)).map((r) => [keyOf(entity, r), r]));
    let changed = false;
    for (const [key, record] of incoming) {
      const had = shown.get(key);
      if (had !== undefined && stable(had) === stable(record)) continue;
      enqueue(s, entity, key, 'put', record);
      changed = true;
    }
    for (const key of shown.keys()) {
      if (incoming.has(key)) continue;
      enqueue(s, entity, key, 'remove');
      changed = true;
    }
    if (!changed) return;
    persist(s);
    notify();
    flushSoon();
  }

  /* ---------------------------------------------------------------------------------------------------- conflicts */
  function setAside(s: Session, op: Op, reason: Conflict['reason'], message?: string) {
    s.conflicts.push({
      id: `${op.entity}:${op.key}:${now()}`,
      entity: op.entity,
      key: op.key,
      label: labelOf(op.entity, op.record ?? s.base[op.entity][op.key]?.value ?? {}, s.base.loan),
      mine: op.kind === 'put' ? op.record : null,
      reason,
      message,
      at: now(),
    });
  }

  // Reading the account again: its copy becomes the base, and each queued change is checked against it.
  function merge(s: Session, snapshot: Snapshot) {
    const kept: Op[] = [];
    const gone = new Set<string>(); // loans the account no longer has
    for (const op of s.pending) {
      const there: Versioned | undefined = snapshot[op.entity][op.key];
      if (op.kind === 'remove') {
        if (there) kept.push(op); // still there: delete it
        continue; // already gone
      }
      const identical = !!there && sameRecord(op.entity, there.value, op.record);
      // A loan whose terms match but whose purchase details differ still has something to write.
      const sameTerms = !!there && op.entity === 'loan' && sameLoanTerms(there.value, op.record);
      if (op.baseRevision === null) {
        if (!there) kept.push(op); // not on the account yet: send it
        else if (identical) continue; // already there
        else if (sameTerms) kept.push({ ...op, baseRevision: there.revision });
        else setAside(s, op, 'changed-elsewhere');
        continue;
      }
      if (!there) {
        setAside(s, op, 'deleted-elsewhere');
        if (op.entity === 'loan') gone.add(op.key);
      } else if (identical) continue;
      else if (there.revision === op.baseRevision) kept.push(op);
      else if (sameTerms) kept.push({ ...op, baseRevision: there.revision });
      else setAside(s, op, 'changed-elsewhere');
    }
    // A loan the account no longer has takes its queued payments with it: they have nothing to belong to.
    s.pending = kept.filter((o) => o.entity === 'loan' || !gone.has((o.record as { loanId?: string } | undefined)?.loanId ?? ''));
    s.base = snapshot;
  }

  /* --------------------------------------------------------------------------------------------- reading and sending */
  // Reading and sending take turns, so a read never lands in the middle of a send.
  function serial<T>(s: Session, task: () => Promise<T>): Promise<T> {
    const run = s.lock.then(task, task);
    s.lock = run.catch(() => undefined);
    return run;
  }

  function retryLater(s: Session) {
    s.cancelRetry?.();
    s.failures += 1;
    const delay = Math.min(60_000, 2_000 * 2 ** Math.min(s.failures - 1, 5));
    s.cancelRetry = setTimer(() => {
      if (session !== s) return;
      s.cancelRetry = null;
      void (s.loaded ? flush() : start(s.userId));
    }, delay);
  }

  async function readAccount(s: Session): Promise<boolean> {
    return serial(s, async () => {
      s.busy = true;
      notify();
      try {
        const snapshot = await deps.remote.fetch(s.userId);
        if (session !== s) return false;
        merge(s, snapshot);
        s.loaded = true;
        s.phase = 'ready';
        s.error = null;
        s.failures = 0;
        persist(s);
        publish();
        return true;
      } catch (e) {
        if (session !== s) return false;
        s.phase = 'offline';
        s.error = e instanceof Error ? e.message : 'Could not reach your account.';
        retryLater(s);
        return false;
      } finally {
        if (session === s) {
          s.busy = false;
          notify();
        }
      }
    });
  }

  let soon: (() => void) | null = null;
  function flushSoon() {
    if (soon || !session) return;
    soon = setTimer(() => {
      soon = null;
      void flush();
    }, 150);
  }

  function nextOp(s: Session): Op | undefined {
    return [...s.pending].sort((a, b) => rank(a) - rank(b) || a.queuedAt - b.queuedAt)[0];
  }

  function flush(): Promise<void> {
    const s = session;
    if (!s) return Promise.resolve();
    if (s.flushing) return s.flushing;
    const run = serial(s, () => send(s)).finally(() => {
      if (s.flushing === run) s.flushing = null;
    });
    s.flushing = run;
    return run;
  }

  async function send(s: Session): Promise<void> {
    s.busy = true;
    notify();
    try {
      for (;;) {
        if (session !== s) return;
        const op = nextOp(s);
        if (!op) break;
        let result;
        try {
          result = await deps.remote.apply(s.userId, op);
        } catch (e) {
          if (session !== s) return;
          op.attempts += 1;
          s.phase = 'offline';
          s.error = e instanceof Error ? e.message : 'Could not reach your account.';
          persist(s);
          retryLater(s);
          return;
        }
        if (session !== s) return;
        s.pending = s.pending.filter((o) => o.id !== op.id);
        if (result.ok) {
          if (op.kind === 'put') s.base[op.entity][op.key] = { value: op.record, revision: result.revision };
          else delete s.base[op.entity][op.key];
        } else if (result.kind === 'conflict') {
          // The account's copy wins. What the person did is kept to one side, not thrown away.
          setAside(s, op, result.reason === 'deleted' ? 'deleted-elsewhere' : 'changed-elsewhere');
          if (result.reason === 'deleted') {
            delete s.base[op.entity][op.key];
            if (op.entity === 'loan') {
              s.pending = s.pending.filter((o) => o.entity === 'loan' || (o.record as { loanId?: string } | undefined)?.loanId !== op.key);
              for (const e of ENTITIES) if (e !== 'loan') for (const [k, v] of Object.entries(s.base[e])) if ((v.value as { loanId: string }).loanId === op.key) delete s.base[e][k];
            }
          } else if (result.remote) s.base[op.entity][op.key] = result.remote;
          publish();
        } else {
          setAside(s, op, 'rejected', result.message);
          publish();
        }
        persist(s);
        notify();
      }
      s.phase = 'ready';
      s.error = null;
      s.failures = 0;
      s.cancelRetry?.();
      s.cancelRetry = null;
      persist(s);
    } finally {
      s.busy = false;
      notify();
    }
  }

  /* ----------------------------------------------------------------------------------------------------- lifecycle */
  // Begin (or begin again) for the person who is signed in. Never throws: if the account cannot be read, what this device
  // holds for that person is shown and the rest is retried.
  async function start(userId: string): Promise<void> {
    if (session && session.userId !== userId) stop();
    let s = session;
    if (!s) {
      const blob = readBlob(userId);
      s = { userId, base: blob.base, pending: blob.pending, conflicts: blob.conflicts, phase: 'loading', busy: false, error: null, deviceCopyFailed: false, flushing: null, lock: Promise.resolve(), cancelRetry: null, failures: 0, loaded: false };
      session = s;
      deps.claim?.(save);
      publish();
      notify();
    } else {
      s.phase = s.loaded ? s.phase : 'loading';
    }
    const ok = await readAccount(s);
    if (session !== s) return;
    if (ok || s.pending.length) await flush();
  }

  // Nobody is signed in any more, or somebody else is. What was on screen goes at once. What this device kept for the person
  // stays, under their name, except the copy of the account's records, which is dropped so it is not left lying around.
  function stop() {
    const s = session;
    if (!s) return;
    s.cancelRetry?.();
    soon?.();
    soon = null;
    persist(s, false);
    session = null;
    deps.claim?.(null);
    deps.show(EMPTY_VIEW());
    notify();
  }

  async function refresh() {
    const s = session;
    if (!s || s.busy) return;
    if (await readAccount(s)) await flush();
  }

  /* ------------------------------------------------------------------------------------------ the person's choices */
  function resolve(conflictId: string, action: 'reapply' | 'restore' | 'dismiss') {
    const s = session;
    const c = s?.conflicts.find((x) => x.id === conflictId);
    if (!s || !c) return;
    s.conflicts = s.conflicts.filter((x) => x.id !== conflictId);
    if (action === 'reapply' && c.mine !== null && c.reason !== 'deleted-elsewhere') {
      // On top of whatever the account has now.
      enqueue(s, c.entity, c.key, 'put', c.mine);
    } else if (action === 'restore' && c.entity === 'loan' && c.mine) {
      const copy = { ...(c.mine as object), id: `loan-${now().toString(36)}${newId().slice(0, 4)}` };
      enqueue(s, 'loan', (copy as { id: string }).id, 'put', copy);
    }
    persist(s);
    publish();
    notify();
    flushSoon();
  }

  // Records to add in one go, for the import of loans saved before accounts: only those the account does not have.
  function add(entity: EntityName, records: unknown[]) {
    const s = session;
    if (!s) return;
    for (const r of records) {
      const key = keyOf(entity, r);
      if (s.base[entity][key] || s.pending.some((o) => o.entity === entity && o.key === key)) continue;
      enqueue(s, entity, key, 'put', r);
    }
    persist(s);
    publish();
    notify();
  }

  return {
    status,
    subscribe(cb: () => void) {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    start,
    stop,
    save,
    flush,
    refresh,
    resolve,
    add,
    owner: () => session?.userId ?? null,
    ready: () => !!session?.loaded,
    base: (): Snapshot | null => (session ? session.base : null),
    fetchNow: async (): Promise<Snapshot | null> => (session ? deps.remote.fetch(session.userId) : null),
    hasPending: (entity: EntityName, key: string) => !!session?.pending.some((o) => o.entity === entity && o.key === key),
  };
}

export type SyncEngine = ReturnType<typeof createSyncEngine>;
