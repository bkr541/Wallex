import { supabase } from './supabase';
import type { Profile } from './profile';
import type { Appearance } from './appearance';
import type { Override } from './recurringOverrides';
import type { Rules } from './rules';
import type { PlaidSettings } from './wallex';

const QUEUE_KEY = 'wallex-cloud-write-queue';

type SettingsPatch = {
  theme?: string;
  accent?: string;
  text_size?: string;
  reduce_motion?: boolean;
  view_mode?: string;
  overview_closed?: Record<string, boolean>;
  notification_preferences?: Record<string, unknown>;
  onboarding_completed?: boolean;
};

type QueuedWrite =
  | { kind: 'profile'; userId: string; data: Profile }
  | { kind: 'settings'; userId: string; data: SettingsPatch }
  | { kind: 'rules'; userId: string; data: Rules }
  | { kind: 'override-upsert'; userId: string; recurringId: string; data: Override }
  | { kind: 'override-delete'; userId: string; recurringId: string }
  | { kind: 'plaid-settings'; userId: string; bankId: string; data: PlaidSettings };

export interface CloudSnapshot {
  profile: {
    first_name: string;
    last_name: string;
    preferred_name: string;
    phone: string;
    photo_data: string | null;
  } | null;
  settings: {
    theme: Appearance['theme'];
    accent: string;
    text_size: Appearance['textSize'];
    reduce_motion: boolean;
    view_mode: 'desktop' | 'mobile';
    overview_closed: Record<string, boolean>;
    notification_preferences: Record<string, unknown>;
    onboarding_completed: boolean;
  } | null;
  // The saved rules; undefined when the account's table has no rules column yet (the migration has not been applied).
  rules?: Record<string, unknown> | null;
  overrides: Array<{ recurring_id: string; label: string | null; kind: Override['kind'] | null; hide_reason: Override['hide'] | null }>;
  plaidSettings: {
    environment: string;
    bank_id: string | null;
    products: string[];
    country_codes: string[];
    language: string;
    webhook_url: string | null;
    redirect_uri: string | null;
  } | null;
}

function readQueue(): QueuedWrite[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedWrite[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // The immediate cloud write is still attempted even when an offline queue cannot be saved.
  }
}

function queue(write: QueuedWrite) {
  const current = readQueue();
  // New snapshots supersede older writes for the same logical record.
  const same = (item: QueuedWrite) => {
    if (item.userId !== write.userId || item.kind !== write.kind) return false;
    if ('recurringId' in item && 'recurringId' in write) return item.recurringId === write.recurringId;
    return true;
  };
  writeQueue([...current.filter((item) => !same(item)), write]);
}

async function userId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

async function execute(write: QueuedWrite): Promise<boolean> {
  if (!supabase) return false;
  let error: { message: string } | null = null;
  if (write.kind === 'profile') {
    ({ error } = await supabase.from('profiles').upsert({
      user_id: write.userId,
      first_name: write.data.firstName,
      last_name: write.data.lastName,
      preferred_name: write.data.preferredName,
      phone: write.data.phone,
      photo_data: write.data.photo,
    }));
  } else if (write.kind === 'settings') {
    ({ error } = await supabase.from('user_settings').upsert({ user_id: write.userId, ...write.data }));
  } else if (write.kind === 'rules') {
    ({ error } = await supabase.from('user_settings').upsert({ user_id: write.userId, rules: write.data }));
  } else if (write.kind === 'override-upsert') {
    ({ error } = await supabase.from('recurring_overrides').upsert({
      user_id: write.userId,
      recurring_id: write.recurringId,
      label: write.data.label ?? null,
      kind: write.data.kind ?? null,
      hide_reason: write.data.hide ?? null,
    }));
  } else if (write.kind === 'override-delete') {
    ({ error } = await supabase.from('recurring_overrides').delete().eq('user_id', write.userId).eq('recurring_id', write.recurringId));
  } else {
    ({ error } = await supabase.from('plaid_settings').upsert({
      user_id: write.userId,
      environment: write.data.environment,
      bank_id: write.bankId,
      products: write.data.products,
      country_codes: write.data.countries,
      language: write.data.language,
      webhook_url: write.data.webhookUrl || null,
      redirect_uri: write.data.redirectUri || null,
    }));
  }
  if (error) console.error(`Wallex cloud write failed (${write.kind}):`, error.message);
  return !error;
}

async function send(write: QueuedWrite) {
  if (!(await execute(write))) queue(write);
}

export async function syncProfile(profile: Profile) {
  const id = await userId();
  if (id) await send({ kind: 'profile', userId: id, data: profile });
}

export async function syncUserSettings(data: SettingsPatch) {
  const id = await userId();
  if (id) await send({ kind: 'settings', userId: id, data });
}

export async function syncRules(data: Rules) {
  const id = await userId();
  if (id) await send({ kind: 'rules', userId: id, data });
}

export async function syncRecurringOverride(recurringId: string, data: Override | null) {
  const id = await userId();
  if (!id) return;
  await send(data ? { kind: 'override-upsert', userId: id, recurringId, data } : { kind: 'override-delete', userId: id, recurringId });
}

export async function syncPlaidSettings(data: PlaidSettings, bankId: string) {
  const id = await userId();
  if (id) await send({ kind: 'plaid-settings', userId: id, bankId, data });
}

export async function flushCloudWrites(activeUserId: string) {
  const pending = readQueue();
  const keep: QueuedWrite[] = [];
  for (const write of pending) {
    if (write.userId !== activeUserId || !(await execute(write))) keep.push(write);
  }
  writeQueue(keep);
}

export async function loadCloudSnapshot(activeUserId: string): Promise<CloudSnapshot> {
  if (!supabase) return { profile: null, settings: null, overrides: [], plaidSettings: null };
  const [profile, settings, overrides, plaidSettings] = await Promise.all([
    supabase.from('profiles').select('first_name,last_name,preferred_name,phone,photo_data').eq('user_id', activeUserId).maybeSingle(),
    supabase.from('user_settings').select('theme,accent,text_size,reduce_motion,view_mode,overview_closed,notification_preferences,onboarding_completed').eq('user_id', activeUserId).maybeSingle(),
    supabase.from('recurring_overrides').select('recurring_id,label,kind,hide_reason').eq('user_id', activeUserId),
    supabase.from('plaid_settings').select('environment,bank_id,products,country_codes,language,webhook_url,redirect_uri').eq('user_id', activeUserId).maybeSingle(),
  ]);
  // Read on its own: a missing rules column must not stop the rest of the account from loading.
  const rules = await supabase.from('user_settings').select('rules').eq('user_id', activeUserId).maybeSingle();
  const errors = [profile.error, settings.error, overrides.error, plaidSettings.error].filter(Boolean);
  if (errors.length) throw new Error(errors.map((error) => error!.message).join(' '));
  return {
    profile: profile.data as CloudSnapshot['profile'],
    settings: settings.data as CloudSnapshot['settings'],
    rules: rules.error ? undefined : ((rules.data as { rules?: Record<string, unknown> } | null)?.rules ?? null),
    overrides: (overrides.data ?? []) as CloudSnapshot['overrides'],
    plaidSettings: plaidSettings.data as CloudSnapshot['plaidSettings'],
  };
}
