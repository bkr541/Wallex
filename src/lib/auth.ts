import { useSyncExternalStore } from 'react';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { EMPTY_PROFILE, getProfile, saveProfile } from './profile';
import { supabase } from './supabase';
import { wallex, type AuthCallback } from './wallex';

// Who is signed in. The app shows the sign-in screen until there is a session, and keeps that session between
// launches. Everything that talks to Supabase Auth lives here, with its errors turned into plain sentences.

export interface AuthState {
  // loading: still reading the saved session. unconfigured: the Supabase keys are missing from this build.
  status: 'loading' | 'signedOut' | 'signedIn' | 'unconfigured';
  session: Session | null;
  // True from the moment a password-reset link is opened until the new password is saved. The person is
  // technically signed in then, but must not reach the app until they have chosen a password.
  recovering: boolean;
  // Something the screen should say, such as "that link has expired".
  notice: { kind: 'error' | 'info'; text: string } | null;
}

let state: AuthState = {
  status: supabase ? 'loading' : 'unconfigured',
  session: null,
  recovering: false,
  notice: null,
};
const listeners = new Set<() => void>();
function set(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useAuth(): AuthState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

export const clearNotice = () => state.notice && set({ notice: null });

// The profile on this device follows the account: the name given at sign-up and the sign-in email.
function adoptAccount(user: User) {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === 'string' ? v : '');
  const email = user.email ?? '';
  const current = getProfile();
  if (current.email.toLowerCase() !== email.toLowerCase()) {
    // A different account than last time on this computer: start its profile from what it signed up with.
    saveProfile({ ...EMPTY_PROFILE, firstName: text(meta.first_name), lastName: text(meta.last_name), email });
  }
}

if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') state = { ...state, recovering: true };
    if (session?.user) adoptAccount(session.user);
    set({
      session,
      status: session ? 'signedIn' : 'signedOut',
      recovering: session ? state.recovering : false,
    });
  });
  supabase.auth.getSession().then(({ data }) => {
    if (state.status === 'loading') set({ session: data.session, status: data.session ? 'signedIn' : 'signedOut' });
  });
}

/* ------------------------------------------------------------------------------------------- messages */

const fail = (error: string) => ({ ok: false as const, error });

function describe(err: AuthError | Error | { message?: string; code?: string; name?: string; status?: number }): string {
  const e = err as { message?: string; code?: string; name?: string; status?: number };
  const msg = (e.message ?? '').toLowerCase();
  if (e.name === 'AuthRetryableFetchError' || msg.includes('failed to fetch') || msg.includes('network'))
    return 'Wallex could not reach its server. Check your internet connection and try again.';
  switch (e.code) {
    case 'invalid_credentials':
      return 'That email and password do not match.';
    case 'email_not_confirmed':
      return 'This email has not been verified yet.';
    case 'user_already_exists':
    case 'email_exists':
      return 'An account with this email already exists. Try logging in instead.';
    case 'weak_password':
      return 'That password is too easy to guess. Try a longer one with letters and numbers.';
    case 'same_password':
      return 'Choose a password you have not used on this account before.';
    case 'over_email_send_rate_limit':
      return 'Too many emails were sent. Wait a few minutes, then try again.';
    case 'over_request_rate_limit':
    case 'over_sms_send_rate_limit':
      return 'Too many attempts. Wait a few minutes, then try again.';
    case 'email_address_invalid':
    case 'validation_failed':
      return 'That email address does not look right.';
    case 'signup_disabled':
      return 'New accounts are turned off right now.';
    case 'user_banned':
      return 'This account has been disabled.';
    case 'otp_expired':
      return 'That link has expired. Ask for a new email.';
  }
  if (e.status === 429 || msg.includes('rate limit')) return 'Too many attempts. Wait a few minutes, then try again.';
  if (msg.includes('invalid login credentials')) return 'That email and password do not match.';
  if (msg.includes('email not confirmed')) return 'This email has not been verified yet.';
  if (msg.includes('already registered')) return 'An account with this email already exists. Try logging in instead.';
  return 'Something went wrong. Please try again.';
}

export const isUnverified = (err: unknown) => {
  const e = err as { code?: string; message?: string } | undefined;
  return e?.code === 'email_not_confirmed' || (e?.message ?? '').toLowerCase().includes('email not confirmed');
};

