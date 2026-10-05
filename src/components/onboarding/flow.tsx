import { useState, type ComponentType } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Check } from 'lucide-react';
import { item } from './motion';
import { ConnectArt, OverviewArt, PatternsArt, RecurringArt, WelcomeArt } from './Art';

// What every onboarding mockup walks through. It follows the real app: connect a bank, then the Overview,
// Patterns and Recurring screens that are built from that bank's data.
export interface Step {
  id: string;
  label: string; // short name used by the progress bars
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  Art: ComponentType;
}

export const STEPS: Step[] = [
  {
    id: 'welcome',
    label: 'Welcome',
    eyebrow: 'Meet Wallex',
    title: 'Your money, in one calm place',
    body: 'Wallex links to your bank and turns your transactions into a clear picture of where you stand, where your money goes and what is coming next.',
    points: ['Built from your own accounts and transactions', 'Nothing is invented: estimates are marked as estimates', 'Works as a desktop app or in a phone-sized view'],
    Art: WelcomeArt,
  },
  {
    id: 'connect',
    label: 'Bank',
    eyebrow: 'Connect your bank',
    title: 'Link your bank, read-only',
    body: 'Wallex connects to Chase through Plaid. It can read your balances and transactions. It can never move money.',
    points: ['Read-only: balances and transactions only', 'Your Plaid keys are saved encrypted on this computer', 'Set up once in Settings → Setup, and unlink any time'],
    Art: ConnectArt,
  },
  {
    id: 'overview',
    label: 'Overview',
    eyebrow: 'Overview',
    title: 'See where you stand',
    body: 'Money in, money out and what is left over for the last 30, 60 or 90 days, next to the cash you have right now.',
    points: ['Net cash flow and your savings rate', 'Cash available across checking and savings', 'Commitments, upcoming payments and a cash buffer'],
    Art: OverviewArt,
  },
  {
    id: 'patterns',
    label: 'Patterns',
    eyebrow: 'Patterns',
    title: 'Spot your spending patterns',
    body: 'Every bill, merchant and category becomes a circle sized by its share of your income. Pick one to see its average, how often it happens and its trend.',
    points: ['Switch between bills, merchants and categories', 'Credit card purchases are included, card payments are not counted twice', 'Search and filter to find any one thing'],
    Art: PatternsArt,
  },
  {
    id: 'recurring',
    label: 'Recurring',
    eyebrow: 'Recurring',
    title: 'Know what is coming',
    body: 'Wallex finds the payments that repeat, like rent, loans and subscriptions, and shows the next charge, any price change and anything it wants you to check.',
    points: ['Confirm, rename or ignore anything it found', 'Next expected date and amount for each one', 'Price changes are flagged when a charge goes up'],
    Art: RecurringArt,
  },
];

export function useFlow() {
  const [i, setI] = useState(0);
  const last = STEPS.length - 1;
  return {
    i,
    step: STEPS[i],
    first: i === 0,
    last: i === last,
    next: () => setI((n) => (n >= last ? 0 : n + 1)), // on the last screen "Get started" begins again
    back: () => setI((n) => Math.max(0, n - 1)),
    skip: () => setI(last),
  };
}
export type Flow = ReturnType<typeof useFlow>;

export function StepText({
  step,
  center = false,
  compact = false,
  titleClass = 'text-3xl @3xl:text-4xl',
}: {
  step: Step;
  center?: boolean;
  compact?: boolean; // a short version for small frames: no bullet list
  titleClass?: string;
}) {
  return (
    <>
      <motion.p variants={item} className="font-support text-xs font-semibold tracking-[0.2em] text-accent uppercase">
        {step.eyebrow}
      </motion.p>
      <motion.h3 variants={item} className={`mt-3 font-semibold tracking-tight ${titleClass}`}>
        {step.title}
      </motion.h3>
      <motion.p variants={item} className={`mt-3 font-support leading-relaxed text-muted ${compact ? 'text-sm' : 'text-[15px]'}`}>
        {step.body}
      </motion.p>
      <ul className={`mt-5 space-y-2.5 ${compact ? 'hidden' : ''} ${center ? 'mx-auto max-w-md text-left' : ''}`}>
        {step.points.map((p) => (
          <motion.li key={p} variants={item} className="flex items-start gap-2.5 font-support text-sm">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className="text-ink/90">{p}</span>
          </motion.li>
        ))}
      </ul>
    </>
  );
}

// Back, Skip and Next, which stay put while the screen around them changes.
export function Controls({ flow, stretch = false, className = '' }: { flow: Flow; stretch?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${stretch ? 'flex-col-reverse' : ''} ${className}`}>
      <div className={`flex items-center gap-1 ${stretch ? 'w-full justify-between' : ''}`}>
        <button
          type="button"
          onClick={flow.back}
          className={`cursor-pointer rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:text-ink ${flow.first ? 'invisible' : ''}`}
        >
          Back
        </button>
        <button
          type="button"
          onClick={flow.skip}
          className={`cursor-pointer rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:text-ink ${flow.last ? 'invisible' : ''}`}
        >
          Skip
        </button>
      </div>
      <button
        type="button"
        onClick={flow.next}
        className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-canvas capitalize transition-opacity hover:opacity-90 ${stretch ? 'w-full' : 'ml-auto'}`}
      >
        {flow.last ? 'Get started' : 'Next'}
        {flow.last ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <ArrowRight className="h-4 w-4" />}
      </button>
    </div>
  );
}
