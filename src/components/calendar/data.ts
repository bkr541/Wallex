import { useMemo } from 'react';
import { obligationsBetween, type LoanObligationData } from '../../lib/obligations';
import { isoFromEpochDay, epochDay } from '../../lib/patterns';
import type { Analysis } from '../../lib/recurring';
import { useRecurring } from '../../lib/recurringOverrides';
import { STATUS_LABEL, type InstallmentStatus } from '../../lib/repayment';
import type { Load } from '../../lib/useTransactions';
import { useLoanObligationData } from '../../lib/useLoanObligations';

// One payment on one day: either one that was made, or one Wallex expects.
export interface CalEvent {
  id: string;
  name: string;
  logos: string[];
  amount: number;
  date: string; // YYYY-MM-DD
  paid: boolean;
  approx: boolean;
  // Set for an installment of a pay-later loan: a scheduled payment with its own status, as against a bank transaction.
  bnpl?: { loanId: string; installment: number; count: number; status: InstallmentStatus; paid: number; remaining: number; transactionIds: string[]; overlap: boolean };
  counted?: boolean; // false when the amount is not money known to be owed (canceled, waived, or not known either way)
}

// The small label on an event: Paid or Due for a payment, and for a loan installment what its payments say.
export const eventBadge = (e: CalEvent) => (e.bnpl ? STATUS_LABEL[e.bnpl.status] : e.paid ? 'Paid' : 'Due');
export const eventAmount = (e: CalEvent) => (e.counted === false ? 0 : e.amount);

const pad = (n: number) => String(n).padStart(2, '0');
export const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
export const todayIso = () => {
  const d = new Date();
  return isoOf(d.getFullYear(), d.getMonth(), d.getDate());
};

// Stand-ins shown until a bank is connected: a few single days, a pair and a busy day.
const SAMPLE = [
  { name: 'Rent', day: 1, amount: 1250 },
  { name: 'Spotify', day: 5, amount: 11.99 },
  { name: 'Netflix', day: 5, amount: 15.49 },
  { name: 'Verizon', day: 12, amount: 34 },
  { name: 'Chase Loan', day: 15, amount: 500 },
  { name: 'Georgia Power', day: 15, amount: 92 },
  { name: 'Planet Fitness', day: 15, amount: 24.99 },
  { name: 'iCloud', day: 21, amount: 2.99 },
  { name: 'Comcast', day: 24, amount: 79.99 },
  { name: 'Amazon Prime', day: 24, amount: 14.99 },
];

// Every recurring payment the Recurring tab knows about, in the months around today: the charges that were
// made, and the ones coming up. Installments of pay-later loans from the Loans page are included, each with its own
// status, and the recurring predictions they replace are not shown twice.
export function buildCalendarEvents(analysis: Analysis, today: string, loanData: LoanObligationData | null): CalEvent[] {
  const events: CalEvent[] = [];
  const seen = new Set<string>();
  // Charges confirmed as paying an installment are shown by the installment, not once more as a bank charge.
  const linked = new Set((loanData?.links ?? []).filter((l) => l.status === 'linked').flatMap((l) => [l.txnId, ...(l.previousTxnIds ?? [])]));
  for (const r of analysis.items) {
    if (!['confirmed', 'likely', 'new'].includes(r.confidence) || r.kind === 'habit' || r.kind === 'aggregator') continue;
    for (const c of r.charges) {
      if (c.amount >= 0 || linked.has(c.id)) continue;
      const key = `${r.name}-${c.date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push({ id: c.id, name: r.name, logos: r.logos, amount: -c.amount, date: c.date, paid: true, approx: false });
    }
  }
  const { obligations } = obligationsBetween({ today, from: isoFromEpochDay(epochDay(today) - 400), to: isoFromEpochDay(epochDay(today) + 150), analysis, loanData });
  for (const o of obligations) {
    if (o.source === 'recurring') {
      const key = `${o.name}-${o.date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push({ id: o.payment!.id, name: o.name, logos: o.logos, amount: o.expected, date: o.date, paid: false, approx: o.estimated });
      continue;
    }
    const settled = o.status === 'paidBank' || o.status === 'paidManual';
    events.push({
      id: o.id,
      name: `${o.name} · ${o.installment} of ${o.count}`,
      logos: o.logos,
      amount: o.remaining > 0 ? o.remaining : o.paid > 0 ? o.paid : o.expected,
      date: o.date,
      paid: settled,
      approx: false,
      counted: settled || o.remaining > 0 && o.status !== 'unverified',
      bnpl: { loanId: o.loanId!, installment: o.installment!, count: o.count ?? 0, status: o.status as InstallmentStatus, paid: o.paid, remaining: o.remaining, transactionIds: o.transactionIds, overlap: !!o.overlap },
    });
  }
  return events;
}

export function useCalendarEvents(load: Load): { events: CalEvent[]; sample: boolean } {
  const live = load.state === 'live';
  const analysis = useRecurring(live ? load.allTransactions : null, live ? load.allAccounts : undefined);
  const loanData = useLoanObligationData(load);

  return useMemo(() => {
    const today = todayIso();
    if (!live || !analysis) {
      const now = new Date();
      const events: CalEvent[] = [];
      for (const off of [-1, 0, 1]) {
        const d = new Date(now.getFullYear(), now.getMonth() + off, 1);
        const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        for (const s of SAMPLE) {
          const date = isoOf(d.getFullYear(), d.getMonth(), Math.min(s.day, last));
          events.push({ id: `${s.name}-${date}`, name: s.name, logos: [], amount: s.amount, date, paid: date <= today, approx: false });
        }
      }
      return { events, sample: true };
    }
    return { events: buildCalendarEvents(analysis, today, loanData), sample: false };
  }, [live, analysis, loanData]);
}

export function byDate(events: CalEvent[]): Record<string, CalEvent[]> {
  const out: Record<string, CalEvent[]> = {};
  for (const e of events) (out[e.date] ??= []).push(e);
  for (const k of Object.keys(out)) out[k].sort((a, b) => b.amount - a.amount);
  return out;
}

export interface Cell {
  iso: string;
  day: number;
  inMonth: boolean;
}

// The weeks of a month, Sunday first, padded with the neighbouring months' days.
export function monthCells(year: number, month: number): Cell[] {
  const lead = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((lead + days) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(year, month, 1 - lead + i);
    return { iso: isoOf(d.getFullYear(), d.getMonth(), d.getDate()), day: d.getDate(), inMonth: d.getMonth() === month };
  });
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
