import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Loader2, Mail, X } from 'lucide-react';
import { asset } from '../../assets';
import type { PlumpName } from '../PlumpIcon';
import BrandStage from './BrandStage';
import UnderlineField from '../UnderlineField';
import ViewToggle from '../ViewToggle';
import { useMobileView } from '../../lib/viewState';
import { clearOnboardingPending, markOnboardingPending } from '../../lib/onboarding';
import { RevealButton } from './shared';
import {
  cancelRecovery,
  clearNotice,
  finishRecovery,
  resendVerification,
  sendPasswordReset,
  signIn,
  signUp,
  useAuth,
} from '../../lib/auth';

// The screen people see until they are signed in: a brand panel beside the form. The form is Log in, Sign up, and
// the steps around them: verifying an email, forgetting a password and choosing a new one.

type Step = 'login' | 'signup' | 'verify' | 'forgot' | 'forgot-sent' | 'newpassword';
type Key = 'first' | 'last' | 'email' | 'password' | 'confirm';

const ease = [0.22, 1, 0.36, 1] as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Pressing a button that leaves the form must not first blur the field you were in, or that field is checked (and its
// error shown) a moment before the screen changes.
const keepFocus = { onMouseDown: (e: React.MouseEvent) => e.preventDefault() };
const COOLDOWN_S = 60; // Supabase allows one email a minute to the same address

const FIELD: Record<Key, { label: string; icon: PlumpName; placeholder: string; type: 'text' | 'email' | 'password'; auto: string }> = {
  first: { label: 'First name', icon: 'user-face-male', placeholder: 'Ada', type: 'text', auto: 'given-name' },
  last: { label: 'Last name', icon: 'user-face-male', placeholder: 'Lovelace', type: 'text', auto: 'family-name' },
  email: { label: 'Email', icon: 'mail-send', placeholder: 'you@example.com', type: 'email', auto: 'email' },
  password: { label: 'Password', icon: 'padlock-key', placeholder: 'At least 8 characters', type: 'password', auto: 'new-password' },
  confirm: { label: 'Confirm password', icon: 'padlock-key', placeholder: 'Type it again', type: 'password', auto: 'new-password' },
};

const COPY: Record<Step, { title: string; sub: string }> = {
  login: { title: 'Welcome back', sub: 'Log in to see where your money stands.' },
  signup: { title: 'Create your account', sub: 'It takes a minute. Your bank comes next.' },
  verify: { title: 'Check your email', sub: '' },
  forgot: { title: 'Reset your password', sub: 'Enter your email and we will send you a link to choose a new one.' },
  'forgot-sent': { title: 'Check your email', sub: '' },
  newpassword: { title: 'Choose a new password', sub: 'Use at least 8 characters. You will be signed in once it is saved.' },
};

const FIELDS_FOR: Record<Step, Key[]> = {
  login: ['email', 'password'],
  signup: ['first', 'last', 'email', 'password', 'confirm'],
  verify: [],
  forgot: ['email'],
  'forgot-sent': [],
  newpassword: ['password', 'confirm'],
};


export default function AuthScreen() {
  const auth = useAuth();
  const mobile = useMobileView();
  const [stepState, setStep] = useState<Step>('login');
  // Opening a reset link takes over the screen, whatever step it was on.
  const step: Step = auth.recovering ? 'newpassword' : stepState;

  const [values, setValues] = useState<Record<Key, string>>({ first: '', last: '', email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState<Partial<Record<Key, boolean>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [exists, setExists] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [cooldownEnd, setCooldownEnd] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (cooldownEnd <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [cooldownEnd]);
  const wait = Math.max(0, Math.ceil((cooldownEnd - now) / 1000));
  const startCooldown = () => {
    setNow(Date.now());
    setCooldownEnd(Date.now() + COOLDOWN_S * 1000);
  };

  const errorFor = (k: Key): string | null => {
    const v = values[k].trim();
    if (k === 'first') return v ? null : 'Enter your first name';
    if (k === 'last') return v ? null : 'Enter your last name';
    if (k === 'email') return EMAIL.test(v) ? null : 'Enter an email like name@example.com';
    if (k === 'password') {
      if (step === 'login') return values.password ? null : 'Enter your password';
      return values.password.length >= 8 ? null : 'Use at least 8 characters';
    }
    return values.confirm && values.confirm === values.password ? null : 'The passwords do not match';
  };
  const shown = (k: Key) => (touched[k] ? errorFor(k) : null);
  const keys = FIELDS_FOR[step];

  const go = (next: Step) => {
    setStep(next);
    setTouched({});
    setError(null);
    setInfo(null);
    setExists(false);
    setShowPw(false);
    clearNotice();
  };
  const set = (k: Key, v: string) => {
    setValues((c) => ({ ...c, [k]: v }));
    if (error) setError(null);
    if (exists) setExists(false);
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    setTouched(Object.fromEntries(keys.map((k) => [k, true])));
    if (!keys.every((k) => errorFor(k) === null)) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    clearNotice();

    if (step === 'login') {
      const r = await signIn(values.email, values.password);
      if (!r.ok) {
        if (r.unverified) {
          go('verify');
          setInfo('This email has not been verified yet. Open the link we sent, or ask for a new one.');
        } else setError(r.error);
      }
    } else if (step === 'signup') {
      markOnboardingPending(values.email);
      const r = await signUp({ firstName: values.first, lastName: values.last, email: values.email, password: values.password });
      if (!r.ok) {
        clearOnboardingPending(values.email);
        setError(r.error);
      }
      else if (r.next === 'exists') {
        clearOnboardingPending(values.email);
        setExists(true);
        setError('An account with this email already exists.');
      } else if (r.next === 'verify') {
        go('verify');
        startCooldown();
      }
    } else if (step === 'forgot') {
      const r = await sendPasswordReset(values.email);
      if (!r.ok) setError(r.error);
      else {
        go('forgot-sent');
        startCooldown();
      }
    } else if (step === 'newpassword') {
      const r = await finishRecovery(values.password);
      if (!r.ok) setError(r.error);
    }
    setBusy(false);
  };

  // On the "check your email" step.
  const continueAfterVerify = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    const r = await signIn(values.email, values.password);
    if (!r.ok) setError(r.unverified ? 'Not verified yet. Open the link in your email first, then try again.' : r.error);
    setBusy(false);
  };
  const resend = async () => {
    if (busy || wait > 0) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    const r = step === 'forgot-sent' ? await sendPasswordReset(values.email) : await resendVerification(values.email);
    if (!r.ok) setError(r.error);
    else {
      setInfo('Sent. It can take a minute to arrive.');
      startCooldown();
    }
    setBusy(false);
  };

  const field = (k: Key) => {
    const f = FIELD[k];
    const isPw = f.type === 'password';
    return (
      <UnderlineField
        key={k}
        label={f.label}
        icon={f.icon}
        type={isPw && showPw ? 'text' : f.type}
        autoComplete={k === 'password' && step === 'login' ? 'current-password' : f.auto}
        value={values[k]}
        placeholder={k === 'password' && step === 'login' ? 'Your password' : f.placeholder}
        onChange={(e) => set(k, e.target.value)}
        onBlur={() => values[k] && setTouched((c) => ({ ...c, [k]: true }))}
        error={shown(k)}
        autoFocus={k === keys[0]}
        trailing={isPw ? <RevealButton shown={showPw} onClick={() => setShowPw((s) => !s)} className="h-8 w-8 shrink-0" /> : undefined}
      />
    );
  };

  const cta: Record<Step, string> = {
    login: 'Log in',
    signup: 'Create account',
    verify: '',
    forgot: 'Send reset link',
    'forgot-sent': '',
    newpassword: 'Save password',
  };
  const busyText: Record<Step, string> = {
    login: 'Logging in…',
    signup: 'Creating account…',
    verify: '',
    forgot: 'Sending…',
    'forgot-sent': '',
    newpassword: 'Saving…',
  };

  const logo = asset('logos/logo2.png');
  const showSwitch = step === 'login' || step === 'signup';
  const sentTo = <span className="font-semibold text-ink">{values.email.trim()}</span>;

  return (
    // In the phone view the screen sits in a phone-sized frame, which is also what the layout measures itself against.
    <div className={`h-screen w-screen ${mobile ? 'flex items-center justify-center bg-[var(--backdrop)]' : ''}`}>
    <div
      className={`@container relative overflow-hidden bg-canvas text-ink select-none ${
        mobile ? 'w-[390px] rounded-[44px] border border-line shadow-[0_30px_90px_rgba(0,0,0,0.7)]' : 'h-screen w-screen'
      }`}
      style={mobile ? { height: 'min(844px, calc(100vh - 3rem))' } : undefined}
    >
      <div className="grid h-full @3xl:grid-cols-[1fr_1.1fr]">
        {/* Brand panel: always dark with light text, so it reads the same in the light and dark theme and with any accent. */}
        <div
          className="relative hidden flex-col justify-between overflow-hidden p-12 text-white @3xl:flex"
          style={{ background: 'linear-gradient(155deg, color-mix(in srgb, var(--accent) 58%, #04100d), color-mix(in srgb, var(--accent) 20%, #04100d))' }}
        >
          <span aria-hidden="true" className="absolute -right-28 -bottom-28 h-[26rem] w-[26rem] rounded-full bg-white/[0.06]" />
          <span aria-hidden="true" className="absolute -top-20 -right-12 h-60 w-60 rounded-full bg-white/[0.06]" />
          <div className="relative flex items-center gap-3">
            {logo && <img src={logo} alt="" className="h-10 w-10 object-contain" draggable={false} />}
            <span className="text-lg font-semibold tracking-tight">Wallex</span>
          </div>
          <div className="relative">
            <h1 className="text-[2.9rem] leading-[1.1] font-semibold tracking-[-0.02em] normal-case">
              It&rsquo;s your money.{' '}
              <span style={{ color: 'color-mix(in srgb, var(--accent) 40%, white)' }}>You should know what&rsquo;s happening with it.</span>
            </h1>
            <span aria-hidden="true" className="mt-8 block h-1 w-14 rounded-full" style={{ background: 'color-mix(in srgb, var(--accent) 40%, white)' }} />
            <div className="mt-8"><BrandStage /></div>
          </div>
        </div>

        {/* Form */}
        <div className="flex min-h-0 flex-col overflow-y-auto bg-card/60 px-6 py-10 @3xl:px-14">
          <div className="m-auto w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 @3xl:hidden">
              {logo && <img src={logo} alt="" className="h-9 w-9 object-contain" draggable={false} />}
              <span className="text-lg font-semibold tracking-tight">Wallex</span>
            </div>

            {showSwitch && (
              <div role="tablist" className="relative mb-8 flex rounded-full bg-surface p-1">
                {(['login', 'signup'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={step === m}
                    {...keepFocus} onClick={() => go(m)}
                    className={`relative z-10 flex-1 cursor-pointer rounded-full py-2 text-sm capitalize transition-colors ${step === m ? 'font-semibold text-ink' : 'text-muted'}`}
                  >
                    {step === m && <motion.span layoutId="auth-pill" className="absolute inset-0 -z-10 rounded-full bg-card shadow" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                    {m === 'login' ? 'Log in' : 'Sign up'}
                  </button>
                ))}
              </div>
            )}

            {/* As tall as the sign-up form, so switching between Log in and Sign up does not resize the group or move the switch. */}
            <div className="min-h-[28.5rem]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease }}
              >
                {(step === 'forgot' || step === 'forgot-sent') && (
                  <button type="button" {...keepFocus} onClick={() => go('login')} className="mb-5 flex cursor-pointer items-center gap-1.5 font-support text-sm text-muted transition-colors hover:text-ink">
                    <ArrowLeft className="h-4 w-4" />
                    Back to log in
                  </button>
                )}

                {auth.notice && (
                  <div role="status" className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 font-support text-sm ${auth.notice.kind === 'error' ? 'border-red-400/40 bg-red-400/10 text-red-200' : 'border-accent/40 bg-accent-soft'}`}>
                    <span className="flex-1">{auth.notice.text}</span>
                    <button type="button" aria-label="Dismiss" onClick={clearNotice} className="cursor-pointer opacity-70 hover:opacity-100">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {(step === 'verify' || step === 'forgot-sent') && (
                  <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <Mail className="h-7 w-7" />
                  </span>
                )}
                <h2 className="text-3xl font-semibold tracking-tight capitalize">{COPY[step].title}</h2>

                {step === 'verify' && (
                  <p className="mt-2 mb-6 font-support text-sm leading-relaxed text-muted">
                    We sent a confirmation link to {sentTo}. Open it to verify your email, then come back here. Check your spam folder if it does not show up.
                  </p>
                )}
                {step === 'forgot-sent' && (
                  <p className="mt-2 mb-6 font-support text-sm leading-relaxed text-muted">
                    If an account exists for {sentTo}, a link to reset the password is on its way. Open it, then come back here to choose a new one.
                  </p>
                )}
                {COPY[step].sub && <p className="mt-2 mb-7 font-support text-sm text-muted">{COPY[step].sub}</p>}

                {keys.length > 0 && (
                  <form onSubmit={submit} noValidate className="space-y-5">
                    {step === 'signup' ? (
                      <>
                        <div className="grid grid-cols-2 gap-x-5">
                          {field('first')}
                          {field('last')}
                        </div>
                        {field('email')}
                        {field('password')}
                        {field('confirm')}
                      </>
                    ) : (
                      keys.map(field)
                    )}

                    {error && (
                      <p role="alert" className="font-support text-sm text-red-300">
                        {error}{' '}
                        {exists && (
                          <button type="button" {...keepFocus} onClick={() => go('login')} className="cursor-pointer underline underline-offset-2 hover:text-red-200">
                            Log in instead
                          </button>
                        )}
                      </p>
                    )}

                    <button type="submit" disabled={busy} className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-canvas capitalize transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-60">
                      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                      {busy ? busyText[step] : cta[step]}
                    </button>

                    {step === 'login' && (
                      <button type="button" {...keepFocus} onClick={() => go('forgot')} className="block cursor-pointer font-support text-xs text-muted underline-offset-2 transition-colors hover:text-ink hover:underline">
                        Forgot your password?
                      </button>
                    )}
                    {step === 'newpassword' && (
                      <button type="button" {...keepFocus} onClick={() => void cancelRecovery()} className="block cursor-pointer font-support text-xs text-muted underline-offset-2 transition-colors hover:text-ink hover:underline">
                        Cancel
                      </button>
                    )}
                  </form>
                )}

                {step === 'verify' && (
                  <div className="space-y-3">
                    {error && <p role="alert" className="font-support text-sm text-red-300">{error}</p>}
                    {info && <p role="status" className="font-support text-sm text-muted">{info}</p>}
                    <button type="button" onClick={continueAfterVerify} disabled={busy || !values.password} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-canvas capitalize transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-60">
                      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                      I have verified my email
                    </button>
                    <div className="flex flex-wrap items-center justify-between gap-3 font-support text-sm">
                      <button type="button" onClick={resend} disabled={busy || wait > 0} className="cursor-pointer text-muted underline-offset-2 transition-colors hover:text-ink hover:underline disabled:cursor-default disabled:no-underline disabled:opacity-60">
                        {wait > 0 ? `Resend email in ${wait}s` : 'Resend email'}
                      </button>
                      <button type="button" {...keepFocus} onClick={() => go('signup')} className="cursor-pointer text-muted underline-offset-2 transition-colors hover:text-ink hover:underline">
                        Use a different email
                      </button>
                    </div>
                  </div>
                )}

                {step === 'forgot-sent' && (
                  <div className="space-y-3">
                    {error && <p role="alert" className="font-support text-sm text-red-300">{error}</p>}
                    {info && <p role="status" className="font-support text-sm text-muted">{info}</p>}
                    <button type="button" onClick={resend} disabled={busy || wait > 0} className="cursor-pointer font-support text-sm text-muted underline-offset-2 transition-colors hover:text-ink hover:underline disabled:cursor-default disabled:no-underline disabled:opacity-60">
                      {wait > 0 ? `Send again in ${wait}s` : 'Send the link again'}
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
    <ViewToggle />
    </div>
  );
}
