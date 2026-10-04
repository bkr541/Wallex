import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// What every login mockup shares: the fields, the checks and the log in / sign up switch. How each one
// looks is up to the mockup. Nothing here talks to a server; submitting just shows a short confirmation.

export type Mode = 'login' | 'signup';
export type FieldKey = 'first' | 'last' | 'email' | 'password' | 'confirm';

export interface FieldDef {
  key: FieldKey;
  label: string;
  placeholder: string;
  type: 'text' | 'email' | 'password';
  autoComplete: string;
}

const ALL: Record<FieldKey, FieldDef> = {
  first: { key: 'first', label: 'First name', placeholder: 'Ada', type: 'text', autoComplete: 'given-name' },
  last: { key: 'last', label: 'Last name', placeholder: 'Lovelace', type: 'text', autoComplete: 'family-name' },
  email: { key: 'email', label: 'Email', placeholder: 'you@example.com', type: 'email', autoComplete: 'email' },
  password: { key: 'password', label: 'Password', placeholder: 'At least 8 characters', type: 'password', autoComplete: 'current-password' },
  confirm: { key: 'confirm', label: 'Confirm password', placeholder: 'Type it again', type: 'password', autoComplete: 'new-password' },
};

export const FIELDS: Record<Mode, FieldDef[]> = {
  login: [ALL.email, { ...ALL.password, placeholder: 'Your password' }],
  signup: [ALL.first, ALL.last, ALL.email, ALL.password, ALL.confirm],
};

export const COPY: Record<Mode, { title: string; sub: string; cta: string; switchText: string; switchCta: string }> = {
  login: { title: 'Welcome back', sub: 'Log in to see where your money stands.', cta: 'Log in', switchText: 'New to Wallex?', switchCta: 'Create an account' },
  signup: { title: 'Create your account', sub: 'It takes a minute. Your bank comes next.', cta: 'Create account', switchText: 'Already have an account?', switchCta: 'Log in' },
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useAuthForm() {
  const [mode, setMode] = useState<Mode>('login');
  const [values, setValues] = useState<Record<FieldKey, string>>({ first: '', last: '', email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [done, setDone] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const errorFor = (k: FieldKey): string | null => {
    const v = values[k].trim();
    if (k === 'first') return v ? null : 'Enter your first name';
    if (k === 'last') return v ? null : 'Enter your last name';
    if (k === 'email') return EMAIL.test(v) ? null : 'Enter an email like name@example.com';
    if (k === 'password') return mode === 'login' ? (values.password ? null : 'Enter your password') : values.password.length >= 8 ? null : 'Use at least 8 characters';
    return values.confirm && values.confirm === values.password ? null : 'The passwords do not match';
  };
  const fields = FIELDS[mode];
  const shown = (k: FieldKey) => (touched[k] ? errorFor(k) : null);

  return {
    mode,
    fields,
    values,
    done,
    copy: COPY[mode],
    setMode: (m: Mode) => {
      setMode(m);
      setTouched({});
      setDone(false);
    },
    set: (k: FieldKey, v: string) => setValues((c) => ({ ...c, [k]: v })),
    touch: (k: FieldKey) => setTouched((c) => ({ ...c, [k]: true })),
    error: shown,
    // The checks for one step of the form (the wizard validates a few fields at a time).
    valid: (keys: FieldKey[]) => keys.every((k) => errorFor(k) === null),
    touchAll: (keys: FieldKey[]) => setTouched((c) => ({ ...c, ...Object.fromEntries(keys.map((k) => [k, true])) })),
    submit: (e?: React.FormEvent) => {
      e?.preventDefault();
      const keys = fields.map((f) => f.key);
      setTouched((c) => ({ ...c, ...Object.fromEntries(keys.map((k) => [k, true])) }));
      if (!keys.every((k) => errorFor(k) === null)) return false;
      setDone(true);
      timer.current = window.setTimeout(() => setDone(false), 2200);
      return true;
    },
  };
}
export type Auth = ReturnType<typeof useAuthForm>;

export function RevealButton({ shown, onClick, className = '' }: { shown: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label={shown ? 'Hide password' : 'Show password'}
      onClick={onClick}
      className={`flex cursor-pointer items-center justify-center text-muted transition-colors hover:text-ink ${className}`}
    >
      {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}
