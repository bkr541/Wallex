import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Camera, Check, Download, LogOut, RefreshCw, Trash2 } from 'lucide-react';
import PlumpIcon, { type PlumpName } from '../components/PlumpIcon';
import SectionTitle from '../components/SectionTitle';
import { fullName, initials, photoFromFile, saveProfile, useProfile, type Profile } from '../lib/profile';
import { wallex } from '../lib/wallex';

const inputClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-accent';

function Field({ label, icon, hint, error, children }: { label: string; icon: PlumpName; hint?: string; error?: string | null; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-sm font-medium">
        <PlumpIcon name={icon} className="h-5 w-5 shrink-0 text-muted" />
        {label}
      </span>
      {children}
      {(error || hint) && <span className={`mt-1.5 block font-support text-xs ${error ? 'text-red-300' : 'text-muted'}`}>{error ?? hint}</span>}
    </label>
  );
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+()\-.\s\d]{7,20}$/;

const outlineBtn =
  'flex cursor-pointer items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold transition-colors hover:border-muted disabled:cursor-not-allowed disabled:opacity-40';
const dangerBtn =
  'flex cursor-pointer items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-red-400/60 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40';

// Sign-in isn't connected yet, so the buttons that need it say so instead of pretending to work.
const NOT_CONNECTED = "Sign-in isn't connected yet, so nothing was changed.";

function useNotice() {
  const [text, setText] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const flash = (t: string) => {
    setText(t);
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setText(null), 4000);
  };
  return [text, flash] as const;
}

const Notice = ({ text }: { text: string | null }) =>
  text ? <span role="status" className="font-support text-sm text-muted">{text}</span> : null;

