import SectionTitle from '../components/SectionTitle';
import { useCalendarEvents } from '../components/calendar/data';
import { Agenda, DayRings, FullGrid, PhoneMonth, WeekRibbon } from '../components/calendar/Variants';
import type { Load } from '../lib/useTransactions';

const STYLES = [
  { id: 'phone', name: 'Phone month', note: 'A dark month like the reference: the logos stand in for the day numbers, and tapping a day lists its payments.', Component: PhoneMonth },
  { id: 'grid', name: 'Full grid', note: 'The desktop month: bordered cells with the date, the logos and what each day adds up to.', Component: FullGrid },
  { id: 'rings', name: 'Day rings', note: 'Round days with a ring that fills with how much is due, and a panel for the day you pick.', Component: DayRings },
  { id: 'agenda', name: 'Agenda', note: 'Only the days that have something, down a timeline with a line where today falls.', Component: Agenda },
  { id: 'ribbon', name: 'Week ribbon', note: 'A scrolling strip of tall day tiles for three weeks at a time, with the chosen day below.', Component: WeekRibbon },
] as const;

// Five calendars of the payments Wallex has found. A day with one payment shows that merchant's logo; two
// payments show two overlapping logos; more than two show the first logo and a "+" circle with how many more.
export default function CalendarTab({ load }: { load: Load }) {
  const { events, sample } = useCalendarEvents(load);
  return (
    <div className="space-y-12 px-1 pb-10">
      <div className="px-3">
        <SectionTitle icon="calendar-check">Payments calendar</SectionTitle>
        <p className="mt-1 font-support text-sm text-muted">
          Your recurring bills and subscriptions by day: the ones already paid and the ones coming up. A day with one
          payment shows one logo, two payments overlap two logos, and more than two show a "+" circle for the rest.
          {sample ? ' These are sample payments until a bank is connected.' : ' Built from your linked accounts.'}
        </p>
      </div>
      {STYLES.map((s, i) => (
        <section key={s.id}>
          <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3">
            <span className="font-support text-xs tracking-widest text-muted">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="text-base font-semibold">{s.name}</h3>
            <p className="font-support text-sm text-muted">{s.note}</p>
          </div>
          <div className="px-3">
            <s.Component events={events} />
          </div>
        </section>
      ))}
    </div>
  );
}
