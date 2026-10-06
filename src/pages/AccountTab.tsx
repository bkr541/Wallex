import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Download, LogOut, RefreshCw } from 'lucide-react';
import DestructiveAction from '../components/DestructiveAction';
import PhotoDropZone from '../components/PhotoDropZone';
import Collapsible from '../components/overview/Collapsible';
import type { PlumpName } from '../components/PlumpIcon';
import UnderlineField from '../components/UnderlineField';
import { changeEmail, changePassword, signOut } from '../lib/auth';
import { fullName, photoFromFile, saveProfile, useProfile, type Profile } from '../lib/profile';
import { wallex } from '../lib/wallex';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+()\-.\s\d]{7,20}$/;

const outlineBtn =
  'flex cursor-pointer items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold transition-colors hover:border-muted disabled:cursor-not-allowed disabled:opacity-40';
// Deleting an account has to remove the person's sign-in on the server, which needs a step that is not built yet. Until
// then the button says so instead of pretending to work.
const DELETE_UNAVAILABLE = "Deleting an account isn't available yet, so nothing was changed.";

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

// Each group folds away the same way the Overview groups do, and which ones are folded is remembered.
const CLOSED_KEY = 'wallex-account-closed';
function Group({ id, title, icon, subtitle, children }: { id: string; title: string; icon: PlumpName; subtitle?: string; children: React.ReactNode }) {
  const read = (): Record<string, boolean> => {
    try {
      return JSON.parse(localStorage.getItem(CLOSED_KEY) ?? '{}');
    } catch {
      return {};
    }
  };
  const [closed, setClosed] = useState(read);
  // Every group saves into the same record, so each one starts from what the others have saved.
  const toggle = () => {
    const next = { ...read(), [id]: !closed[id] };
    setClosed(next);
    try {
      localStorage.setItem(CLOSED_KEY, JSON.stringify(next));
    } catch {
      // Not remembering is fine.
    }
  };
  return (
    <Collapsible title={title} icon={icon} subtitle={subtitle} open={!closed[id]} onToggle={toggle}>
      <div className="space-y-5">{children}</div>
    </Collapsible>
  );
}

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

function LogOutButton() {
  const [notice, flash] = useNotice();
  return (
    <div className="flex flex-col items-start gap-2 @3xl:items-end">
      <button
        type="button"
        onClick={async () => {
          const r = await signOut();
          if (!r.ok) flash(r.error);
        }}
        className={outlineBtn}
      >
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, flash] = useNotice();

  const open = (which: 'email' | 'password') => {
    setTried(false);
    setError(null);
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

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    setError(null);
    if (emailError || busy) return;
    setBusy(true);
    const r = await changeEmail(newEmail);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setEditing(null);
    flash(`We sent a link to your current address and to ${newEmail.trim()}. Open both to finish the change.`);
  };
  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    setError(null);
    if (pwError || busy) return;
    setBusy(true);
    const r = await changePassword(pw.current, pw.next);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setEditing(null);
    flash('Password updated.');
  };

  return (
    <Group id="signin" title="Sign-in" icon="padlock-key" subtitle="How you get into Wallex.">
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
                <UnderlineField label="New email address" icon="mail-send" type="email" value={newEmail} autoComplete="email" onChange={(e) => setNewEmail(e.target.value)} placeholder="you@example.com" error={error ?? (tried ? emailError : null)} />
              </div>
              <button type="submit" disabled={busy} className="cursor-pointer rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-canvas capitalize transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-60">{busy ? 'Sending…' : 'Save email'}</button>
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
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 @3xl:grid-cols-3">
                <UnderlineField label="Current password" icon="padlock-key" type="password" value={pw.current} autoComplete="current-password" onChange={(e) => setPw({ ...pw, current: e.target.value })} placeholder="••••••••" />
                <UnderlineField label="New password" icon="padlock-key" type="password" value={pw.next} autoComplete="new-password" onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder="At least 8 characters" />
                <UnderlineField label="Confirm new password" icon="padlock-key" type="password" value={pw.again} autoComplete="new-password" onChange={(e) => setPw({ ...pw, again: e.target.value })} placeholder="Repeat it" />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={busy} className="cursor-pointer rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-canvas capitalize transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-60">{busy ? 'Updating…' : 'Update password'}</button>
                {(error || (tried && pwError)) && <span role="alert" className="font-support text-xs text-red-300">{error ?? pwError}</span>}
              </div>
            </form>
          </Fold>
        </div>

        <InfoRow title="Devices" value="Signs you out everywhere you're logged in, including this one.">
          <button type="button" onClick={async () => { const r = await signOut('global'); if (!r.ok) flash(r.error); }} className={outlineBtn}>Sign out of all devices</button>
        </InfoRow>
        <Notice text={notice} />
      </div>
    </Group>
  );
}