// One line of an account group: what it is and its current value at the left, the action at the right.
function InfoRow({ title, value, children }: { title: string; value?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {value && <p className="truncate font-support text-sm text-muted">{value}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

// Folds open under a row, so changing an email or password doesn't need a page of its own.
function Fold({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="pt-4">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Avatar({ p, className }: { p: Profile; className: string }) {
  const letters = initials(p);
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-canvas ${className}`}
      style={p.photo ? undefined : { background: 'linear-gradient(150deg, color-mix(in srgb, var(--accent) 80%, white), color-mix(in srgb, var(--accent) 55%, black))' }}
    >
      {p.photo ? <img src={p.photo} alt="" className="h-full w-full object-cover" draggable={false} /> : letters || <PlumpIcon name="user-face-male" className="h-1/2 w-1/2" />}
    </span>
  );
}


function LogOutButton() {
  const [notice, flash] = useNotice();
  return (
    <div className="flex flex-col items-start gap-2 @3xl:items-end">
      <button type="button" onClick={() => flash(NOT_CONNECTED)} className={outlineBtn}>
        <LogOut className="h-4 w-4" />
        Log out
      </button>
      <Notice text={notice} />
    </div>
  );
}

function SignIn() {
  const profile = useProfile();
  const email = profile.email;
  const [editing, setEditing] = useState<'email' | 'password' | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [pw, setPw] = useState({ current: '', next: '', again: '' });
  const [tried, setTried] = useState(false);
  const [notice, flash] = useNotice();

  const open = (which: 'email' | 'password') => {
    setTried(false);
    setNewEmail('');
    setPw({ current: '', next: '', again: '' });
    setEditing(editing === which ? null : which);
  };

  const emailError = newEmail.trim() && EMAIL.test(newEmail.trim()) ? null : 'Enter an email like name@example.com';
  const pwError = !pw.current
    ? 'Enter your current password'
    : pw.next.length < 8
      ? 'Use at least 8 characters'
      : pw.next !== pw.again
        ? "The two passwords don't match"
        : null;

  const saveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (emailError) return;
    // The address is kept on this device for now; it becomes the sign-in email once sign-in is connected.
    saveProfile({ ...profile, email: newEmail.trim() });
    setEditing(null);
    flash('Email saved on this device.');
  };
  const savePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (pwError) return;
    setEditing(null);
    flash(NOT_CONNECTED);
  };

  return (
    <section className="space-y-5 border-t border-line pt-8">
      <div>
        <SectionTitle icon="padlock-key">Sign-in</SectionTitle>
        <p className="mt-1 font-support text-sm text-muted">How you get into Wallex.</p>
      </div>

      <div className="space-y-6">
        <div>
          <InfoRow title="Email address" value={email || 'No email added'}>
            <button type="button" onClick={() => open('email')} aria-expanded={editing === 'email'} className={outlineBtn}>
              {editing === 'email' ? 'Cancel' : 'Change email'}
            </button>
          </InfoRow>
          <Fold open={editing === 'email'}>
            <form onSubmit={saveEmail} noValidate className="flex flex-wrap items-start gap-3">
              <div className="min-w-[16rem] flex-1">
                <input type="email" value={newEmail} autoComplete="email" onChange={(e) => setNewEmail(e.target.value)} placeholder="New email address" aria-label="New email address" className={inputClass} />
                {tried && emailError && <span className="mt-1.5 block font-support text-xs text-red-300">{emailError}</span>}
              </div>
              <button type="submit" className="cursor-pointer rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-canvas transition-opacity hover:opacity-90">Save email</button>
            </form>
          </Fold>
        </div>

        <div>
          <InfoRow title="Password" value="••••••••••">
            <button type="button" onClick={() => open('password')} aria-expanded={editing === 'password'} className={outlineBtn}>
              {editing === 'password' ? 'Cancel' : 'Change password'}
            </button>
          </InfoRow>
          <Fold open={editing === 'password'}>
            <form onSubmit={savePassword} noValidate className="space-y-3">
              <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-3">
                <input type="password" value={pw.current} autoComplete="current-password" onChange={(e) => setPw({ ...pw, current: e.target.value })} placeholder="Current password" aria-label="Current password" className={inputClass} />
                <input type="password" value={pw.next} autoComplete="new-password" onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder="New password" aria-label="New password" className={inputClass} />
                <input type="password" value={pw.again} autoComplete="new-password" onChange={(e) => setPw({ ...pw, again: e.target.value })} placeholder="Confirm new password" aria-label="Confirm new password" className={inputClass} />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" className="cursor-pointer rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-canvas transition-opacity hover:opacity-90">Update password</button>
                {tried && pwError && <span className="font-support text-xs text-red-300">{pwError}</span>}
              </div>
            </form>
          </Fold>
        </div>

        <InfoRow title="Devices" value="Signs you out everywhere you're logged in, including this one.">
          <button type="button" onClick={() => flash(NOT_CONNECTED)} className={outlineBtn}>Sign out of all devices</button>
        </InfoRow>
        <Notice text={notice} />
      </div>
    </section>
  );
}

function Banks({ onConnectionChange }: { onConnectionChange?: () => void }) {
  const [bank, setBank] = useState<string | null | undefined>(undefined); // undefined while loading
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, flash] = useNotice();

  useEffect(() => {
    wallex.getStatus().then((res) => setBank(res.ok ? (res.data.connection?.institutionName ?? null) : null));
  }, []);

  const unlink = async () => {
    setConfirming(false);
    setBusy(true);
    const res = await wallex.disconnect();
    setBusy(false);
    if (!res.ok) return flash(res.error);
    setBank(null);
    flash('Unlinked. Your saved Plaid credentials were kept, so you can connect again in Setup.');
    onConnectionChange?.();
  };

  return (
    <section className="space-y-5 border-t border-line pt-8">
      <div>
        <SectionTitle icon="government-building-1">Connected banks</SectionTitle>
        <p className="mt-1 font-support text-sm text-muted">Banks Wallex reads through Plaid. Unlinking removes the connection, not your bank account.</p>
      </div>
      {bank ? (
        <InfoRow title={bank} value="Linked through Plaid">
          {confirming ? (
            <>
              <button type="button" onClick={unlink} disabled={busy} className="cursor-pointer rounded-lg bg-red-500/90 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Yes, unlink {bank}</button>
              <button type="button" onClick={() => setConfirming(false)} className="cursor-pointer rounded-lg border border-line px-4 py-2 text-sm font-semibold">Cancel</button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} disabled={busy} className={dangerBtn}>Unlink</button>
          )}
        </InfoRow>
      ) : (
        <p className="font-support text-sm text-muted">
          {bank === undefined ? 'Checking…' : wallex.available() ? 'No bank is linked. Connect one in Settings → Setup.' : 'Open the Wallex desktop app to see linked banks.'}
        </p>
      )}
      <Notice text={notice} />
    </section>
  );
}

function YourData({ onRefresh, refreshing }: { onRefresh?: () => void; refreshing?: boolean }) {
  const [confirmReset, setConfirmReset] = useState(false);

  const exportData = () => {
    const out: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('wallex-')) {
        try {
          out[k] = JSON.parse(localStorage.getItem(k) ?? 'null');
        } catch {
          out[k] = localStorage.getItem(k);
        }
      }
    }
    if (out['wallex-profile'] && typeof out['wallex-profile'] === 'object') (out['wallex-profile'] as Record<string, unknown>).photo = '(picture left out)';
    const url = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wallex-my-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('wallex-')) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    location.reload();
  };

  return (
    <section className="space-y-5 border-t border-line pt-8">
      <div>
        <SectionTitle icon="database">Your data</SectionTitle>
        <p className="mt-1 font-support text-sm text-muted">Wallex keeps your profile, appearance and Recurring corrections on this device. Your bank details are never saved.</p>
      </div>
      <div className="space-y-6">
        <InfoRow title="Download my data" value="A copy of everything saved on this device, as a file.">
          <button type="button" onClick={exportData} className={outlineBtn}>
            <Download className="h-4 w-4" />
            Download
          </button>
        </InfoRow>
        <InfoRow title="Refresh bank data" value="Fetch your accounts and transactions fresh from your bank.">
          <button type="button" onClick={onRefresh} disabled={refreshing} className={outlineBtn}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </InfoRow>
        <InfoRow title="Reset saved settings" value="Erases your profile, appearance and Recurring corrections from this device.">
          {confirmReset ? (
            <>
              <button type="button" onClick={reset} className="cursor-pointer rounded-lg bg-red-500/90 px-4 py-2 text-sm font-semibold text-white">Yes, erase</button>
              <button type="button" onClick={() => setConfirmReset(false)} className="cursor-pointer rounded-lg border border-line px-4 py-2 text-sm font-semibold">Cancel</button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmReset(true)} className={dangerBtn}>Reset</button>
          )}
        </InfoRow>
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="space-y-5 border-t border-line pt-8">
      <SectionTitle icon="text-box-1">About</SectionTitle>
      <InfoRow title="Version" value={__APP_VERSION__}>{null}</InfoRow>
      <p className="font-support text-xs text-muted">Icons: Streamline Plump, CC BY 4.0.</p>
    </section>
  );
}

function DangerZone() {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [notice, flash] = useNotice();
  const ready = typed.trim().toUpperCase() === 'DELETE';

  const close = () => {
    setConfirming(false);
    setTyped('');
  };

  return (
    <section className="space-y-5 rounded-xl border border-red-400/30 p-5">
      <div>
        <SectionTitle icon="notification-alert" className="text-lg font-semibold text-red-300">Danger zone</SectionTitle>
        <p className="mt-1 font-support text-sm text-muted">Deleting your account removes your sign-in, your saved settings and any linked banks. This can't be undone.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {confirming ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!ready) return;
              close();
              flash(NOT_CONNECTED);
            }}
            className="flex flex-wrap items-center gap-3"
          >
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus placeholder="Type DELETE to confirm" aria-label="Type DELETE to confirm" className={`${inputClass} !w-60`} />
            <button type="submit" disabled={!ready} className="cursor-pointer rounded-lg bg-red-500/90 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Delete my account</button>
            <button type="button" onClick={close} className="cursor-pointer rounded-lg border border-line px-4 py-2.5 text-sm font-semibold">Cancel</button>
          </form>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="flex cursor-pointer items-center gap-2 rounded-lg bg-red-500/90 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90">
            <Trash2 className="h-4 w-4" />
            Delete account
          </button>
        )}
        <Notice text={notice} />
      </div>
    </section>
  );
}

export default function AccountTab({
  onConnectionChange,
  onRefresh,
  refreshing,
}: {
  onConnectionChange?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const saved = useProfile();
  const [draft, setDraft] = useState<Profile>(saved);
  // The email is changed under Sign-in, so keep the details form in step with it.
  useEffect(() => setDraft((d) => ({ ...d, email: saved.email })), [saved.email]);
  const [touched, setTouched] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const errors = {
    firstName: draft.firstName.trim() ? null : 'Enter your first name',
    lastName: draft.lastName.trim() ? null : 'Enter your last name',
    phone: !draft.phone.trim() || PHONE.test(draft.phone.trim()) ? null : 'Use digits, spaces, + ( ) or -',
  };
  const valid = Object.values(errors).every((e) => e === null);
  const shown = (k: keyof typeof errors) => (touched ? errors[k] : null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    saveProfile({ ...draft, email: saved.email, firstName: draft.firstName.trim(), lastName: draft.lastName.trim(), preferredName: draft.preferredName.trim(), phone: draft.phone.trim() });
    setJustSaved(true);
    timer.current = window.setTimeout(() => setJustSaved(false), 2000);
  };

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setPhotoError(null);
    try {
      set('photo', await photoFromFile(f));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Could not use that picture');
    }
  };

  const name = fullName(draft);

  return (
    <div className="space-y-8 px-1 pb-10">
    <form onSubmit={save} noValidate className="space-y-8">
      <section className="space-y-5">
        <div>
          <SectionTitle icon="user-face-male">Your profile</SectionTitle>
          <p className="mt-1 font-support text-sm text-muted">This is how Wallex knows you. It stays on this device.</p>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <Avatar p={draft} className="h-28 w-28 text-4xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-semibold tracking-tight">{name || 'Your name'}</p>
            <p className="truncate font-support text-sm text-muted">{draft.email || 'No email added'}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => file.current?.click()} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-sm font-medium transition-colors hover:border-muted">
                <Camera className="h-4 w-4" />
                {draft.photo ? 'Change photo' : 'Upload photo'}
              </button>
              {draft.photo && (
                <button type="button" onClick={() => set('photo', null)} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:text-ink">
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              )}
              <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
            {photoError && <p className="mt-2 font-support text-xs text-red-300">{photoError}</p>}
          </div>
          <LogOutButton />
        </div>
      </section>

      <section className="space-y-5 border-t border-line pt-8">
        <div>
          <SectionTitle icon="text-box-1">Personal details</SectionTitle>
          <p className="mt-1 font-support text-sm text-muted">Your name is used on Overview, and your phone number is for your own reference.</p>
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 @3xl:grid-cols-2">
          <Field label="First name" icon="user-face-male" error={shown('firstName')}>
            <input value={draft.firstName} autoComplete="given-name" onChange={(e) => set('firstName', e.target.value)} placeholder="Ada" className={inputClass} />
          </Field>
          <Field label="Last name" icon="user-face-male" error={shown('lastName')}>
            <input value={draft.lastName} autoComplete="family-name" onChange={(e) => set('lastName', e.target.value)} placeholder="Lovelace" className={inputClass} />
          </Field>
          <Field label="Preferred name" icon="chat-bubble-text-square" hint="What Wallex calls you. Leave blank to use your first name.">
            <input value={draft.preferredName} onChange={(e) => set('preferredName', e.target.value)} placeholder="Ada" className={inputClass} />
          </Field>
          <Field label="Phone (optional)" icon="phone" error={shown('phone')}>
            <input type="tel" value={draft.phone} autoComplete="tel" onChange={(e) => set('phone', e.target.value)} placeholder="+1 555 123 4567" className={inputClass} />
          </Field>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-8">
        <button type="submit" disabled={!dirty && !justSaved} className={`flex cursor-pointer items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-canvas transition-all disabled:cursor-not-allowed disabled:opacity-40 ${justSaved ? 'bg-green-400' : 'bg-accent hover:opacity-90'}`}>
          {justSaved && <Check className="h-4 w-4" strokeWidth={3} />}
          {justSaved ? 'Saved' : 'Save changes'}
        </button>
        <button type="button" disabled={!dirty} onClick={() => { setDraft(saved); setTouched(false); setPhotoError(null); }} className="cursor-pointer rounded-lg border border-line px-4 py-2.5 text-sm font-semibold transition-colors hover:border-muted disabled:cursor-not-allowed disabled:opacity-40">
          Discard
        </button>
        {dirty && <span className="font-support text-xs text-muted">You have unsaved changes.</span>}
      </div>
    </form>

    <SignIn />
    <Banks onConnectionChange={onConnectionChange} />
    <YourData onRefresh={onRefresh} refreshing={refreshing} />
    <About />
    <DangerZone />
    </div>
  );
}
