import SectionTitle from '../components/SectionTitle';
import { BubblesHero, ShowcaseHero, StreamHero } from '../components/hero/Heroes';

const HEROES: { name: string; note: string; Component: () => React.ReactElement }[] = [
  { name: 'Spending bubbles', note: 'Circles sized by what each habit costs, drifting over a deep violet glow.', Component: BubblesHero },
  { name: 'Receipt stream', note: 'Charges scroll past on a tilted tape, and the ones that repeat are picked out.', Component: StreamHero },
  { name: 'App showcase', note: 'The receipt-stream look, but the tape plays through the app: transactions, spending circles, the calendar, the money bar and the cash gauge, with the words changing to match.', Component: ShowcaseHero },
];

// Ideas for the left half of the sign-in screen. Each has its own colours, animated background, headline and
// supporting line. They are drawn at the size of the real panel, on a dark base with white text so they read the same
// in either theme.
export default function LoginHeroTab() {
  return (
    <div className="space-y-12 px-1 pb-10">
      <div className="px-3">
        <SectionTitle icon="layers-1">Login hero</SectionTitle>
        <p className="mt-1 font-support text-sm text-muted">Takes on the left side of the sign-in screen. Each one loops on its own.</p>
      </div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-12 px-3 @3xl:grid-cols-2">
        {HEROES.map((h, i) => (
          <section key={h.name} className="min-w-0">
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-support text-xs tracking-widest text-muted">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="text-base font-semibold">{h.name}</h3>
            </div>
            <p className="mb-3 font-support text-sm text-muted">{h.note}</p>
            <h.Component />
          </section>
        ))}
      </div>
    </div>
  );
}
