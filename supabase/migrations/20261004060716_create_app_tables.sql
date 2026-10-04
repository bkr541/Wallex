-- Wallex: the app's own data. Bank accounts, balances and transactions are NOT stored here; they are fetched
-- from Plaid each time. Every table belongs to a signed-in user and is protected by row-level security.

-- Keeps updated_at current on every change.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Look and feel, the phone/desktop view, and which Overview sections are folded.
create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'dark' check (theme in ('system', 'light', 'dark')),
  accent text not null default 'teal',
  text_size text not null default 'default' check (text_size in ('small', 'default', 'large')),
  reduce_motion boolean not null default false,
  view_mode text not null default 'desktop' check (view_mode in ('desktop', 'mobile')),
  overview_closed jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Corrections made on the Recurring tab: a new name, a confirmed type, or "this isn't a bill".
create table public.recurring_overrides (
  user_id uuid not null references auth.users (id) on delete cascade,
  recurring_id text not null,
  label text,
  kind text,
  hide_reason text check (hide_reason in ('transfer', 'not-recurring', 'ignored')),
  updated_at timestamptz not null default now(),
  primary key (user_id, recurring_id)
);

-- Plaid link options. Nothing secret: the Plaid client ID and secret live in edge function secrets.
create table public.plaid_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  environment text not null default 'production' check (environment in ('sandbox', 'production')),
  bank_id text,
  products text[] not null default '{transactions}',
  country_codes text[] not null default '{US}',
  language text not null default 'en',
  webhook_url text,
  redirect_uri text,
  updated_at timestamptz not null default now()
);

-- One row per linked bank. The Plaid access token is kept in Supabase Vault; this row only points at it.
-- Only edge functions (service role) can read or write this table.
create table public.plaid_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null unique,
  institution_name text,
  access_token_secret_id uuid not null,
  created_at timestamptz not null default now()
);
create index plaid_items_user_id_idx on public.plaid_items (user_id);

create trigger user_settings_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();
create trigger recurring_overrides_updated_at before update on public.recurring_overrides
  for each row execute function public.set_updated_at();
create trigger plaid_settings_updated_at before update on public.plaid_settings
  for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;
alter table public.recurring_overrides enable row level security;
alter table public.plaid_settings enable row level security;
alter table public.plaid_items enable row level security;

create policy "Users manage their own settings" on public.user_settings
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage their own overrides" on public.recurring_overrides
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage their own Plaid settings" on public.plaid_settings
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- plaid_items gets no policies and no grants for app users: the service role bypasses RLS, nobody else can touch it.
revoke all on public.plaid_items from anon, authenticated;
revoke all on public.user_settings, public.recurring_overrides, public.plaid_settings from anon;
