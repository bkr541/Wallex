import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, KeyRound, Lock, Mail, ShieldCheck, TrendingUp, User } from 'lucide-react';
import { asset } from '../../assets';
import { RevealButton, useAuthForm, type Auth, type FieldDef, type FieldKey, type Mode } from './shared';

const ease = [0.22, 1, 0.36, 1] as const;
const logo = () => asset('logos/logo2.png');
const ICONS: Record<FieldKey, typeof Mail> = { first: User, last: User, email: Mail, password: Lock, confirm: KeyRound };

// A block that fades and lifts in when the mode changes, so the fields swap rather than jump.
function Swap({ id, className = '', children }: { id: string; className?: string; children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22, ease }} className={className}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// First and last name share a row; everything else gets its own.
function rows(fields: FieldDef[]): FieldDef[][] {
  const out: FieldDef[][] = [];
  for (const f of fields) {
    if (f.key === 'last') out[out.length - 1].push(f);
    else out.push([f]);
  }
  return out;
}

const Err = ({ text }: { text: string | null }) => (
  <AnimatePresence initial={false}>
    {text && (
      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden font-support text-xs text-red-300">
        <span className="block pt-1.5">{text}</span>
      </motion.p>
    )}
  </AnimatePresence>
);

const DoneLabel = ({ auth }: { auth: Auth }) =>
  auth.done ? (
    <>
      <Check className="h-4 w-4" strokeWidth={3} />
      {auth.mode === 'login' ? 'Logged in (preview)' : 'Account created (preview)'}
    </>
  ) : (
    <>{auth.copy.cta}</>
  );

/* ------------------------------------------------------------------------------------------------------
   1 · Split panel: a brand panel on the left, the form on the right, a sliding switch on top.
------------------------------------------------------------------------------------------------------ */
function FilledInput({ auth, f }: { auth: Auth; f: FieldDef }) {
  const [show, setShow] = useState(false);
  const Icon = ICONS[f.key];
  const err = auth.error(f.key);
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium" htmlFor={`s1-${f.key}`}>{f.label}</label>
      <span className="relative block">
        <Icon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          id={`s1-${f.key}`}
          type={f.type === 'password' && show ? 'text' : f.type}
          autoComplete={f.autoComplete}
          value={auth.values[f.key]}
          placeholder={f.placeholder}
          onChange={(e) => auth.set(f.key, e.target.value)}
          onBlur={() => auth.touch(f.key)}
          className={`w-full rounded-xl border bg-surface py-3 pr-10 pl-10 text-sm text-ink outline-none transition-colors placeholder:text-muted ${err ? 'border-red-400/70' : 'border-transparent focus:border-accent'}`}
        />
        {f.type === 'password' && <RevealButton shown={show} onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-3 -translate-y-1/2" />}
      </span>
      <Err text={err} />
    </div>
  );
}

