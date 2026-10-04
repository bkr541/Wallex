import { CenteredOnboarding, NumeralOnboarding, PhoneOnboarding, RailOnboarding, SplitOnboarding } from '../components/onboarding/Variants';

const STYLES: { id: string; name: string; note: string; Component: () => React.ReactElement }[] = [
  {
    id: 'split',
    name: 'Split panel',
    note: 'The drawing on a tinted panel, text on the right, and a segmented progress bar with the step names under it.',
    Component: SplitOnboarding,
  },
  {
    id: 'centered',
    name: 'Centered',
    note: 'Drawing, then text, all centered, with one slim progress bar along the bottom showing the step count and percentage.',
    Component: CenteredOnboarding,
  },
  {
    id: 'rail',
    name: 'Side rail',
    note: 'A vertical list of the steps whose line fills as you go, ticking each one off, with the screen beside it.',
    Component: RailOnboarding,
  },
  {
    id: 'numeral',
    name: 'Big numeral',
    note: 'An oversized step number behind the text, and a glowing progress track with numbered stops along the bottom.',
    Component: NumeralOnboarding,
  },
  {
    id: 'phone',
    name: 'Phone',
    note: 'The same flow inside a phone-sized frame, with story-style progress bars across the top.',
    Component: PhoneOnboarding,
  },
];

// Five takes on a first-run walkthrough. All of them tell the same story, in the order the app works: what
// Wallex is, linking a bank, then the Overview, Patterns and Recurring screens built from it. Next hides the
// screen and brings in the next one; on the last screen Get started begins the flow again.
export default function OnboardingTab() {
  return (
    <div className="space-y-12 px-1 pb-10">
      <div className="px-3">
        <h2 className="text-lg font-semibold">First-run walkthrough</h2>
        <p className="mt-1 font-support text-sm text-muted">
          Five ways to introduce Wallex to a new person. Press Next in any of them to try it. In the app, Get started
          would close the flow; here it starts over. The figures in the drawings are samples.
        </p>
      </div>

      {STYLES.map((style, i) => (
        <section key={style.id}>
          <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3">
            <span className="font-support text-xs tracking-widest text-muted">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="text-base font-semibold">{style.name}</h3>
            <p className="font-support text-sm text-muted">{style.note}</p>
          </div>
          <div className="px-3">
            <style.Component />
          </div>
        </section>
      ))}
    </div>
  );
}
