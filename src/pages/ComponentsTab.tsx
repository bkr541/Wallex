import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, ArrowUp, Check, ChevronDown, Eye, EyeOff, Loader2, Lock, Mail, Plus, Search, X } from 'lucide-react';

// A kit of the basic pieces the app is built from, each one working and each one themed from the same variables
// as the rest of the app, so it follows the theme and accent chosen in Settings → Appearance.

function Row({ index, name, note, children }: { index: string; name: string; note: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3">
        <span className="font-support text-xs tracking-widest text-muted">{index}</span>
        <h4 className="text-base font-semibold">{name}</h4>
        <p className="font-support text-sm text-muted">{note}</p>
      </div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 rounded-2xl border border-line bg-card/40 p-5 @3xl:grid-cols-3 @3xl:p-6">{children}</div>
    </section>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <h3 className="border-b border-line px-3 pb-3 text-lg font-semibold">{title}</h3>
      <div className="space-y-8">{children}</div>
    </div>
  );
}

// A component with its name underneath.
function Cell({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-1 items-start">{children}</div>
      <p className="font-support text-xs text-muted">{caption}</p>
    </div>
  );
}

/* ----------------------------------------------------------------------------------------------- inputs */

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block w-full">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {(error || hint) && <span className={`mt-1.5 block font-support text-xs ${error ? 'text-red-300' : 'text-muted'}`}>{error ?? hint}</span>}
    </label>
  );
}

const inputBase = 'w-full text-sm text-ink outline-none placeholder:text-muted transition-colors';

function TextInputs() {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [c, setC] = useState('');
  return (
    <>
      <Cell caption="Outline">
        <Field label="Account nickname" hint="Shown on the Checking tab.">
          <input value={a} onChange={(e) => setA(e.target.value)} placeholder="Everyday checking" className={`${inputBase} rounded-lg border border-line bg-transparent px-3 py-2.5 focus:border-accent`} />
        </Field>
      </Cell>
      <Cell caption="Filled">
        <Field label="Merchant name" hint="How it appears in Patterns.">
          <input value={b} onChange={(e) => setB(e.target.value)} placeholder="Publix" className={`${inputBase} rounded-lg border border-transparent bg-surface px-3 py-2.5 focus:border-accent`} />
        </Field>
      </Cell>
      <Cell caption="Underline">
        <Field label="Note" hint="Only you see this.">
          <input value={c} onChange={(e) => setC(e.target.value)} placeholder="Add a note" className={`${inputBase} border-b border-line bg-transparent px-1 py-2.5 focus:border-accent`} />
        </Field>
      </Cell>
    </>
  );
}

