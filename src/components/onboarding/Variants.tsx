import { AnimatePresence, motion } from 'motion/react';
import { Check } from 'lucide-react';
import { Controls, STEPS, StepText, useFlow, type Flow } from './flow';
import { stagger } from './motion';

// Five takes on the same onboarding flow. Each one hides the current screen when Next is pressed and brings
// the next one in, and each has its own progress bar.

// The pieces of the current screen, keyed by step so they leave and arrive as a group.
function Screen({ flow, className = '', children }: { flow: Flow; className?: string; children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div key={flow.step.id} variants={stagger} initial="hidden" animate="show" exit="exit" className={className}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

const pct = (i: number) => Math.round(((i + 1) / STEPS.length) * 100);

/* 1 · Split panel: the drawing on a tinted panel, text on the right, segmented progress with step names. */
export function SplitOnboarding() {
  const flow = useFlow();
  const Art = flow.step.Art;
  return (
    <div className="grid min-h-[470px] overflow-hidden rounded-[28px] border border-line bg-card/50 @3xl:grid-cols-2">
      <div
        className="flex items-center justify-center p-8"
        style={{ background: 'radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 65%), var(--surface)' }}
      >
        <Screen flow={flow} className="w-full">
          <Art />
        </Screen>
      </div>
      <div className="flex flex-col p-6 @3xl:p-8">
        <div role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={flow.i + 1} aria-label="Onboarding progress">
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <span key={s.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <motion.span
                  className="block h-full rounded-full bg-accent"
                  initial={false}
                  animate={{ width: i <= flow.i ? '100%' : '0%' }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            {STEPS.map((s, i) => (
              <span key={s.id} className={`flex-1 truncate font-support text-[10px] ${i === flow.i ? 'text-ink' : 'text-muted'}`}>
                {s.label}
              </span>
            ))}
          </div>
        </div>
        <Screen flow={flow} className="flex-1 pt-8">
          <StepText step={flow.step} />
        </Screen>
        <Controls flow={flow} className="pt-6" />
      </div>
    </div>
  );
}

/* 2 · Centered: drawing, then text, then one slim bar with the step count and percentage underneath. */
export function CenteredOnboarding() {
  const flow = useFlow();
  const Art = flow.step.Art;
  return (
    <div className="flex min-h-[560px] flex-col rounded-[28px] border border-line bg-card/50 px-6 pt-8 pb-5 text-center @3xl:px-10">
      <Screen flow={flow} className="flex flex-1 flex-col items-center">
        <div className="flex min-h-[250px] w-full items-center justify-center">
          <Art />
        </div>
        <div className="mt-6 max-w-lg">
          <StepText step={flow.step} center titleClass="text-2xl @3xl:text-3xl" />
        </div>
      </Screen>
      <Controls flow={flow} className="mx-auto mt-6 w-full max-w-lg" />
      <div className="mt-5" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct(flow.i)} aria-label="Onboarding progress">
        <div className="h-1.5 overflow-hidden rounded-full bg-line">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={false}
            animate={{ width: `${pct(flow.i)}%` }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <div className="mt-2 flex justify-between font-support text-xs text-muted">
          <span>
            Step {flow.i + 1} of {STEPS.length}
          </span>
          <span>{pct(flow.i)}%</span>
        </div>
      </div>
    </div>
  );
}

/* 3 · Side rail: a vertical list of the steps whose line fills as you go, with the screen beside it. */
export function RailOnboarding() {
  const flow = useFlow();
  const Art = flow.step.Art;
  return (
    <div className="grid min-h-[520px] overflow-hidden rounded-[28px] border border-line bg-card/50 @3xl:grid-cols-[230px_1fr]">
      <div className="border-b border-line p-6 @3xl:border-r @3xl:border-b-0" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={flow.i + 1} aria-label="Onboarding progress">
        <p className="mb-5 font-support text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">Getting started</p>
        <div className="relative">
          <span className="absolute top-4 bottom-4 left-4 hidden w-0.5 -translate-x-1/2 rounded-full bg-line @3xl:block" />
          <motion.span
            className="absolute top-4 left-4 hidden w-0.5 -translate-x-1/2 rounded-full bg-accent @3xl:block"
            initial={false}
            animate={{ height: `calc((100% - 2rem) * ${flow.i / (STEPS.length - 1)})` }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
          <ol className="flex flex-wrap gap-x-4 gap-y-3 @3xl:flex-col @3xl:gap-y-6">
            {STEPS.map((s, i) => {
              const done = i < flow.i;
              const now = i === flow.i;
              return (
                <li key={s.id} className="relative flex items-center gap-3">
                  <span
                    className={`z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors ${
                      done ? 'border-accent bg-accent text-canvas' : now ? 'border-accent bg-card text-accent' : 'border-line bg-card text-muted'
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={`text-sm ${now ? 'font-semibold text-ink' : 'text-muted'}`}>{s.label}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      <div className="flex flex-col p-6 @3xl:p-8">
        <Screen flow={flow} className="flex flex-1 flex-col gap-6">
          <div>
            <StepText step={flow.step} titleClass="text-2xl @3xl:text-3xl" />
          </div>
          <div className="flex flex-1 items-center">
            <Art />
          </div>
        </Screen>
        <Controls flow={flow} className="pt-5" />
      </div>
    </div>
  );
}

/* 4 · Big numeral: an oversized step number behind the text, and a numbered track along the bottom. */
export function NumeralOnboarding() {
  const flow = useFlow();
  const Art = flow.step.Art;
  const n = String(flow.i + 1).padStart(2, '0');
  return (
    <div
      className="relative flex min-h-[500px] flex-col overflow-hidden rounded-[28px] border border-line"
      style={{ background: 'linear-gradient(120deg, var(--card), color-mix(in srgb, var(--accent) 10%, var(--canvas)))' }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-6 -left-2 text-[11rem] leading-none font-semibold tracking-tighter text-accent opacity-[0.1] select-none @3xl:text-[15rem]"
      >
        {n}
      </span>
      <div className="relative grid flex-1 items-center gap-6 p-6 @3xl:grid-cols-[1.1fr_1fr] @3xl:p-10">
        <Screen flow={flow} className="contents">
          <div className="pt-16 @3xl:pt-24">
            <StepText step={flow.step} titleClass="text-3xl @3xl:text-5xl" />
          </div>
          <div className="flex items-center justify-center">
            <Art />
          </div>
        </Screen>
      </div>
      <div className="relative flex flex-col gap-4 border-t border-line px-6 py-4 @3xl:flex-row @3xl:items-center @3xl:gap-8 @3xl:px-10">
        <div className="flex-1" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={flow.i + 1} aria-label="Onboarding progress">
          <div className="relative h-[3px] rounded-full bg-line">
            <motion.span
              className="absolute inset-y-0 left-0 rounded-full bg-accent shadow-[0_0_12px_var(--accent)]"
              initial={false}
              animate={{ width: `${(flow.i / (STEPS.length - 1)) * 100}%` }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div className="mt-2 flex justify-between font-support text-[11px] tabular-nums">
            {STEPS.map((s, i) => (
              <span key={s.id} className={i <= flow.i ? 'text-ink' : 'text-muted'}>
                {String(i + 1).padStart(2, '0')}
              </span>
            ))}
          </div>
        </div>
        <Controls flow={flow} />
      </div>
    </div>
  );
}

/* 5 · Phone: the flow inside a phone-sized frame, with story-style bars across the top. */
export function PhoneOnboarding() {
  const flow = useFlow();
  const Art = flow.step.Art;
  return (
    <div
      className="flex justify-center rounded-[28px] border border-line py-8"
      style={{ background: 'radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 60%), var(--card)' }}
    >
      <div className="relative flex h-[640px] w-[310px] flex-col overflow-hidden rounded-[42px] border-2 border-line bg-canvas px-5 pt-5 pb-5 shadow-[0_30px_70px_rgba(0,0,0,0.35)]">
        <span className="mx-auto mb-3 h-1.5 w-20 rounded-full bg-line" />
        <div className="flex items-center gap-3">
          <div className="flex flex-1 gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={flow.i + 1} aria-label="Onboarding progress">
            {STEPS.map((s, i) => (
              <span key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                <motion.span
                  className="block h-full rounded-full bg-accent"
                  initial={false}
                  animate={{ width: i <= flow.i ? '100%' : '0%' }}
                  transition={{ duration: 0.4 }}
                />
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={flow.skip}
            className={`cursor-pointer font-support text-xs text-muted hover:text-ink ${flow.last ? 'invisible' : ''}`}
          >
            Skip
          </button>
        </div>
        <Screen flow={flow} className="flex flex-1 flex-col pt-4">
          <div className="flex h-[290px] items-center justify-center overflow-hidden" style={{ zoom: 0.78 }}>
            <Art />
          </div>
          <div className="mt-3">
            <StepText step={flow.step} compact titleClass="text-2xl" />
          </div>
        </Screen>
        <Controls flow={flow} stretch className="pt-3" />
      </div>
    </div>
  );
}
