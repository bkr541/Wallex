-- Complete the persistence layer used by the desktop app. Public user-owned tables are protected by RLS;
-- Plaid access tokens stay in Vault and can only be written through authenticated security-definer functions.

create extension if not exists supabase_vault with schema vault;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  preferred_name text not null default '',
  phone text not null default '',
  photo_data text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users manage their own profile" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.user_settings
  add column if not exists notification_preferences jsonb not null default
    '{"weeklySummary":true,"billReminders":true,"lowBalance":true,"lowBalanceThreshold":500}'::jsonb,
  add column if not exists onboarding_completed boolean not null default false;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
grant select, insert, update, delete on public.recurring_overrides to authenticated;
grant select, insert, update, delete on public.plaid_settings to authenticated;
revoke all on public.profiles from anon;

-- Every new account receives the rows the client expects. Auth metadata supplies the names collected at signup.
create or replace function public.handle_new_wallex_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, first_name, last_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', '')
  )
  on conflict (user_id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.plaid_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_wallex on auth.users;
create trigger on_auth_user_created_wallex
  after insert on auth.users
  for each row execute function public.handle_new_wallex_user();

-- Backfill accounts created before the signup trigger existed.
insert into public.profiles (user_id, first_name, last_name)
select
  id,
  coalesce(raw_user_meta_data ->> 'first_name', ''),
  coalesce(raw_user_meta_data ->> 'last_name', '')
from auth.users
on conflict (user_id) do nothing;

insert into public.user_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;

insert into public.plaid_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- Accounts that predate this onboarding release have already been using Wallex and must not be sent through it.
update public.user_settings
set onboarding_completed = true
where user_id in (select id from auth.users);

-- Store or rotate one user's Plaid token without exposing Vault or plaid_items to the renderer.
create or replace function public.store_plaid_item(
  p_item_id text,
  p_institution_name text,
  p_access_token text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  owner uuid;
  old_secret uuid;
  new_secret uuid;
  row_id uuid;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if coalesce(trim(p_item_id), '') = '' or coalesce(trim(p_access_token), '') = '' then
    raise exception 'Plaid item ID and access token are required';
  end if;

  select user_id, access_token_secret_id
    into owner, old_secret
    from public.plaid_items
    where item_id = p_item_id;

  if owner is not null and owner <> caller then
    raise exception 'Plaid item belongs to another user';
  end if;

  new_secret := vault.create_secret(
    p_access_token,
    'plaid-' || caller::text || '-' || p_item_id,
    'Wallex Plaid access token'
  );

  insert into public.plaid_items (user_id, item_id, institution_name, access_token_secret_id)
  values (caller, p_item_id, nullif(trim(p_institution_name), ''), new_secret)
  on conflict (item_id) do update set
    institution_name = excluded.institution_name,
    access_token_secret_id = excluded.access_token_secret_id
  returning id into row_id;

  if old_secret is not null then delete from vault.secrets where id = old_secret; end if;
  return row_id;
end;
$$;

create or replace function public.delete_plaid_item(p_item_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  secret_id uuid;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select access_token_secret_id into secret_id
    from public.plaid_items
    where user_id = caller and item_id = p_item_id;
  delete from public.plaid_items where user_id = caller and item_id = p_item_id;
  if secret_id is not null then delete from vault.secrets where id = secret_id; end if;
end;
$$;

revoke all on function public.store_plaid_item(text, text, text) from public;
revoke all on function public.delete_plaid_item(text) from public;
grant execute on function public.store_plaid_item(text, text, text) to authenticated;
grant execute on function public.delete_plaid_item(text) to authenticated;