function Banks({ onConnectionChange }: { onConnectionChange?: () => void }) {
  const [banks, setBanks] = useState<{ itemId: string; institutionName: string }[] | undefined>(undefined); // undefined while loading
  const [busy, setBusy] = useState(false);
  const [notice, flash] = useNotice();

  useEffect(() => {
    wallex.getStatus().then((res) => setBanks(res.ok ? res.data.connections : []));
  }, []);

  const unlink = async (itemId: string, name: string) => {
    setBusy(true);
    const res = await wallex.disconnect(itemId);
    setBusy(false);
    if (!res.ok) return flash(res.error);
    setBanks((list) => (list ?? []).filter((b) => b.itemId !== itemId));
    flash(`Unlinked ${name}. Your other banks are unchanged.`);
    onConnectionChange?.();
  };

  return (
    <Group id="banks" title="Connected banks" icon="government-building-1" subtitle="Every bank Wallex reads through Plaid. Unlinking one removes its connection, not your bank account. Add more in Settings → Setup.">
      {banks && banks.length > 0 ? (
        <div className="space-y-4">
          {banks.map((b) => (
            <DestructiveAction
              key={b.itemId}
              heading={b.institutionName || 'Linked bank'}
              description="Linked through Plaid"
              trigger="Unlink…"
              title={`Unlink ${b.institutionName || 'this bank'}?`}
              body="Wallex stops reading its accounts and transactions. Your saved Plaid credentials are kept, so you can connect again in Setup."
              confirm="Unlink"
              onConfirm={() => unlink(b.itemId, b.institutionName || 'the bank')}
              confirmDisabled={busy}
            />
          ))}
        </div>
      ) : (
        <p className="font-support text-sm text-muted">
          {banks === undefined ? 'Checking…' : wallex.available() ? 'No bank is linked. Connect one in Settings → Setup.' : 'Open the Wallex desktop app to see linked banks.'}
        </p>
      )}
      <Notice text={notice} />
    </Group>
  );
}

function YourData({ onRefresh, refreshing }: { onRefresh?: () => void; refreshing?: boolean }) {
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
    <Group id="data" title="Your data" icon="database" subtitle="Wallex keeps your profile, appearance and Recurring corrections on this device. Your bank details are never saved.">
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
        <DestructiveAction
          heading="Reset saved settings"
          description="Erases your profile, appearance and Recurring corrections from this device."
          trigger="Reset…"
          title="Erase everything saved here?"
          body="Your profile, appearance and Recurring corrections are removed from this device. Your bank stays linked."
          confirm="Erase"
          onConfirm={reset}
        />
      </div>
    </Group>
  );
}

function About() {
  return (
    <Group id="about" title="About" icon="text-box-1">
      <InfoRow title="Version" value={__APP_VERSION__}>{null}</InfoRow>
      <p className="font-support text-xs text-muted">Icons: Streamline Plump, CC BY 4.0.</p>
    </Group>
  );
}

function DangerZone() {
  const [typed, setTyped] = useState('');
  const [notice, flash] = useNotice();
  const ready = typed.trim().toUpperCase() === 'DELETE';

  return (
    <div className="rounded-xl border border-red-400/30 px-5">
    <Group id="danger" title="Danger zone" icon="notification-alert" subtitle="Deleting your account removes your sign-in, your saved settings and any linked banks. This can't be undone.">
      <DestructiveAction
        heading="Delete account"
        trigger="Delete account…"
        title="Delete your account?"
        body="Your sign-in, saved settings and linked banks are removed for good."
        confirm="Delete account"
        confirmDisabled={!ready}
        onConfirm={() => flash(DELETE_UNAVAILABLE)}
        onClose={() => setTyped('')}
      >
        <UnderlineField label="Type DELETE to confirm" icon="notification-alert" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" autoComplete="off" autoFocus />
      </DestructiveAction>
      <Notice text={notice} />
    </Group>
    </div>
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
      <Group id="profile" title="Your profile" icon="user-face-male" subtitle="This is how Wallex knows you. It stays on this device.">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold tracking-tight">{name || 'Your name'}</p>
            <p className="truncate font-support text-sm text-muted">{draft.email || 'No email added'}</p>
          </div>
          <LogOutButton />
        </div>
        <PhotoDropZone photo={draft.photo} error={photoError} onFile={pick} onRemove={() => set('photo', null)} />
      </Group>

      <Group id="details" title="Personal details" icon="text-box-1" subtitle="Your name is used on Overview, and your phone number is for your own reference.">
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 @3xl:grid-cols-2">
          <UnderlineField label="First name" icon="user-face-male" value={draft.firstName} autoComplete="given-name" onChange={(e) => set('firstName', e.target.value)} placeholder="Ada" error={shown('firstName')} />
          <UnderlineField label="Last name" icon="user-face-male" value={draft.lastName} autoComplete="family-name" onChange={(e) => set('lastName', e.target.value)} placeholder="Lovelace" error={shown('lastName')} />
          <UnderlineField label="Preferred name" icon="chat-bubble-text-square" value={draft.preferredName} onChange={(e) => set('preferredName', e.target.value)} placeholder="Ada" hint="What Wallex calls you. Leave blank to use your first name." />
          <UnderlineField label="Phone (optional)" icon="phone" type="tel" value={draft.phone} autoComplete="tel" onChange={(e) => set('phone', e.target.value)} placeholder="+1 555 123 4567" error={shown('phone')} />
        </div>
      </Group>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-8">
        <button type="submit" disabled={!dirty && !justSaved} className={`flex cursor-pointer items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-canvas capitalize transition-all disabled:cursor-not-allowed disabled:opacity-40 ${justSaved ? 'bg-green-400' : 'bg-accent hover:opacity-90'}`}>
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
