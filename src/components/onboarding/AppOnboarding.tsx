import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  Landmark,
  Loader2,
  Palette,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { asset } from '../../assets';
import { ACCENTS, TEXT_SIZES, setAppearance, useAppearance, type TextSize, type Theme } from '../../lib/appearance';
import { BANKS } from '../../lib/banks';
import { photoFromFile, saveProfile, useProfile, type Profile } from '../../lib/profile';
import { wallex, type Status } from '../../lib/wallex';
import { useMobileView } from '../../lib/viewState';
import { syncUserSettings } from '../../lib/cloud';
import PhotoDropZone from '../PhotoDropZone';
import UnderlineField from '../UnderlineField';
import ViewToggle from '../ViewToggle';

type Step = 0 | 1 | 2;

const ease = [0.22, 1, 0.36, 1] as const;
const PHONE = /^[+()\-.\s\d]{7,20}$/;
const stepNames = ['Your Profile', 'Connect Your Accounts', 'Personalize Wallex'];
const primary =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-canvas transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35';
const secondary =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-surface px-5 py-3 text-sm font-semibold transition-colors hover:border-muted';

function Footer({
  back,
  next,
  nextLabel = 'Continue',
  disabled,
  busy,
}: {
  back?: () => void;
  next: () => void;
  nextLabel?: string;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
      {back ? (
        <button type="button" onClick={back} className={secondary}>
          <ArrowLeft className="h-4 w-4" />
          Previous
        </button>
      ) : (
        <span />
      )}
      <button type="button" onClick={next} disabled={disabled || busy} className={primary}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {nextLabel}
        {!busy && nextLabel === 'Continue' && <ArrowRight className="h-4 w-4" />}
        {!busy && nextLabel === 'Launch Wallex' && <Sparkles className="h-4 w-4" />}
      </button>
    </div>
  );
}

function ProfileStep({
  draft,
  setDraft,
  onContinue,
}: {
  draft: Profile;
  setDraft: React.Dispatch<React.SetStateAction<Profile>>;
  onContinue: () => void;
}) {
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => setDraft((p) => ({ ...p, [key]: value }));
  const errors = {
    firstName: draft.firstName.trim() ? null : 'Enter your first name',
    lastName: draft.lastName.trim() ? null : 'Enter your last name',
    preferredName: draft.preferredName.trim() ? null : 'Enter the name Wallex should use',
    phone: !draft.phone.trim() || PHONE.test(draft.phone.trim()) ? null : 'Use digits, spaces, + ( ) or -',
  };
  const valid = Object.values(errors).every((error) => error === null);
  const shown = (key: keyof typeof errors) => (touched[key] ? errors[key] : null);
  const touch = (key: keyof typeof errors) => setTouched((current) => ({ ...current, [key]: true }));

  const pick = async (file: File) => {
    setPhotoError(null);
    try {
      set('photo', await photoFromFile(file));
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'Could not use that picture');
    }
  };

  return (
    <div>
      <div className="mb-7">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">Your Profile</h1>
        <p className="mt-2 max-w-2xl font-support text-sm text-muted">Tell Wallex what to call you. Your profile stays on this device.</p>
      </div>

      <div className="grid gap-7 @3xl:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.5fr)]">
        <div>
          <p className="mb-2 font-support text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">Profile Image (Optional)</p>
          <PhotoDropZone photo={draft.photo} error={photoError} onFile={pick} onRemove={() => set('photo', null)} />
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-6 @xl:grid-cols-2">
          <UnderlineField
            label="First Name"
            icon="user-face-male"
            value={draft.firstName}
            autoComplete="given-name"
            onChange={(event) => set('firstName', event.target.value)}
            onBlur={() => touch('firstName')}
            placeholder="Ada"
            error={shown('firstName')}
          />
          <UnderlineField
            label="Last Name"
            icon="user-face-male"
            value={draft.lastName}
            autoComplete="family-name"
            onChange={(event) => set('lastName', event.target.value)}
            onBlur={() => touch('lastName')}
            placeholder="Lovelace"
            error={shown('lastName')}
          />
          <UnderlineField
            label="Preferred Name"
            icon="chat-bubble-text-square"
            value={draft.preferredName}
            onChange={(event) => set('preferredName', event.target.value)}
            onBlur={() => touch('preferredName')}
            placeholder="Ada"
            hint={!shown('preferredName') ? 'The name Wallex uses throughout the app.' : undefined}
            error={shown('preferredName')}
          />
          <UnderlineField
            label="Phone Number (Optional)"
            icon="phone"
            type="tel"
            value={draft.phone}
            autoComplete="tel"
            onChange={(event) => set('phone', event.target.value)}
            onBlur={() => touch('phone')}
            placeholder="+1 555 123 4567"
            error={shown('phone')}
          />
        </div>
      </div>

      <Footer next={onContinue} disabled={!valid} />
    </div>
  );
}

