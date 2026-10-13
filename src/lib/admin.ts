import { useSyncExternalStore } from 'react';
import { supabase } from './supabase';

// Whether the signed-in account is a developer / admin. The list lives in the database (the app_admins table), where a
// person can only read their own row, so no one can promote themselves from the app. This only decides what is shown: the
// developer tools are mock-ups and switches, and nothing sensitive sits behind them.
//
// The last answer is remembered for the account on this device, so the tools do not flicker away at launch while the
// database is asked again. The database's answer always replaces it.

const KEY = 'wallex-admin-user';

const remembered = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
const remember = (userId: string | null) => {
  try {
    if (userId) localStorage.setItem(KEY, userId);
    else localStorage.removeItem(KEY);
  } catch {
    // Not remembering is fine.
  }
};

let admin = false;
let current: string | null = null;
const listeners = new Set<() => void>();
const set = (next: boolean) => {
  if (next === admin) return;
  admin = next;
  listeners.forEach((l) => l());
};

async function check(userId: string | null) {
  current = userId;
  if (!userId || !supabase) return set(false);
  // The hint from last time, until the database answers.
  if (remembered() === userId) set(true);
  const { data, error } = await supabase.from('app_admins').select('user_id').eq('user_id', userId).maybeSingle();
  if (current !== userId) return; // someone else signed in meanwhile
  if (error) return set(false); // the table may not exist yet: show nothing rather than guess
  const yes = Boolean(data);
  remember(yes ? userId : remembered() === userId ? null : remembered());
  set(yes);
}

if (supabase) {
  supabase.auth.getSession().then(({ data }) => void check(data.session?.user.id ?? null));
  supabase.auth.onAuthStateChange((_event, session) => {
    const id = session?.user.id ?? null;
    if (id !== current) void check(id);
  });
}

export const useIsAdmin = (): boolean =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => admin,
  );
