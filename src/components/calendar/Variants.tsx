import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MerchantLogo from '../MerchantLogo';
import { money } from '../../lib/patternFormat';
import { MONTHS, WEEKDAYS, byDate, isoOf, monthCells, todayIso, type CalEvent } from './data';

const total = (list: CalEvent[]) => list.reduce((s, e) => s + e.amount, 0);
const ease = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------------------------------ the logo rule
   One payment on a day: its logo on its own. Two: two logos overlapping. More than two: the first logo,
   overlapped by a circle in the bottom-right that says how many more there are ("+2" for three payments). */
function Logo({ e, px, ring }: { e: CalEvent; px: number; ring?: string }) {
  return (
    <MerchantLogo
      name={e.name}
      sources={e.logos}
      className="bg-surface"
      style={{ width: px, height: px, fontSize: Math.max(8, px * 0.34), boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}
    />
  );
}

export function Cluster({ list, size, ring = 'var(--card)' }: { list: CalEvent[]; size: number; ring?: string }) {
  const n = list.length;
  if (n === 0) return null;
  if (n === 1) {
    return (
      <span className="inline-flex items-center justify-center" style={{ width: size, height: size }} title={list[0].name}>
        <Logo e={list[0]} px={size * 0.84} />
      </span>
    );
  }
  const px = size * 0.66;
  return (
    <span className="relative inline-block" style={{ width: size, height: size }} title={list.map((e) => e.name).join(', ')}>
      <span className="absolute top-0 left-0"><Logo e={list[0]} px={px} /></span>
      <span className="absolute right-0 bottom-0 flex rounded-full" style={{ boxShadow: `0 0 0 2px ${ring}` }}>
        {n === 2 ? (
          <Logo e={list[1]} px={px} />
        ) : (
          <span className="flex items-center justify-center rounded-full border border-line bg-surface font-semibold text-ink tabular-nums" style={{ width: px, height: px, fontSize: Math.max(8, px * 0.4) }}>
            +{n - 1}
          </span>
        )}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------------------------------ shared state */
export function useCal(events: CalEvent[]) {
  const t = todayIso();
  const [year, setYear] = useState(Number(t.slice(0, 4)));
  const [month, setMonth] = useState(Number(t.slice(5, 7)) - 1);
  const [sel, setSel] = useState<string | null>(null);
  const map = useMemo(() => byDate(events), [events]);
  const cells = useMemo(() => monthCells(year, month), [year, month]);
  const step = (d: number) => {
    const n = new Date(year, month + d, 1);
    setYear(n.getFullYear());
    setMonth(n.getMonth());
    setSel(null);
  };
  const monthEvents = cells.filter((c) => c.inMonth).flatMap((c) => map[c.iso] ?? []);
  return {
    year, month, map, cells, sel, setSel, today: t, monthEvents,
    label: MONTHS[month], step,
    goToday: () => { setYear(Number(t.slice(0, 4))); setMonth(Number(t.slice(5, 7)) - 1); setSel(t); },
    goTo: (iso: string) => { setYear(Number(iso.slice(0, 4))); setMonth(Number(iso.slice(5, 7)) - 1); setSel(iso); },
  };
}
type Cal = ReturnType<typeof useCal>;

export function NavButtons({ cal, className = '' }: { cal: Cal; className?: string }) {
  const b = 'flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border transition-colors';
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <button type="button" aria-label="Previous month" onClick={() => cal.step(-1)} className={`${b} border-line hover:border-muted`}><ChevronLeft className="h-4 w-4" /></button>
      <button type="button" aria-label="Next month" onClick={() => cal.step(1)} className={`${b} border-line hover:border-muted`}><ChevronRight className="h-4 w-4" /></button>
    </span>
  );
}

export function DayList({ iso, list, className = '' }: { iso: string; list: CalEvent[]; className?: string }) {
  const d = new Date(`${iso}T00:00:00`);
  return (
    <div className={className}>
      <p className="font-support text-sm text-muted">
        {WEEKDAYS[d.getDay()]}, {MONTHS[d.getMonth()]} {d.getDate()}
        {list.length > 0 && <> · <span className="text-ink">{money(total(list))}</span></>}
      </p>
      {list.length === 0 ? (
        <p className="mt-3 font-support text-sm text-muted">No recurring payments on this day.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {list.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2.5">
              <Logo e={e} px={32} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{e.name}</span>
              <span className={`rounded-full px-2 py-0.5 font-support text-[10px] font-semibold ${e.paid ? 'bg-accent-soft text-accent' : 'bg-surface text-muted'}`}>{e.paid ? 'Paid' : 'Due'}</span>
              <span className="w-20 text-right text-sm font-semibold tabular-nums">{e.approx ? '~' : ''}{money(e.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ 1 · Phone month
   Like the reference: a dark month with the logos standing in for the day numbers. */
export function PhoneMonth({ events }: { events: CalEvent[] }) {
  const cal = useCal(events);
  return (
    <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-[32px] border border-line" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--accent) 38%, var(--canvas)) 0%, var(--canvas) 38%)' }}>
      <div className="flex items-center justify-between gap-2 px-5 pt-6">
        <h4 className="text-3xl font-semibold tracking-tight">{cal.label}</h4>
        <span className="flex items-center gap-2">
          <button type="button" onClick={cal.goToday} className="cursor-pointer rounded-full border border-ink/30 bg-canvas/30 px-4 py-2 text-sm font-medium">Today</button>
          <NavButtons cal={cal} />
        </span>
      </div>
      <div className="mt-5 grid grid-cols-7 px-3 text-center font-support text-xs text-muted">
        {WEEKDAYS.map((d) => <span key={d} className="py-2">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1 px-3 pb-4">
        {cal.cells.map((c) => {
          const list = c.inMonth ? cal.map[c.iso] ?? [] : [];
          const on = cal.sel === c.iso;
          return (
            <button key={c.iso} type="button" disabled={!c.inMonth} onClick={() => cal.setSel(on ? null : c.iso)} className={`flex h-[58px] cursor-pointer items-center justify-center rounded-xl transition-colors disabled:cursor-default ${on ? 'ring-2 ring-sky-300' : ''}`}>
              {!c.inMonth ? null : list.length ? (
                <Cluster list={list} size={46} ring="var(--canvas)" />
              ) : (
                <span className={`text-lg tabular-nums ${c.iso === cal.today ? 'flex h-9 w-9 items-center justify-center rounded-full bg-ink text-canvas font-semibold' : 'text-ink/80'}`}>{c.day}</span>
              )}
            </button>
          );
        })}
      </div>
      {cal.sel && <DayList iso={cal.sel} list={cal.map[cal.sel] ?? []} className="border-t border-line bg-card/70 px-5 py-4" />}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ 2 · Full grid
   The desktop month: bordered cells with the date, the logos and what that day adds up to. */
export function FullGrid({ events }: { events: CalEvent[] }) {
  const cal = useCal(events);
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h4 className="text-2xl font-semibold tracking-tight">{cal.label} <span className="text-muted">{cal.year}</span></h4>
        <span className="flex items-center gap-3">
          <span className="font-support text-sm text-muted">{cal.monthEvents.length} payments · <span className="text-ink">{money(total(cal.monthEvents))}</span></span>
          <button type="button" onClick={cal.goToday} className="cursor-pointer rounded-lg border border-line px-3 py-1.5 text-sm hover:border-muted">Today</button>
          <NavButtons cal={cal} />
        </span>
      </div>
      <div className="grid grid-cols-7 border-b border-line bg-surface/50 text-center font-support text-xs font-semibold tracking-widest text-muted uppercase">
        {WEEKDAYS.map((d) => <span key={d} className="py-2">{d}</span>)}
      </div>
      <div className="grid grid-cols-7">
        {cal.cells.map((c, i) => {
          const list = cal.map[c.iso] ?? [];
          return (
            <div key={c.iso} className={`flex min-h-[96px] flex-col justify-between p-2 @3xl:min-h-[112px] ${i % 7 ? 'border-l' : ''} ${i >= 7 ? 'border-t' : ''} border-line ${c.inMonth ? '' : 'bg-canvas/40 opacity-40'}`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums ${c.iso === cal.today ? 'bg-accent font-bold text-canvas' : 'text-muted'}`}>{c.day}</span>
              <div className="flex items-end justify-between gap-1">
                <Cluster list={list} size={38} />
                {list.length > 0 && <span className="font-support text-[11px] font-semibold text-ink/80 tabular-nums">{money(total(list))}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ 3 · Day rings
   Round days with a ring that fills with how much is due, and a panel for the chosen day. */
export function DayRings({ events }: { events: CalEvent[] }) {
  const cal = useCal(events);
  const max = Math.max(1, ...cal.cells.map((c) => total(cal.map[c.iso] ?? [])));
  const sel = cal.sel ?? cal.today;
  return (
    <div className="grid gap-6 rounded-2xl border border-line bg-card/40 p-5 @3xl:grid-cols-[1.4fr_1fr] @3xl:p-6">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-xl font-semibold tracking-tight">{cal.label} {cal.year}</h4>
          <span className="flex items-center gap-2"><button type="button" onClick={cal.goToday} className="cursor-pointer text-sm text-accent hover:underline">Today</button><NavButtons cal={cal} /></span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {WEEKDAYS.map((d) => <span key={d} className="pb-1 font-support text-[11px] text-muted">{d[0]}</span>)}
          {cal.cells.map((c) => {
            const list = cal.map[c.iso] ?? [];
            const pct = list.length ? Math.max(8, (total(list) / max) * 100) : 0;
            const on = sel === c.iso;
            return (
              <button key={c.iso} type="button" disabled={!c.inMonth} onClick={() => cal.setSel(c.iso)} className={`relative aspect-square cursor-pointer rounded-full transition-transform hover:scale-105 disabled:cursor-default ${c.inMonth ? '' : 'opacity-20'}`}
                style={{ background: list.length ? `conic-gradient(var(--accent) ${pct}%, var(--line) 0)` : 'var(--line)', padding: 2.5 }}>
                <span className={`flex h-full w-full flex-col items-center justify-center rounded-full ${on ? 'bg-accent text-canvas' : 'bg-card'}`}>
                  <span className={`text-sm tabular-nums ${c.iso === cal.today && !on ? 'font-bold text-accent' : ''}`}>{c.day}</span>
                </span>
                {list.length > 0 && <span className="absolute -right-1.5 -bottom-1.5"><Cluster list={list} size={26} /></span>}
              </button>
            );
          })}
        </div>
        <p className="mt-4 font-support text-xs text-muted">The ring fills with how much is due that day, compared with the busiest day of the month.</p>
      </div>
      <DayList iso={sel} list={cal.map[sel] ?? []} className="rounded-xl border border-line bg-card/60 p-4" />
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ 4 · Agenda
   Only the days that have something, as a list down the page with a line where today falls. */
export function Agenda({ events }: { events: CalEvent[] }) {
  const cal = useCal(events);
  const days = cal.cells.filter((c) => c.inMonth && (cal.map[c.iso]?.length ?? 0) > 0);
  const marker = cal.cells.find((c) => c.iso === cal.today && c.inMonth);
  return (
    <div className="rounded-2xl border border-line bg-card/40 p-5 @3xl:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-xl font-semibold tracking-tight">{cal.label} {cal.year}</h4>
        <span className="flex items-center gap-2"><span className="font-support text-sm text-muted">{money(total(cal.monthEvents))} in {days.length} days</span><NavButtons cal={cal} /></span>
      </div>
      {days.length === 0 && <p className="font-support text-sm text-muted">Nothing recurring this month.</p>}
      <ol className="relative">
        <span aria-hidden="true" className="absolute top-2 bottom-2 left-[27px] w-px bg-line" />
        {days.map((c, i) => {
          const list = cal.map[c.iso];
          const d = new Date(`${c.iso}T00:00:00`);
          const past = c.iso < cal.today;
          const showToday = marker && c.iso >= cal.today && (i === 0 || days[i - 1].iso < cal.today);
          return (
            <li key={c.iso}>
              {showToday && (
                <div className="relative my-2 flex items-center gap-3 pl-1">
                  <span className="z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent ring-4 ring-[var(--card)]" style={{ marginLeft: 13 }} />
                  <span className="font-support text-xs font-semibold tracking-widest text-accent uppercase">Today</span>
                  <span className="h-px flex-1 bg-accent/40" />
                </div>
              )}
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: past ? 0.6 : 1, x: 0 }} transition={{ duration: 0.3, ease, delay: i * 0.03 }} className="flex items-center gap-4 py-3 pl-1">
                <span className="z-10 flex w-[54px] shrink-0 flex-col items-center rounded-xl border border-line bg-card py-1.5">
                  <span className="font-support text-[10px] tracking-widest text-muted uppercase">{WEEKDAYS[d.getDay()]}</span>
                  <span className="text-lg leading-none font-semibold tabular-nums">{d.getDate()}</span>
                </span>
                <Cluster list={list} size={46} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{list.map((e) => e.name).join(', ')}</span>
                  <span className="block font-support text-xs text-muted">{list.length === 1 ? (list[0].paid ? 'Paid' : 'Due') : `${list.length} payments`}</span>
                </span>
                <span className="text-sm font-semibold tabular-nums">{money(total(list))}</span>
              </motion.div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ 5 · Week ribbon
   A scrolling strip of tall day tiles: weekday, date, logos and the day's total. */
export function WeekRibbon({ events }: { events: CalEvent[] }) {
  const map = useMemo(() => byDate(events), [events]);
  const t = todayIso();
  const [shift, setShift] = useState(0);
  const [sel, setSel] = useState(t);
  const days = useMemo(() => {
    const start = new Date(`${t}T00:00:00`);
    start.setDate(start.getDate() - start.getDay() + shift * 7);
    return Array.from({ length: 21 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { iso: isoOf(d.getFullYear(), d.getMonth(), d.getDate()), d };
    });
  }, [t, shift]);
  const first = days[0].d;
  const lastD = days[days.length - 1].d;
  return (
    <div className="rounded-2xl border border-line bg-card/40 p-5 @3xl:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h4 className="text-xl font-semibold tracking-tight">{MONTHS[first.getMonth()].slice(0, 3)} {first.getDate()} – {MONTHS[lastD.getMonth()].slice(0, 3)} {lastD.getDate()}</h4>
        <span className="flex items-center gap-2">
          <button type="button" onClick={() => { setShift(0); setSel(t); }} className="cursor-pointer text-sm text-accent hover:underline">Today</button>
          <button type="button" aria-label="Earlier" onClick={() => setShift((s) => s - 3)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-line hover:border-muted"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" aria-label="Later" onClick={() => setShift((s) => s + 3)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-line hover:border-muted"><ChevronRight className="h-4 w-4" /></button>
        </span>
      </div>
      <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-3">
        {days.map(({ iso, d }) => {
          const list = map[iso] ?? [];
          const on = sel === iso;
          const isToday = iso === t;
          return (
            <button key={iso} type="button" onClick={() => setSel(iso)} className={`flex h-[168px] w-[70px] shrink-0 cursor-pointer snap-start flex-col items-center justify-between rounded-[26px] border px-1 py-3 transition-all ${on ? 'border-accent bg-accent-soft' : isToday ? 'border-ink/40 bg-card' : 'border-line bg-card/60 hover:border-muted'}`}>
              <span className="font-support text-[10px] tracking-widest text-muted uppercase">{WEEKDAYS[d.getDay()]}</span>
              <span className={`flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold tabular-nums ${isToday ? 'bg-accent text-canvas' : ''}`}>{d.getDate()}</span>
              <span className="flex h-[46px] items-center"><Cluster list={list} size={44} ring={on ? 'color-mix(in srgb, var(--accent) 14%, var(--card))' : 'var(--card)'} /></span>
              <span className="font-support text-[11px] text-muted tabular-nums">{list.length ? money(total(list)) : '—'}</span>
            </button>
          );
        })}
      </div>
      <DayList iso={sel} list={map[sel] ?? []} className="mt-2 rounded-xl border border-line bg-card/60 p-4" />
    </div>
  );
}