function ConnectStep({ back, onContinue }: { back: () => void; onContinue: () => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [bankId, setBankId] = useState(BANKS[0].id);
  const [linked, setLinked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    wallex.getStatus().then((result) => {
      if (!current) return;
      setLoading(false);
      if (!result.ok) return setMessage({ kind: 'error', text: result.error });
      setStatus(result.data);
      setBankId(BANKS.some((bank) => bank.id === result.data.bankId) ? result.data.bankId : BANKS[0].id);
      setLinked(result.data.connections.map((connection) => connection.institutionName).filter(Boolean));
    });
    return () => {
      current = false;
    };
  }, []);

  const bank = BANKS.find((candidate) => candidate.id === bankId) ?? BANKS[0];
  const configured = Boolean(status?.clientId.trim() && status.hasSecret && status.products.length && status.countries.length);

  const connect = async () => {
    if (!status || !configured || busy) return;
    setBusy(true);
    setSuccess(null);
    setMessage(status.environment === 'sandbox' ? null : { kind: 'info', text: 'Plaid Link opened in a secure window. Finish signing in there.' });
    const result = await wallex.connect({
      settings: {
        environment: status.environment,
        clientId: status.clientId,
        secret: '',
        products: status.products,
        countries: status.countries,
        language: status.language,
        webhookUrl: status.webhookUrl,
        redirectUri: status.redirectUri,
      },
      bank,
    });
    setBusy(false);
    if (!result.ok) return setMessage({ kind: 'error', text: result.error });
    if (!result.data.connected) return setMessage({ kind: 'info', text: 'Connection cancelled. Nothing was changed.' });
    const name = result.data.institutionName ?? bank.name;
    setLinked((list) => (list.includes(name) ? list : [...list, name]));
    setSuccess(name);
    setMessage(null);
  };

  return (
    <div>
      <div className="mb-7">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Landmark className="h-6 w-6" />
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">Connect Your Accounts</h1>
        <p className="mt-2 max-w-2xl font-support text-sm text-muted">Link one or more financial institutions securely through Plaid. Wallex receives read-only balances and transactions.</p>
      </div>

      <div className="grid gap-5 @3xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-line bg-surface/50 p-5">
          <label htmlFor="onboarding-bank" className="font-support text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">Financial Institution</label>
          <select
            id="onboarding-bank"
            value={bankId}
            onChange={(event) => setBankId(event.target.value)}
            className="mt-2 w-full rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          >
            {BANKS.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
          <button type="button" onClick={connect} disabled={loading || !configured || busy} className={`${primary} mt-4 w-full`}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Landmark className="h-4 w-4" />}
            {busy ? 'Opening Plaid…' : linked.length ? 'Link Another Account' : 'Link Account With Plaid'}
          </button>
          {!loading && !configured && (
            <p className="mt-3 font-support text-xs text-amber-300">Plaid must be configured before an account can be linked. Add the application credentials in Settings → Setup.</p>
          )}
          {message && <p role={message.kind === 'error' ? 'alert' : 'status'} className={`mt-3 font-support text-xs ${message.kind === 'error' ? 'text-red-300' : 'text-muted'}`}>{message.text}</p>}
        </section>

        <section className="rounded-2xl border border-line bg-card p-5">
          <p className="text-sm font-semibold">Connected Accounts</p>
          <div className="mt-4 space-y-2">
            {linked.length ? linked.map((name) => (
              <div key={name} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent"><Check className="h-4 w-4" /></span>
                <span className="text-sm font-medium">{name}</span>
                <span className="ml-auto font-support text-xs text-accent">Linked</span>
              </div>
            )) : <p className="font-support text-sm text-muted">No accounts linked yet.</p>}
          </div>
          <div className="mt-5 flex items-start gap-3 border-t border-line pt-4 font-support text-xs text-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            Plaid handles your credentials. Wallex cannot move money or make changes to your accounts.
          </div>
        </section>
      </div>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 25 }}
            className="mt-5 flex items-center gap-3 rounded-2xl border border-accent/35 bg-accent-soft px-4 py-3"
          >
            <motion.span initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.08, type: 'spring' }}>
              <CheckCircle2 className="h-6 w-6 text-accent" />
            </motion.span>
            <span><span className="font-semibold">{success} connected.</span> <span className="font-support text-sm text-muted">Your accounts are ready for Wallex.</span></span>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer back={back} next={onContinue} disabled={linked.length === 0} />
    </div>
  );
}