function IconInputs() {
  const [q, setQ] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const icon = 'pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted';
  return (
    <>
      <Cell caption="Search with clear">
        <Field label="Search">
          <span className="relative block">
            <Search className={icon} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transactions…" className={`${inputBase} rounded-lg border border-line bg-surface py-2.5 pr-9 pl-9 focus:border-accent`} />
            {q && (
              <button type="button" aria-label="Clear" onClick={() => setQ('')} className="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-line hover:text-ink">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        </Field>
      </Cell>
      <Cell caption="Password with reveal">
        <Field label="Plaid secret" hint="Stored encrypted on this computer.">
          <span className="relative block">
            <Lock className={icon} />
            <input type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Your secret" className={`${inputBase} rounded-lg border border-line bg-surface py-2.5 pr-10 pl-9 focus:border-accent`} />
            <button type="button" aria-label={show ? 'Hide' : 'Show'} onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted hover:text-ink">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </Field>
      </Cell>
      <Cell caption="Validated">
        <Field label="Email" error={touched && email && !valid ? 'Enter an email like name@example.com' : undefined} hint={valid ? 'Looks good.' : 'We check it when you leave the field.'}>
          <span className="relative block">
            <Mail className={icon} />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="name@example.com"
              className={`${inputBase} rounded-lg border bg-surface py-2.5 pr-9 pl-9 ${touched && email && !valid ? 'border-red-400/70' : 'border-line focus:border-accent'}`}
            />
            {email && (valid ? <Check className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-accent" /> : touched && <AlertCircle className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-red-300" />)}
          </span>
        </Field>
      </Cell>
    </>
  );
}

function SpecialInputs() {
  const [amount, setAmount] = useState('');
  const [range, setRange] = useState('30');
  const [code, setCode] = useState(['', '', '', '']);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const onAmount = (v: string) => {
    const clean = v.replace(/[^\d.]/g, '');
    const [whole, ...rest] = clean.split('.');
    setAmount(rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole);
  };
  return (
    <>
      <Cell caption="Amount">
        <Field label="Monthly budget" hint="Whole dollars or cents.">
          <span className="relative block">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">$</span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => onAmount(e.target.value)}
              onBlur={() => amount && setAmount(Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
              onFocus={() => setAmount((a) => a.replace(/,/g, ''))}
              placeholder="0.00"
              className={`${inputBase} rounded-lg border border-line bg-surface py-2.5 pr-3 pl-7 tabular-nums focus:border-accent`}
            />
          </span>
        </Field>
      </Cell>
      <Cell caption="Select">
        <Field label="Period">
          <span className="relative block">
            <select value={range} onChange={(e) => setRange(e.target.value)} className={`${inputBase} cursor-pointer appearance-none rounded-lg border border-line bg-surface py-2.5 pr-9 pl-3 focus:border-accent`}>
              <option value="30">Last 30 days</option>
              <option value="60">Last 60 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted" />
          </span>
        </Field>
      </Cell>
      <Cell caption="Code">
        <div role="group" aria-label="Verification code">
          <span className="mb-1.5 block text-sm font-medium">Verification code</span>
          <div className="flex gap-2">
            {code.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                inputMode="numeric"
                maxLength={1}
                value={d}
                aria-label={`Digit ${i + 1}`}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(-1);
                  setCode((c) => c.map((x, j) => (j === i ? v : x)));
                  if (v && i < code.length - 1) refs.current[i + 1]?.focus();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !code[i] && i > 0) refs.current[i - 1]?.focus();
                }}
                className="h-12 w-11 rounded-lg border border-line bg-surface text-center text-lg font-semibold text-ink tabular-nums outline-none focus:border-accent"
              />
            ))}
          </div>
        </div>
      </Cell>
    </>
  );
}

/* --------------------------------------------------------------------------------------------- buttons */

const btn = 'inline-flex cursor-pointer items-center justify-center gap-2 text-sm font-semibold transition-all disabled:cursor-not-allowed';

function SolidButtons() {
  return (
    <>
      <Cell caption="Solid">
        <button type="button" className={`${btn} rounded-lg bg-accent px-5 py-2.5 text-canvas hover:opacity-90`}>
          Connect bank
        </button>
      </Cell>
      <Cell caption="With icon">
        <button type="button" className={`${btn} group rounded-lg bg-accent px-5 py-2.5 text-canvas hover:opacity-90`}>
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Add account
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </Cell>
      <Cell caption="Pill">
        <button type="button" className={`${btn} rounded-full bg-accent px-7 py-3 text-canvas hover:opacity-90`}>
          Get started
          <Check className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </Cell>
    </>
  );
}

