import { useMemo } from 'react';
import { upcomingPayments } from '../../lib/overview';
import { useRecurring } from '../../lib/recurringOverrides';
import type { Load } from '../../lib/useTransactions';

// One payment on one day: either one that was made, or one Wallex expects.
export interface CalEvent {
  id: string;
  name: string;
  logos: string[];
  amount: number;
  date: string; // YYYY-MM-DD
  paid: boolean;
  approx: boolean;
}

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
// made, and the ones coming up.
export function useCalendarEvents(load: Load): { events: CalEvent[]; sample: boolean } {
  const live = load.state === 'live';
  const analysis = useRecurring(live ? load.allTransactions : null, live ? load.allAccounts : undefined);

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

    const events: CalEvent[] = [];
    const seen = new Set<string>();
    for (const r of analysis.items) {
      if (!['confirmed', 'likely', 'new'].includes(r.confidence) || r.kind === 'habit' || r.kind === 'aggregator') continue;
      for (const c of r.charges) {
        if (c.amount >= 0) continue;
        const key = `${r.name}-${c.date}`;
        if (seen.has(key)) continue;
        seen.add(key);
        events.push({ id: c.id, name: r.name, logos: r.logos, amount: -c.amount, date: c.date, paid: true, approx: false });
      }
    }
    for (const p of upcomingPayments(analysis, today, 150)) {
      const key = `${p.name}-${p.date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push({ id: p.id, name: p.name, logos: p.logos, amount: p.amount, date: p.date, paid: false, approx: p.amountApprox });
    }
    return { events, sample: false };
  }, [live, analysis]);
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