const themes: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function Toggle({ label, detail, on, onChange }: { label: string; detail: string; on: boolean; onChange: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onChange} className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-3 text-left">
      <span><span className="block text-sm font-medium">{label}</span><span className="mt-0.5 block font-support text-xs text-muted">{detail}</span></span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-line'}`}>
        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  );
}

function PersonalizeStep({ back, onLaunch, launching }: { back: () => void; onLaunch: (notifications: Record<string, unknown>) => void; launching: boolean }) {
  const appearance = useAppearance();
  const [weeklySummary, setWeeklySummary] = useState(true);
  const [billReminders, setBillReminders] = useState(true);
  const [lowBalance, setLowBalance] = useState(true);
  const [threshold, setThreshold] = useState('500');

  const launch = () => onLaunch({ weeklySummary, billReminders, lowBalance, lowBalanceThreshold: Number(threshold) || 0 });

  return (
    <div>
      <div className="mb-7">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Palette className="h-6 w-6" />
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">Personalize Wallex</h1>
        <p className="mt-2 max-w-2xl font-support text-sm text-muted">Start with our recommended settings or make Wallex feel like yours before you launch.</p>
      </div>

      <div className="grid gap-5 @3xl:grid-cols-2">
        <section className="space-y-5 rounded-2xl border border-line bg-card p-5">
          <div className="flex items-center gap-2"><Palette className="h-4 w-4 text-accent" /><h2 className="text-base font-semibold">Appearance</h2></div>
          <div>
            <p className="mb-2 font-support text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">Theme</p>
            <div className="grid grid-cols-3 gap-2">
              {themes.map((theme) => {
                const selected = appearance.theme === theme.value;
                return <button key={theme.value} type="button" onClick={() => setAppearance({ theme: theme.value })} className={`rounded-xl border px-3 py-3 text-sm transition-colors ${selected ? 'border-accent bg-accent-soft font-semibold' : 'border-line bg-surface text-muted hover:text-ink'}`}>{theme.label}</button>;
              })}
            </div>
          </div>
          <div>
            <p className="mb-2 font-support text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">Accent Color</p>
            <div className="flex flex-wrap gap-2">
              {ACCENTS.map((accent) => {
                const selected = appearance.accent === accent.id;
                return (
                  <button key={accent.id} type="button" aria-label={accent.name} title={accent.name} onClick={() => setAppearance({ accent: accent.id })} className={`flex h-9 w-9 items-center justify-center rounded-full border transition-transform hover:scale-105 ${selected ? 'border-ink' : 'border-line'}`}>
                    <span className="h-5 w-5 rounded-full" style={{ background: accent.color }} />
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-2 font-support text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">Text Size</p>
            <div className="grid grid-cols-3 gap-2">
              {TEXT_SIZES.map((size) => {
                const selected = appearance.textSize === size.value;
                return <button key={size.value} type="button" onClick={() => setAppearance({ textSize: size.value as TextSize })} className={`rounded-xl border px-3 py-2 text-sm transition-colors ${selected ? 'border-accent bg-accent-soft font-semibold' : 'border-line bg-surface text-muted hover:text-ink'}`}>{size.label}</button>;
              })}
            </div>
          </div>
          <Toggle label="Reduce Motion" detail="Turn off interface animations." on={appearance.reduceMotion} onChange={() => setAppearance({ reduceMotion: !appearance.reduceMotion })} />
        </section>

        <section className="space-y-3 rounded-2xl border border-line bg-card p-5">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-400/15 text-violet-300"><Bell className="h-4 w-4" /></span>
            <span><h2 className="text-base font-semibold">Notifications</h2><p className="mt-0.5 font-support text-xs text-muted">Preferences are saved now. Delivery will become available in a future update.</p></span>
          </div>
          <Toggle label="Weekly Summary" detail="A weekly snapshot of cash flow and spending." on={weeklySummary} onChange={() => setWeeklySummary((value) => !value)} />
          <Toggle label="Bill Reminders" detail="A reminder before recurring payments are due." on={billReminders} onChange={() => setBillReminders((value) => !value)} />
          <Toggle label="Low-Balance Alert" detail="Warn when available cash falls below your threshold." on={lowBalance} onChange={() => setLowBalance((value) => !value)} />
          <label className={`block rounded-xl border border-line bg-surface px-4 py-3 transition-opacity ${lowBalance ? '' : 'opacity-45'}`}>
            <span className="font-support text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">Alert Below</span>
            <span className="mt-1 flex items-center gap-2"><span className="text-accent">$</span><input type="number" min="0" disabled={!lowBalance} value={threshold} onChange={(event) => setThreshold(event.target.value)} className="min-w-0 flex-1 bg-transparent text-base outline-none select-text" /></span>
          </label>
        </section>
      </div>

      <Footer back={back} next={launch} nextLabel="Launch Wallex" busy={launching} />
    </div>
  );
}

export default function AppOnboarding({ email, onComplete }: { email: string; onComplete: () => void }) {
  const mobile = useMobileView();
  const saved = useProfile();
  const [draft, setDraft] = useState<Profile>({ ...saved, email });
  const [step, setStep] = useState<Step>(0);
  const [direction, setDirection] = useState(1);
  const [launching, setLaunching] = useState(false);
  const logo = asset('logos/logo2.png');

  const go = (next: Step) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };
  const finishProfile = () => {
    saveProfile({
      ...draft,
      email,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      preferredName: draft.preferredName.trim(),
      phone: draft.phone.trim(),
    });
    go(1);
  };
  const launch = (notifications: Record<string, unknown>) => {
    try {
      localStorage.setItem('wallex-notification-preferences', JSON.stringify(notifications));
    } catch {
      // Preferences remain selected for this launch if local storage is unavailable.
    }
    void syncUserSettings({ notification_preferences: notifications });
    setLaunching(true);
    window.setTimeout(onComplete, 420);
  };

  return (
    <div className={`h-screen w-screen ${mobile ? 'flex items-center justify-center bg-[var(--backdrop)]' : ''}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.99 }}
        animate={launching ? { opacity: 0, scale: 0.985 } : { opacity: 1, scale: 1 }}
        transition={{ duration: launching ? 0.4 : 0.5, ease }}
        className={`@container relative overflow-hidden bg-canvas text-ink select-none ${mobile ? 'h-[min(844px,calc(100vh-3rem))] w-[390px] rounded-[44px] border border-line shadow-[0_30px_90px_rgba(0,0,0,0.7)]' : 'h-screen w-screen'}`}
      >
        <div className="absolute inset-x-0 top-0 z-10 h-10" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
        <div className="flex h-full flex-col">
          <header className="border-b border-line px-5 pt-10 pb-4 @3xl:px-10">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
              <div className="flex items-center gap-3">{logo && <img src={logo} alt="" draggable={false} className="h-9 w-9 object-contain" />}<span className="text-lg font-semibold">Wallex</span></div>
              <div className="hidden flex-1 items-center justify-end gap-2 @2xl:flex">
                {stepNames.map((name, index) => (
                  <div key={name} className="flex items-center gap-2">
                    {index > 0 && <span className={`h-px w-8 ${index <= step ? 'bg-accent' : 'bg-line'}`} />}
                    <span className={`flex items-center gap-2 font-support text-xs ${index === step ? 'text-ink' : index < step ? 'text-accent' : 'text-muted'}`}>
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${index <= step ? 'border-accent bg-accent-soft' : 'border-line'}`}>{index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}</span>
                      {name}
                    </span>
                  </div>
                ))}
              </div>
              <span className="font-support text-xs text-muted @2xl:hidden">Step {step + 1} of 3</span>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-5 py-6 @3xl:px-10 @3xl:py-8">
            <div className="mx-auto max-w-5xl">
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                <motion.div
                  key={step}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 42 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -32 }}
                  transition={{ duration: 0.28, ease }}
                >
                  {step === 0 ? (
                    <ProfileStep draft={draft} setDraft={setDraft} onContinue={finishProfile} />
                  ) : step === 1 ? (
                    <ConnectStep back={() => go(0)} onContinue={() => go(2)} />
                  ) : (
                    <PersonalizeStep back={() => go(1)} onLaunch={launch} launching={launching} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </motion.div>
      <ViewToggle />
    </div>
  );
}
