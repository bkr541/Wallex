import { emptySnapshot, keyOf, labelOf, sameRecord, type EntityName, type Snapshot } from './loanCloud.ts';
import { LINKS_KEY, normalizeLinks, type InstallmentLink } from './loanLinks.ts';
import { normalizeAdjustments, normalizePayments, PAYMENTS_KEY, type LoanAdjustment, type ManualPayment } from './loanPayments.ts';
import { normalizeRoles, ROLES_KEY, type LoanRole } from './loanRoles.ts';
import { LEGACY_LOANS_KEY, normalizeLoans, type Loan } from './loans.ts';
import type { KeyValue, SyncEngine } from './loanSyncEngine.ts';

// Loans saved on this device before accounts existed.
//
// They were kept under one key, shared by whoever used the device, so nothing says whose they are. They are therefore never
// loaded as anyone's loans. When someone is signed in, they can choose to add them to their account, and only then are
// they copied there. The copy keeps every id and value, never overwrites a record the account already has, can be repeated
// without making duplicates, and the device's copy is not touched until the account has been read back and shown to hold
// everything. Even then it is moved to a backup key, not deleted.

export const LEGACY_KEYS = [LEGACY_LOANS_KEY, LINKS_KEY, PAYMENTS_KEY, ROLES_KEY];
export const backupKey = (userId: string) => `wallex-legacy-loans-backup:${userId}`;

export interface LegacyData {
  loans: Loan[];
  links: InstallmentLink[];
  payments: ManualPayment[];
  adjustments: LoanAdjustment[];
  roles: LoanRole[];
  raw: Record<string, string>; // exactly what was on the device
}

const parse = (raw: string | null): unknown => {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// What the device holds, or null if there are no loans in it. Anything attached to a loan that is not there is ignored.
export function readLegacy(storage: KeyValue): LegacyData | null {
  const raw: Record<string, string> = {};
  for (const k of LEGACY_KEYS) {
    const v = storage.get(k);
    if (v !== null) raw[k] = v;
  }
  const loans = normalizeLoans(parse(raw[LEGACY_LOANS_KEY] ?? null));
  if (!loans.length) return null;
  const ids = new Set(loans.map((l) => l.id));
  const paymentData = parse(raw[PAYMENTS_KEY] ?? null) as { payments?: unknown; adjustments?: unknown } | null;
  return {
    loans,
    links: normalizeLinks(parse(raw[LINKS_KEY] ?? null)).filter((l) => ids.has(l.loanId)),
    payments: normalizePayments(paymentData?.payments).filter((p) => ids.has(p.loanId)),
    adjustments: normalizeAdjustments(paymentData?.adjustments).filter((a) => ids.has(a.loanId)),
    roles: normalizeRoles(parse(raw[ROLES_KEY] ?? null)).filter((r) => ids.has(r.loanId)),
    raw,
  };
}

export const countLegacy = (d: LegacyData) => d.loans.length + d.links.length + d.payments.length + d.adjustments.length + d.roles.length;

export interface ImportPlan {
  add: Record<EntityName, unknown[]>; // what the account does not have
  already: number; // the account already has these, identical
  differs: { entity: EntityName; key: string; label: string }[]; // the account has a different record under the same id: left as it is
}

export function planImport(legacy: LegacyData, account: Snapshot): ImportPlan {
  const plan: ImportPlan = { add: { loan: [], link: [], payment: [], adjustment: [], role: [] }, already: 0, differs: [] };
  const groups: [EntityName, unknown[]][] = [['loan', legacy.loans], ['link', legacy.links], ['payment', legacy.payments], ['adjustment', legacy.adjustments], ['role', legacy.roles]];
  for (const [entity, records] of groups) {
    for (const r of records) {
      const key = keyOf(entity, r);
      const there = account[entity][key];
      if (!there) plan.add[entity].push(r);
      else if (sameRecord(entity, there.value, r)) plan.already += 1;
      else plan.differs.push({ entity, key, label: labelOf(entity, r, account.loan) });
    }
  }
  return plan;
}

export type ImportOutcome =
  | { status: 'none' }
  | { status: 'not-ready' }
  | { status: 'failed'; error: string }
  | { status: 'incomplete'; missing: number; plan: ImportPlan } // some are still waiting to be saved; the device's copy is untouched
  | { status: 'done'; imported: number; plan: ImportPlan };

// Adds the device's loans to the account that is signed in, then checks the account holds them before touching the device's copy.
export async function importLegacy(engine: SyncEngine, storage: KeyValue, now: () => Date = () => new Date()): Promise<ImportOutcome> {
  const userId = engine.owner();
  if (!userId || !engine.ready()) return { status: 'not-ready' };
  const legacy = readLegacy(storage);
  if (!legacy) return { status: 'none' };

  let account: Snapshot | null;
  try {
    account = await engine.fetchNow();
  } catch (e) {
    return { status: 'failed', error: e instanceof Error ? e.message : 'Could not reach your account.' };
  }
  if (!account || engine.owner() !== userId) return { status: 'not-ready' };

  const plan = planImport(legacy, account);
  for (const entity of ['loan', 'link', 'payment', 'adjustment', 'role'] as EntityName[]) engine.add(entity, plan.add[entity]);
  await engine.flush();
  if (engine.owner() !== userId) return { status: 'not-ready' };

  // Read the account back and check every record that was to be added is there, as it was.
  let check: Snapshot | null;
  try {
    check = await engine.fetchNow();
  } catch (e) {
    return { status: 'failed', error: e instanceof Error ? e.message : 'Could not reach your account.' };
  }
  const have = check ?? emptySnapshot();
  let missing = 0;
  for (const entity of ['loan', 'link', 'payment', 'adjustment', 'role'] as EntityName[]) {
    for (const r of plan.add[entity]) {
      const there = have[entity][keyOf(entity, r)];
      if (!there || !sameRecord(entity, there.value, r)) missing += 1;
    }
  }
  if (missing > 0) return { status: 'incomplete', missing, plan };

  // The account has it all. The device's copy moves to a backup first; only when that is confirmed is the original removed.
  try {
    const body = JSON.stringify({ savedAt: now().toISOString(), for: userId, raw: legacy.raw });
    storage.set(backupKey(userId), body);
    if (storage.get(backupKey(userId)) !== body) return { status: 'failed', error: 'This device could not keep a backup, so nothing was removed.' };
    for (const k of LEGACY_KEYS) storage.remove(k);
  } catch {
    return { status: 'failed', error: 'This device could not keep a backup, so nothing was removed.' };
  }
  return { status: 'done', imported: Object.values(plan.add).reduce((n, list) => n + list.length, 0), plan };
}