export function SplitLogin() {
  const auth = useAuthForm();
  const pts = [
    { Icon: ShieldCheck, t: 'Read-only access to your bank' },
    { Icon: TrendingUp, t: 'Where you stand, in one place' },
    { Icon: KeyRound, t: 'Keys stay encrypted on your computer' },
  ];
  return (
    <div className="grid min-h-[600px] overflow-hidden rounded-[28px] border border-line @3xl:grid-cols-[1fr_1.1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden p-9 @3xl:flex" style={{ background: 'linear-gradient(155deg, color-mix(in srgb, var(--accent) 80%, black), color-mix(in srgb, var(--accent) 35%, var(--canvas)))' }}>
        <span aria-hidden="true" className="absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-white/10" />
        <span aria-hidden="true" className="absolute -top-16 -right-10 h-48 w-48 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-3 text-canvas">
          {logo() && <img src={logo()} alt="" className="h-10 w-10 object-contain" draggable={false} />}
          <span className="text-lg font-semibold tracking-tight">Wallex</span>
        </div>
        <div className="relative text-canvas">
          <h3 className="text-4xl leading-tight font-semibold tracking-tight">Your money, in one calm place.</h3>
          <ul className="mt-6 space-y-3">
            {pts.map(({ Icon, t }) => (
              <li key={t} className="flex items-center gap-3 font-support text-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-canvas/20"><Icon className="h-4 w-4" /></span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <form onSubmit={auth.submit} noValidate className="flex flex-col justify-center bg-card/60 p-6 @3xl:p-10">
        <div role="tablist" className="relative mb-7 flex rounded-full bg-surface p-1">
          {(['login', 'signup'] as Mode[]).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={auth.mode === m} onClick={() => auth.setMode(m)} className={`relative z-10 flex-1 cursor-pointer rounded-full py-2 text-sm transition-colors ${auth.mode === m ? 'font-semibold text-ink' : 'text-muted'}`}>
              {auth.mode === m && <motion.span layoutId="s1-pill" className="absolute inset-0 -z-10 rounded-full bg-card shadow" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              {m === 'login' ? 'Log in' : 'Sign up'}
            </button>
          ))}
        </div>
        <Swap id={auth.mode}>
          <h3 className="text-2xl font-semibold tracking-tight">{auth.copy.title}</h3>
          <p className="mt-1 mb-6 font-support text-sm text-muted">{auth.copy.sub}</p>
          <div className="space-y-4">
            {rows(auth.fields).map((r) => (
              <div key={r[0].key} className={r.length > 1 ? 'grid grid-cols-2 gap-3' : ''}>
                {r.map((f) => <FilledInput key={f.key} auth={auth} f={f} />)}
              </div>
            ))}
          </div>
        </Swap>
        <button type="submit" className={`mt-6 flex cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-canvas transition-colors ${auth.done ? 'bg-green-400' : 'bg-accent hover:opacity-90'}`}>
          <DoneLabel auth={auth} />
        </button>
        {auth.mode === 'login' && <button type="button" className="mt-4 cursor-pointer self-center font-support text-xs text-muted underline-offset-2 hover:text-ink hover:underline">Forgot your password?</button>}
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------------
   2 · Floating card: a glass card over soft colour, floating labels, an underline switch.
------------------------------------------------------------------------------------------------------ */
function FloatInput({ auth, f }: { auth: Auth; f: FieldDef }) {
  const [show, setShow] = useState(false);
  const err = auth.error(f.key);
  return (
    <div>
      <div className="relative">
        <input
          id={`s2-${f.key}`}
          type={f.type === 'password' && show ? 'text' : f.type}
          autoComplete={f.autoComplete}
          value={auth.values[f.key]}
          placeholder=" "
          onChange={(e) => auth.set(f.key, e.target.value)}
          onBlur={() => auth.touch(f.key)}
          className={`peer w-full rounded-2xl border-2 bg-transparent px-4 pt-6 pb-2 text-sm text-ink outline-none transition-all ${err ? 'border-red-400/70' : 'border-white/15 focus:border-accent focus:shadow-[0_0_0_5px_var(--accent-soft)]'}`}
        />
        <label htmlFor={`s2-${f.key}`} className="pointer-events-none absolute top-2 left-4 text-[11px] font-semibold text-accent transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:text-muted peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-accent">
          {f.label}
        </label>
        {f.type === 'password' && <RevealButton shown={show} onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-4 -translate-y-1/2" />}
      </div>
      <Err text={err} />
    </div>
  );
}

export function FloatingLogin() {
  const auth = useAuthForm();
  return (
    <div className="relative flex min-h-[640px] items-center justify-center overflow-hidden rounded-[28px] border border-line px-4 py-10" style={{ background: 'var(--canvas)' }}>
      <span aria-hidden="true" className="absolute -top-20 -left-16 h-80 w-80 rounded-full opacity-60 blur-3xl" style={{ background: 'color-mix(in srgb, var(--accent) 55%, transparent)' }} />
      <span aria-hidden="true" className="absolute -right-20 -bottom-24 h-96 w-96 rounded-full opacity-40 blur-3xl" style={{ background: '#6c8cff' }} />
      <span aria-hidden="true" className="absolute top-1/3 right-1/4 h-52 w-52 rounded-full opacity-30 blur-3xl" style={{ background: '#b9a2ff' }} />

      <form onSubmit={auth.submit} noValidate className="relative w-full max-w-[420px] rounded-[32px] border border-white/15 bg-white/[0.06] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
        <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} className="mx-auto -mt-16 mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-3xl border border-white/20 bg-card shadow-[0_18px_40px_rgba(0,0,0,0.4)]">
          {logo() && <img src={logo()} alt="" className="h-12 w-12 object-contain" draggable={false} />}
        </motion.div>
        <div role="tablist" className="relative mb-6 flex justify-center gap-8 border-b border-white/10">
          {(['login', 'signup'] as Mode[]).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={auth.mode === m} onClick={() => auth.setMode(m)} className={`relative cursor-pointer pb-3 text-sm transition-colors ${auth.mode === m ? 'font-semibold text-ink' : 'text-muted hover:text-ink'}`}>
              {m === 'login' ? 'Log in' : 'Sign up'}
              {auth.mode === m && <motion.span layoutId="s2-bar" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent" />}
            </button>
          ))}
        </div>
        <Swap id={auth.mode}>
          <div className="space-y-3.5">
            {rows(auth.fields).map((r) => (
              <div key={r[0].key} className={r.length > 1 ? 'grid grid-cols-2 gap-3' : ''}>
                {r.map((f) => <FloatInput key={f.key} auth={auth} f={f} />)}
              </div>
            ))}
          </div>
        </Swap>
        <button type="submit" className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-canvas shadow-[0_12px_30px_color-mix(in_srgb,var(--accent)_40%,transparent)] transition-all hover:brightness-110" style={{ background: auth.done ? '#4ade80' : 'linear-gradient(120deg, var(--accent), color-mix(in srgb, var(--accent) 55%, #6c8cff))' }}>
          <DoneLabel auth={auth} />
        </button>
        <p className="mt-4 text-center font-support text-xs text-muted">
          {auth.copy.switchText}{' '}
          <button type="button" onClick={() => auth.setMode(auth.mode === 'login' ? 'signup' : 'login')} className="cursor-pointer font-semibold text-accent hover:underline">{auth.copy.switchCta}</button>
        </p>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------------
   3 · Steps: sign up is split into two short steps with a progress rail; log in is one.
------------------------------------------------------------------------------------------------------ */
function BoxInput({ auth, f, n }: { auth: Auth; f: FieldDef; n: number }) {
  const [show, setShow] = useState(false);
  const err = auth.error(f.key);
  const ok = auth.values[f.key] && !err && auth.error(f.key) === null;
  return (
    <div>
      <label htmlFor={`s3-${f.key}`} className="mb-1.5 flex items-center gap-2 font-support text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface text-[10px] text-ink">{n}</span>
        {f.label}
      </label>
      <div className={`relative flex overflow-hidden rounded-lg border-2 transition-colors ${err ? 'border-red-400/70' : 'border-line focus-within:border-accent'}`}>
        <span className={`w-1.5 shrink-0 transition-colors ${ok ? 'bg-accent' : 'bg-transparent'}`} />
        <input
          id={`s3-${f.key}`}
          type={f.type === 'password' && show ? 'text' : f.type}
          autoComplete={f.autoComplete}
          value={auth.values[f.key]}
          placeholder={f.placeholder}
          onChange={(e) => auth.set(f.key, e.target.value)}
          onBlur={() => auth.touch(f.key)}
          className="min-w-0 flex-1 bg-transparent px-3.5 py-3.5 text-[15px] text-ink outline-none placeholder:text-muted"
        />
        {f.type === 'password' && <RevealButton shown={show} onClick={() => setShow((s) => !s)} className="w-11" />}
      </div>
      <Err text={err} />
    </div>
  );
}

export function StepsLogin() {
  const auth = useAuthForm();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const signup = auth.mode === 'signup';
  const stepKeys: FieldKey[][] = [['first', 'last', 'email'], ['password', 'confirm']];
  const go = (to: number) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
  };
  const switchMode = (m: Mode) => {
    auth.setMode(m);
    setStep(0);
  };
  const keys = signup ? stepKeys[step] : auth.fields.map((f) => f.key);
  const fieldsNow = auth.fields.filter((f) => keys.includes(f.key));
  const last = !signup || step === 1;
  const stepTitles = ['About you', 'Secure it'];

  return (
    <div className="mx-auto w-full max-w-[520px] rounded-[28px] border border-line bg-card/60 p-6 @3xl:p-9">
      <div className="mb-6 flex items-center justify-between">
        <span className="flex items-center gap-2.5">
          {logo() && <img src={logo()} alt="" className="h-8 w-8 object-contain" draggable={false} />}
          <span className="font-semibold tracking-tight">Wallex</span>
        </span>
        <button type="button" onClick={() => switchMode(signup ? 'login' : 'signup')} className="cursor-pointer font-support text-sm text-muted hover:text-ink">
          {signup ? 'Have an account? ' : 'New here? '}<span className="font-semibold text-accent">{signup ? 'Log in' : 'Sign up'}</span>
        </button>
      </div>

      {signup && (
        <div className="mb-6" role="progressbar" aria-valuemin={1} aria-valuemax={2} aria-valuenow={step + 1} aria-label="Sign up progress">
          <div className="flex items-center gap-3">
            {stepTitles.map((t, i) => (
              <div key={t} className="flex flex-1 items-center gap-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${i < step ? 'border-accent bg-accent text-canvas' : i === step ? 'border-accent text-accent' : 'border-line text-muted'}`}>
                  {i < step ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className={`text-sm ${i === step ? 'font-semibold' : 'text-muted'}`}>{t}</span>
                {i === 0 && <span className="relative h-0.5 flex-1 rounded-full bg-line"><motion.span className="absolute inset-y-0 left-0 rounded-full bg-accent" initial={false} animate={{ width: step > 0 ? '100%' : '0%' }} /></span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!last) {
            auth.touchAll(keys);
            if (auth.valid(keys)) go(1);
          } else auth.submit();
        }}
      >
        <h3 className="text-2xl font-semibold tracking-tight">{signup ? (step === 0 ? 'Tell us who you are' : 'Choose a password') : auth.copy.title}</h3>
        <div className="mt-5 overflow-hidden">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div key={`${auth.mode}-${step}`} initial={{ opacity: 0, x: dir * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -40 }} transition={{ duration: 0.22, ease }} className="space-y-4 p-0.5">
              {rows(fieldsNow).map((r) => (
                <div key={r[0].key} className={r.length > 1 ? 'grid grid-cols-2 gap-3' : ''}>
                  {r.map((f) => <BoxInput key={f.key} auth={auth} f={f} n={auth.fields.findIndex((x) => x.key === f.key) + 1} />)}
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="mt-7 flex items-center gap-3">
          {signup && step === 1 && (
            <button type="button" onClick={() => go(0)} className="cursor-pointer rounded-lg px-4 py-3 text-sm text-muted hover:text-ink">Back</button>
          )}
          <button type="submit" className={`ml-auto flex cursor-pointer items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-canvas ${auth.done ? 'bg-green-400' : 'bg-accent hover:opacity-90'}`}>
            {last ? <DoneLabel auth={auth} /> : (<>Continue <ArrowRight className="h-4 w-4" /></>)}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------------
   4 · Editorial: no card. A huge headline, numbered underline fields, a round arrow to go.
------------------------------------------------------------------------------------------------------ */
function LineInput({ auth, f, n }: { auth: Auth; f: FieldDef; n: number }) {
  const [show, setShow] = useState(false);
  const [on, setOn] = useState(false);
  const err = auth.error(f.key);
  return (
    <div>
      <label htmlFor={`s4-${f.key}`} className="flex items-baseline gap-3">
        <span className="font-support text-[10px] tracking-widest text-muted tabular-nums">{String(n).padStart(2, '0')}</span>
        <span className="font-support text-[11px] font-semibold tracking-[0.22em] text-muted uppercase">{f.label}</span>
      </label>
      <div className="relative flex items-center pl-8">
        <input
          id={`s4-${f.key}`}
          type={f.type === 'password' && show ? 'text' : f.type}
          autoComplete={f.autoComplete}
          value={auth.values[f.key]}
          placeholder={f.placeholder}
          onChange={(e) => auth.set(f.key, e.target.value)}
          onFocus={() => setOn(true)}
          onBlur={() => { setOn(false); auth.touch(f.key); }}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-xl font-medium tracking-tight text-ink outline-none placeholder:text-muted/40"
        />
        {f.type === 'password' && <RevealButton shown={show} onClick={() => setShow((s) => !s)} className="h-8 w-8" />}
      </div>
      <div className="relative ml-8 h-px bg-line">
        <motion.span className={`absolute inset-y-[-1px] left-0 h-[3px] rounded-full ${err ? 'bg-red-400' : 'bg-accent'}`} initial={false} animate={{ width: on || err ? '100%' : '0%' }} transition={{ duration: 0.4, ease }} />
      </div>
      <div className="pl-8"><Err text={err} /></div>
    </div>
  );
}

export function EditorialLogin() {
  const auth = useAuthForm();
  const headline = auth.mode === 'login' ? ['Welcome', 'back.'] : ['Let’s get', 'you set up.'];
  return (
    <div className="relative min-h-[620px] overflow-hidden rounded-[28px] border border-line px-6 py-9 @3xl:px-14 @3xl:py-12" style={{ background: 'linear-gradient(120deg, var(--card), color-mix(in srgb, var(--accent) 8%, var(--canvas)))' }}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2.5 font-support text-xs font-semibold tracking-[0.3em] uppercase">
          {logo() && <img src={logo()} alt="" className="h-7 w-7 object-contain" draggable={false} />}Wallex
        </span>
        <span className="font-support text-xs tracking-[0.2em] text-muted uppercase">{auth.mode === 'login' ? 'Log in' : 'Sign up'}</span>
      </div>
      <form onSubmit={auth.submit} noValidate className="mt-10 grid gap-10 @3xl:grid-cols-[1fr_1.05fr] @3xl:gap-16">
        <div>
          <Swap id={auth.mode}>
            <h3 className="text-[clamp(2.75rem,7cqw,5.5rem)] leading-[0.95] font-semibold tracking-tighter">
              {headline[0]}<br /><span className="text-accent">{headline[1]}</span>
            </h3>
            <p className="mt-5 max-w-xs font-support text-base text-muted">{auth.copy.sub}</p>
          </Swap>
        </div>
        <div className="flex flex-col">
          <Swap id={auth.mode} className="space-y-6">
            {rows(auth.fields).map((r) => (
              <div key={r[0].key} className={r.length > 1 ? 'grid grid-cols-2 gap-6' : ''}>
                {r.map((f) => <LineInput key={f.key} auth={auth} f={f} n={auth.fields.findIndex((x) => x.key === f.key) + 1} />)}
              </div>
            ))}
          </Swap>
          <div className="mt-9 flex items-center justify-between gap-4">
            <button type="button" onClick={() => auth.setMode(auth.mode === 'login' ? 'signup' : 'login')} className="cursor-pointer text-left font-support text-sm text-muted hover:text-ink">
              {auth.copy.switchText} <span className="font-semibold text-ink underline underline-offset-4">{auth.copy.switchCta}</span>
            </button>
            <button type="submit" aria-label={auth.copy.cta} className={`flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-full text-canvas transition-all hover:scale-105 ${auth.done ? 'bg-green-400' : 'bg-accent'}`}>
              {auth.done ? <Check className="h-6 w-6" strokeWidth={3} /> : <ArrowRight className="h-6 w-6" />}
            </button>
          </div>
          {auth.done && <p className="mt-3 text-right font-support text-xs text-muted">{auth.mode === 'login' ? 'Logged in (preview)' : 'Account created (preview)'}</p>}
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------------
   5 · Phone sheet: the brand fills a phone screen and the form rises from the bottom like a sheet.
------------------------------------------------------------------------------------------------------ */
function SheetInput({ auth, f }: { auth: Auth; f: FieldDef }) {
  const [show, setShow] = useState(false);
  const Icon = ICONS[f.key];
  const err = auth.error(f.key);
  return (
    <div>
      <span className={`flex items-center gap-2.5 rounded-2xl bg-surface px-3.5 ring-2 transition-all ${err ? 'ring-red-400/70' : 'ring-transparent focus-within:ring-accent'}`}>
        <Icon className="h-[18px] w-[18px] shrink-0 text-muted" />
        <input
          aria-label={f.label}
          type={f.type === 'password' && show ? 'text' : f.type}
          autoComplete={f.autoComplete}
          value={auth.values[f.key]}
          placeholder={f.label}
          onChange={(e) => auth.set(f.key, e.target.value)}
          onBlur={() => auth.touch(f.key)}
          className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-ink outline-none placeholder:text-muted"
        />
        {f.type === 'password' && <RevealButton shown={show} onClick={() => setShow((s) => !s)} />}
      </span>
      <Err text={err} />
    </div>
  );
}

export function PhoneLogin() {
  const auth = useAuthForm();
  return (
    <div className="flex justify-center rounded-[28px] border border-line py-8" style={{ background: 'radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 60%), var(--card)' }}>
      <div className="relative flex h-[680px] w-[330px] flex-col overflow-hidden rounded-[42px] border-2 border-line bg-canvas shadow-[0_30px_70px_rgba(0,0,0,0.35)]">
        <div className="relative flex flex-1 items-center justify-center" style={{ background: 'radial-gradient(circle at 50% 55%, color-mix(in srgb, var(--accent) 28%, transparent), transparent 62%)' }}>
          {[150, 108].map((s, i) => (
            <motion.span key={s} aria-hidden="true" className="absolute rounded-full border border-accent/40" style={{ width: s, height: s }} animate={{ scale: [1, 1.12, 1], opacity: [0.9, 0.3, 0.9] }} transition={{ duration: 3.2, repeat: Infinity, delay: i * 0.6, ease: 'easeInOut' }} />
          ))}
          <div className="relative flex h-[76px] w-[76px] items-center justify-center rounded-3xl border border-line bg-card shadow-xl">
            {logo() && <img src={logo()} alt="" className="h-12 w-12 object-contain" draggable={false} />}
          </div>
        </div>

        <motion.form layout transition={{ type: 'spring', stiffness: 260, damping: 30 }} onSubmit={auth.submit} noValidate className="rounded-t-[32px] border-t border-line bg-card px-5 pt-3 pb-6 shadow-[0_-18px_50px_rgba(0,0,0,0.3)]">
          <span className="mx-auto mb-4 block h-1.5 w-10 rounded-full bg-line" />
          <div className="mb-4 flex items-center gap-2">
            {(['login', 'signup'] as Mode[]).map((m) => (
              <button key={m} type="button" onClick={() => auth.setMode(m)} className={`cursor-pointer rounded-full px-4 py-1.5 text-sm transition-colors ${auth.mode === m ? 'bg-accent font-semibold text-canvas' : 'text-muted hover:text-ink'}`}>
                {m === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>
          <Swap id={auth.mode} className="space-y-2.5">
            {rows(auth.fields).map((r) => (
              <div key={r[0].key} className={r.length > 1 ? 'grid grid-cols-2 gap-2.5' : ''}>
                {r.map((f) => <SheetInput key={f.key} auth={auth} f={f} />)}
              </div>
            ))}
          </Swap>
          <button type="submit" className={`mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-canvas ${auth.done ? 'bg-green-400' : 'bg-accent'}`}>
            <DoneLabel auth={auth} />
          </button>
          {auth.mode === 'login' && <button type="button" className="mt-3 block w-full cursor-pointer text-center font-support text-xs text-muted hover:text-ink">Forgot password?</button>}
        </motion.form>
      </div>
    </div>
  );
}
