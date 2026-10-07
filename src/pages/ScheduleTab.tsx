import { useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import MerchantLogo from '../components/MerchantLogo';
import SectionTitle from '../components/SectionTitle';
import { useCalendarEvents, WEEKDAYS, type CalEvent } from '../components/calendar/data';
import { Cluster, DayList, NavButtons, useCal } from '../components/calendar/Variants';
import { money } from '../lib/patternFormat';
import type { Load } from '../lib/useTransactions';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (iso: string) => `${MONTH_SHORT[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
const total = (list: CalEvent[]) => list.reduce((s, e) => s + e.amount, 0);

// The Schedule page: a month where each merchant's round logo stands in for the day number on the days a payment lands,
// with the day you pick listed beside it (below it on a phone) and what is coming up next.
export default function ScheduleTab({ load }: { load: Load }) {
  const { events, sample } = useCalendarEvents(load);
  const cal = useCal(events);

  // Start on today.
  useEffect(() => {
    cal.setSel(cal.today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inMonth = cal.monthEvents;
  const due = inMonth.filter((e) => !e.paid);
  const paid = inMonth.filter((e) => e.paid);
  const next = useMemo(
    () => events.filter((e) => e.date >= cal.today && !e.paid).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6),
    [events, cal.today],
  );

  if (load.state === 'loading') return null;

  return (
    <div className="@container w-full pb-10">
      <div className="grid grid-cols-1 gap-5 px-1 @3xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] @3xl:items-start">
        {/* The month */}
        <div className="overflow-hidden rounded-[28px] border border-line" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--accent) 30%, var(--canvas)) 0%, var(--canvas) 36%)' }}>
          <div className="flex items-center justify-between gap-2 px-5 pt-5 @3xl:px-7 @3xl:pt-6">
            <h2 className="text-2xl font-semibold tracking-tight whitespace-nowrap @3xl:text-4xl">{cal.label} <span className="font-normal text-muted">{cal.year}</span></h2>
            <span className="flex items-center gap-2">
              <button type="button" onClick={cal.goToday} className="cursor-pointer rounded-full border border-ink/30 bg-canvas/30 px-4 py-2 text-sm font-medium transition-colors hover:border-ink/60">Today</button>
              <NavButtons cal={cal} />
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 px-5 @3xl:px-7">
            <span className="rounded-full border border-line bg-surface px-3 py-1 font-support text-xs text-ink/80"><b className="font-semibold text-ink">{money(total(due))}</b> still due</span>
            <span className="rounded-full border border-line bg-surface px-3 py-1 font-support text-xs text-ink/80"><b className="font-semibold text-accent">{money(total(paid))}</b> paid</span>
            <span className="rounded-full border border-line bg-surface px-3 py-1 font-support text-xs text-ink/80"><b className="font-semibold text-ink">{inMonth.length}</b> {inMonth.length === 1 ? 'payment' : 'payments'}</span>
          </div>

          <div className="mt-4 grid grid-cols-7 px-2 text-center font-support text-xs text-muted @3xl:px-5">
            {WEEKDAYS.map((d) => <span key={d} className="py-2">{d}</span>)}
          </div>
          <motion.div key={`${cal.year}-${cal.month}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="grid grid-cols-7 gap-y-1 px-2 pb-4 @3xl:px-5 @3xl:pb-6">
            {cal.cells.map((c) => {
              const list = c.inMonth ? cal.map[c.iso] ?? [] : [];
              const on = cal.sel === c.iso;
              return (
                <button
                  key={c.iso}
                  type="button"
                  disabled={!c.inMonth}
                  onClick={() => cal.setSel(on ? null : c.iso)}
                  aria-label={c.inMonth ? `${shortDate(c.iso)}${list.length ? `, ${list.length} payment${list.length === 1 ? '' : 's'}` : ''}` : undefined}
                  className={`flex h-[58px] cursor-pointer items-center justify-center rounded-xl transition-colors disabled:cursor-default @3xl:h-[80px] ${on ? 'bg-accent-soft ring-2 ring-accent' : c.inMonth ? 'hover:bg-surface/60' : ''}`}
                >
                  {!c.inMonth ? null : list.length ? (
                    <span className="origin-center scale-100 @3xl:scale-125"><Cluster list={list} size={46} ring="var(--canvas)" /></span>
                  ) : (
                    <span className={`text-lg tabular-nums @3xl:text-xl ${c.iso === cal.today ? 'flex h-9 w-9 items-center justify-center rounded-full bg-ink font-semibold text-canvas @3xl:h-10 @3xl:w-10' : 'text-ink/80'}`}>{c.day}</span>
                  )}
                </button>
              );
            })}
          </motion.div>
        </div>

        {/* The day, and what is next */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-line bg-card/60 p-5">
            {cal.sel ? (
              <DayList iso={cal.sel} list={cal.map[cal.sel] ?? []} />
            ) : (
              <p className="font-support text-sm text-muted">Pick a day to see what is due.</p>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-card/60 p-5">
            <SectionTitle as="h3" icon="circle-clock" className="text-base font-semibold">Coming Up</SectionTitle>
            {next.length === 0 ? (
              <p className="mt-3 font-support text-sm text-muted">Nothing is expected soon.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {next.map((e) => (
                  <li key={e.id}>
                    <button type="button" onClick={() => cal.goTo(e.date)} className="flex w-full cursor-pointer items-center gap-3 py-2.5 text-left">
                      <MerchantLogo name={e.name} sources={e.logos} className="h-8 w-8 text-[10px]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{e.name}</span>
                        <span className="block font-support text-xs text-muted">{shortDate(e.date)}</span>
                      </span>
                      <span className="text-sm font-semibold tabular-nums">{e.approx ? '~' : ''}{money(e.amount)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="px-1 font-support text-xs text-muted">{sample ? 'These are sample payments until a bank is connected.' : 'Built from the recurring payments Wallex found in your linked accounts.'}</p>
        </div>
      </div>
    </div>
  );
}
