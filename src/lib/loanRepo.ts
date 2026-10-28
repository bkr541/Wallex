import type { EntityName } from './loanCloud';

// The stores for loans and what hangs off them (loans.ts, loanLinks.ts, loanPayments.ts, loanRoles.ts) keep their records
// in memory and hand every change to a "sink". While someone is signed in, the sink is the sync engine (loanSync.ts), which
// owns saving to the account and to the offline queue. With nobody signed in there is no sink: a change goes nowhere,
// because records belong to an account and a signed-out device has none to give them to.

type Sink = (entity: EntityName, next: unknown[]) => void;
let sink: Sink | null = null;

export const setLoanSink = (next: Sink | null) => {
  sink = next;
};

// A repository that starts empty and writes through the sink.
export const syncedRepository = <T,>(entity: EntityName) => ({
  load: (): T[] => [],
  save: (next: T[]) => sink?.(entity, next),
});