const needClient = () => fail('Wallex is not connected to its sign-in service. Reinstall the app or contact support.');

/* ---------------------------------------------------------------------------------------------- actions */

// The page the app serves itself for email links (see electron/authServer.cjs).
const LINK_LANDING = 'http://127.0.0.1:54719';

export async function signIn(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string; unverified?: boolean }> {
  if (!supabase) return needClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return { ok: false, error: describe(error), unverified: isUnverified(error) };
  return { ok: true };
}

export interface SignUpInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

// "verify": a confirmation email is on its way. "exists": the address already has an account. "in": signed in at once.
export async function signUp(input: SignUpInput): Promise<{ ok: true; next: 'verify' | 'exists' | 'in' } | { ok: false; error: string }> {
  if (!supabase) return needClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: { first_name: input.firstName.trim(), last_name: input.lastName.trim() },
      emailRedirectTo: LINK_LANDING,
    },
  });
  if (error) return fail(describe(error));
  if (data.session) return { ok: true, next: 'in' };
  // For an address that already has a confirmed account Supabase answers "success" with no sign-in identities, so that
  // nobody can use the form to find out who has an account. The real owner is not emailed again.
  if (data.user && (data.user.identities?.length ?? 0) === 0) return { ok: true, next: 'exists' };
  return { ok: true, next: 'verify' };
}

export async function resendVerification(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return needClient();
  const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: LINK_LANDING } });
  return error ? fail(describe(error)) : { ok: true };
}

export async function sendPasswordReset(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return needClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: LINK_LANDING });
  return error ? fail(describe(error)) : { ok: true };
}

// The last step of a reset: save the new password, then let the person into the app.
export async function finishRecovery(password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return needClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return fail(describe(error));
  set({ recovering: false });
  return { ok: true };
}

export async function cancelRecovery() {
  set({ recovering: false });
  await signOut();
}

export async function signOut(scope: 'local' | 'global' = 'local'): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return needClient();
  const { error } = await supabase.auth.signOut({ scope });
  // If the server cannot be reached the session is still removed on this computer.
  if (error && !isNetwork(error)) return fail(describe(error));
  set({ session: null, status: 'signedOut', recovering: false });
  return { ok: true };
}
const isNetwork = (e: { name?: string }) => e.name === 'AuthRetryableFetchError';

// Used by Settings → Account: confirm the current password first, then set the new one.
export async function changePassword(current: string, next: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return needClient();
  const email = state.session?.user.email;
  if (!email) return fail('You are not signed in.');
  const check = await supabase.auth.signInWithPassword({ email, password: current });
  if (check.error) return fail(check.error.code === 'invalid_credentials' ? 'Your current password is not right.' : describe(check.error));
  const { error } = await supabase.auth.updateUser({ password: next });
  return error ? fail(describe(error)) : { ok: true };
}

// Supabase emails a confirmation link to both the current and the new address; the change happens once both are opened.
export async function changeEmail(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return needClient();
  const { error } = await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: LINK_LANDING });
  return error ? fail(describe(error)) : { ok: true };
}

/* ------------------------------------------------------------------------ links opened from an email */

async function handleCallback(p: AuthCallback) {
  if (!supabase) return;
  if (p.error || !p.access_token || !p.refresh_token) {
    set({ notice: { kind: 'error', text: 'That email link has expired or was already used. Ask for a new one.' } });
    return;
  }
  if (p.type === 'recovery') state = { ...state, recovering: true };
  const { error } = await supabase.auth.setSession({ access_token: p.access_token, refresh_token: p.refresh_token });
  if (error) {
    state = { ...state, recovering: false };
    set({ notice: { kind: 'error', text: isNetwork(error) ? describe(error) : 'That email link is not valid any more. Ask for a new one.' } });
    return;
  }
  set({
    notice:
      p.type === 'recovery'
        ? { kind: 'info', text: 'Link verified. Choose a new password.' }
        : p.type === 'signup'
          ? { kind: 'info', text: 'Email verified. Welcome to Wallex.' }
          : null,
  });
}
wallex.onAuthCallback((p) => void handleCallback(p));
