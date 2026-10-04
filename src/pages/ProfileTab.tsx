import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Download, Trash2 } from 'lucide-react';
import PlumpIcon, { type PlumpName } from '../components/PlumpIcon';
import SectionTitle from '../components/SectionTitle';
import { fullName, initials, photoFromFile, saveProfile, useProfile, type Profile } from '../lib/profile';

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

export default function ProfileTab() {
  const saved = useProfile();
  const [draft, setDraft] = useState<Profile>(saved);
  const [touched, setTouched] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const errors = {
    firstName: draft.firstName.trim() ? null : 'Enter your first name',
    lastName: draft.lastName.trim() ? null : 'Enter your last name',
    email: !draft.email.trim() || EMAIL.test(draft.email.trim()) ? null : 'Enter an email like name@example.com',
    phone: !draft.phone.trim() || PHONE.test(draft.phone.trim()) ? null : 'Use digits, spaces, + ( ) or -',
  };
  const valid = Object.values(errors).every((e) => e === null);
  const shown = (k: keyof typeof errors) => (touched ? errors[k] : null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    saveProfile({ ...draft, firstName: draft.firstName.trim(), lastName: draft.lastName.trim(), preferredName: draft.preferredName.trim(), email: draft.email.trim(), phone: draft.phone.trim() });
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
    a.download = 'wallex-my-settings.json';
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

  const name = fullName(draft);

  return (
    <form onSubmit={save} noValidate className="space-y-8 px-1 pb-10">
      <section className="space-y-5">
        <div>
          <SectionTitle icon="user-face-male">Your profile</SectionTitle>
          <p className="mt-1 font-support text-sm text-muted">This is how Wallex knows you. It stays on this device.</p>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <Avatar p={draft} className="h-28 w-28 text-4xl" />
          <div className="min-w-0">
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
        </div>
      </section>

      <section className="space-y-5 border-t border-line pt-8">
        <div>
          <SectionTitle icon="text-box-1">Personal details</SectionTitle>
          <p className="mt-1 font-support text-sm text-muted">Your name is used on Overview, and your contact details are for your own reference.</p>
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
          <Field label="Email" icon="mail-send" error={shown('email')}>
            <input type="email" value={draft.email} autoComplete="email" onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" className={inputClass} />
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

      <section className="space-y-5 border-t border-line pt-8">
        <div>
          <SectionTitle icon="database">Your data on this device</SectionTitle>
          <p className="mt-1 font-support text-sm text-muted">Wallex keeps your profile, appearance and Recurring corrections here. Your bank details are never saved.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={exportData} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold transition-colors hover:border-muted">
            <Download className="h-4 w-4" />
            Download my settings
          </button>
          {confirmReset ? (
            <span className="flex items-center gap-2">
              <span className="font-support text-sm text-muted">Erase everything saved here?</span>
              <button type="button" onClick={reset} className="cursor-pointer rounded-lg bg-red-500/90 px-4 py-2 text-sm font-semibold text-white">Yes, erase</button>
              <button type="button" onClick={() => setConfirmReset(false)} className="cursor-pointer rounded-lg border border-line px-4 py-2 text-sm font-semibold">Cancel</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmReset(true)} className="cursor-pointer rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-red-400/60 hover:text-red-300">
              Reset saved data
            </button>
          )}
        </div>
      </section>
    </form>
  );
}
