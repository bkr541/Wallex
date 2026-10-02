import type { Bubble } from './patterns';
import type { PeriodChange } from './patternMetrics';

// Wording and number formatting for the Patterns detail view. No calculations live here.

export const money = (n: number) => {
  const abs = Math.abs(n);
  const text = abs < 100 && !Number.isInteger(abs) ? abs.toFixed(2) : Math.round(abs).toLocaleString('en-US');
  return `${n < 0 && Math.round(abs * 100) > 0 ? '-' : ''}$${text}`;
};

export const percentText = (share: number) => {
  const p = share * 100;
  return p > 0 && p < 1 ? '<1%' : p < 10 ? `${p.toFixed(1).replace(/\.0$/, '')}%` : `${Math.round(p)}%`;
};

// "last 30 days" when the period is full; "last 12 days of history" when it is not.
export const periodText = (days: number, effectiveDays: number, partial: boolean) =>
  partial ? `${effectiveDays} days of history` : `last ${days} days`;

const singular = (noun: Bubble['noun']) => noun.replace(/s$/, '').replace(/^visit$/, 'visit');

// How often it happens, in words a person would use. The input is charges per month.
export function frequencyText(perMonth: number, noun: Bubble['noun']): string {
  const plural = noun;
  if (perMonth < 0.8) {
    const weeks = Math.max(2, Math.round(30 / perMonth / 7));
    return `About one ${singular(noun)} every ${weeks} weeks`;
  }
  if (perMonth < 1.3) return `About one ${singular(noun)} / month`;
  if (perMonth < 3.5) return `About ${Math.round(perMonth)} ${plural} / month`;
  if (perMonth < 8.7) return `${perMonth.toFixed(1)} ${plural} / month`;
  const weekly = Math.round((perMonth * 7) / 30);
  return `About ${weekly}× / week`;
}

// "+$84" or "-$42", whole dollars once it is big enough to not need the cents.
const signed = (n: number) => `${n >= 0 ? '+' : '-'}${money(Math.abs(n))}`;

export interface ChangeText {
  headline: string;
  detail: string;
  direction: 'up' | 'down' | 'flat' | 'none';
}

export function changeText(change: PeriodChange, days: number): ChangeText {
  if (change.state === 'unavailable') {
    return { headline: 'Not enough prior history', detail: `to compare with the previous ${days} days`, direction: 'none' };
  }
  const vs = `vs previous ${days} days`;
  if (change.isNew) return { headline: `${money(change.current)} new`, detail: `nothing in the previous ${days} days`, direction: 'up' };

  const pct = change.pct ?? 0;
  // Under 5% or $5 is noise.
  if (Math.abs(pct) < 0.05 || Math.abs(change.delta) < 5) {
    return { headline: 'No meaningful change', detail: vs, direction: 'flat' };
  }
  const pctText = `${pct > 0 ? '+' : '-'}${Math.round(Math.abs(pct) * 100)}%`;
  return { headline: `${signed(change.delta)} · ${pctText}`, detail: vs, direction: change.delta > 0 ? 'up' : 'down' };
}