function StateButtons() {
  const [phase, setPhase] = useState<'idle' | 'loading'>('idle');
  const [saved, setSaved] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  return (
    <>
      <Cell caption="Loading (press it)">
        <button
          type="button"
          disabled={phase === 'loading'}
          onClick={() => {
            setPhase('loading');
            timers.current.push(window.setTimeout(() => setPhase('idle'), 1800));
          }}
          className={`${btn} min-w-[9.5rem] rounded-lg bg-accent px-5 py-2.5 text-canvas hover:opacity-90 disabled:opacity-80`}
        >
          {phase === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {phase === 'loading' ? 'Syncing…' : 'Sync transactions'}
        </button>
      </Cell>
      <Cell caption="Disabled">
        <button type="button" disabled className={`${btn} rounded-lg bg-accent px-5 py-2.5 text-canvas opacity-40`}>
          Connect bank
        </button>
      </Cell>
      <Cell caption="Success (press it)">
        <button
          type="button"
          onClick={() => {
            setSaved(true);
            timers.current.push(window.setTimeout(() => setSaved(false), 1600));
          }}
          className={`${btn} min-w-[9.5rem] rounded-lg px-5 py-2.5 text-canvas ${saved ? 'bg-green-400' : 'bg-accent hover:opacity-90'}`}
        >
          {saved ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
          {saved ? 'Saved' : 'Save changes'}
        </button>
      </Cell>
    </>
  );
}

function StyledButtons() {
  return (
    <>
      <Cell caption="Gradient glow">
        <button
          type="button"
          className={`${btn} rounded-xl px-6 py-3 text-canvas shadow-[0_10px_28px_color-mix(in_srgb,var(--accent)_40%,transparent)] hover:brightness-110`}
          style={{ background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 55%, #4aa3ff))' }}
        >
          See your overview
        </button>
      </Cell>
      <Cell caption="Outline">
        <button type="button" className={`${btn} rounded-xl border-2 border-accent bg-accent-soft px-6 py-2.5 text-accent hover:bg-accent hover:text-canvas`}>
          Review recurring
        </button>
      </Cell>
      <Cell caption="Pressed">
        <button
          type="button"
          className={`${btn} rounded-xl bg-accent px-6 py-3 text-canvas shadow-[0_4px_0_color-mix(in_srgb,var(--accent)_55%,black)] active:translate-y-1 active:shadow-none`}
        >
          Confirm
        </button>
      </Cell>
    </>
  );
}

/* ---------------------------------------------------------------------------------------------- badges */

const badge = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-support text-xs font-semibold';

function StatusBadges() {
  return (
    <>
      <Cell caption="Success">
        <span className={`${badge} bg-accent-soft text-accent`}>
          <Check className="h-3 w-3" strokeWidth={3} />
          Confirmed
        </span>
      </Cell>
      <Cell caption="Alert">
        <span className={`${badge} bg-red-400/15 text-red-300`}>
          <AlertCircle className="h-3 w-3" strokeWidth={2.5} />
          Needs review
        </span>
      </Cell>
      <Cell caption="Warning">
        <span className={`${badge} bg-amber-400/15 text-amber-400`}>
          <ArrowUp className="h-3 w-3" strokeWidth={3} />
          Price up from $30
        </span>
      </Cell>
    </>
  );
}

function LabelBadges() {
  return (
    <>
      <Cell caption="Dot">
        <span className={`${badge} border border-line bg-surface text-ink`}>
          <span className="h-2 w-2 rounded-full bg-[#4fa3ff]" />
          Bills
        </span>
      </Cell>
      <Cell caption="Count">
        <span className={`${badge} bg-surface pr-1.5 text-ink`}>
          Needs review
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] text-canvas">3</span>
        </span>
      </Cell>
      <Cell caption="Outline">
        <span className={`${badge} border border-accent/60 text-accent`}>Habit</span>
      </Cell>
    </>
  );
}

export default function ComponentsTab() {
  return (
    <div className="space-y-14 px-1 pb-12">
      <Group title="Inputs">
        <Row index="01" name="Field styles" note="Outline, filled and underline, each with a label and helper text.">
          <TextInputs />
        </Row>
        <Row index="02" name="With icons" note="Search with a clear button, a password you can reveal, and an email that checks itself.">
          <IconInputs />
        </Row>
        <Row index="03" name="Specialised" note="A dollar amount, a select, and a four-digit code.">
          <SpecialInputs />
        </Row>
      </Group>

      <Group title="Primary buttons">
        <Row index="01" name="Solid" note="The main action, plain, with icons, and as a pill.">
          <SolidButtons />
        </Row>
        <Row index="02" name="States" note="Loading, disabled and success.">
          <StateButtons />
        </Row>
        <Row index="03" name="Styles" note="A glowing gradient, an outline and a button that presses down.">
          <StyledButtons />
        </Row>
      </Group>

      <Group title="Badges">
        <Row index="01" name="Status" note="The same chips the Recurring tab uses to say how sure Wallex is.">
          <StatusBadges />
        </Row>
        <Row index="02" name="Labels" note="A dot label, a count, and an outline tag.">
          <LabelBadges />
        </Row>
      </Group>
    </div>
  );
}
