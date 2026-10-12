-- Plaid now runs entirely on the server. The `plaid` edge function holds the Plaid client ID and secret (as function secrets,
-- never in the app) and reads each person's bank access tokens from Vault with the service role. The app and the browser
-- never see a token or a secret, so the functions below are callable by the service role only.

alter table public.plaid_items add column if not exists institution_id text;

-- Every bank a person has linked, with its decrypted access token.
create or replace function public.plaid_items_for_user(p_user_id uuid)
returns table (item_id text, institution_id text, institution_name text, access_token text)
language sql
security definer
set search_path = ''
as $$
  select i.item_id, i.institution_id, i.institution_name, s.decrypted_secret::text
  from public.plaid_items i
  join vault.decrypted_secrets s on s.id = i.access_token_secret_id
  where i.user_id = p_user_id
  order by i.created_at;
$$;

-- Stores or rotates one bank's access token in Vault.
create or replace function public.store_plaid_item_for(
  p_user_id uuid,
  p_item_id text,
  p_institution_id text,
  p_institution_name text,
  p_access_token text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
  old_secret uuid;
  named_secret uuid;
  new_secret uuid;
  secret_name text;
  row_id uuid;
begin
  if p_user_id is null then raise exception 'A user is required'; end if;
  if coalesce(trim(p_item_id), '') = '' or coalesce(trim(p_access_token), '') = '' then
    raise exception 'Plaid item ID and access token are required';
  end if;

  secret_name := 'plaid-' || p_user_id::text || '-' || p_item_id;

  select user_id, access_token_secret_id into owner, old_secret from public.plaid_items where item_id = p_item_id;
  if owner is not null and owner <> p_user_id then raise exception 'Plaid item belongs to another user'; end if;

  select id into named_secret from vault.secrets where name = secret_name;

  if old_secret is not null and exists (select 1 from vault.secrets where id = old_secret) then
    perform vault.update_secret(old_secret, p_access_token, secret_name, 'Wallex Plaid access token');
    new_secret := old_secret;
    if named_secret is not null and named_secret <> old_secret then delete from vault.secrets where id = named_secret; end if;
  elsif named_secret is not null then
    perform vault.update_secret(named_secret, p_access_token, secret_name, 'Wallex Plaid access token');
    new_secret := named_secret;
  else
    new_secret := vault.create_secret(p_access_token, secret_name, 'Wallex Plaid access token');
  end if;

  insert into public.plaid_items (user_id, item_id, institution_id, institution_name, access_token_secret_id)
  values (p_user_id, p_item_id, nullif(trim(p_institution_id), ''), nullif(trim(p_institution_name), ''), new_secret)
  on conflict (item_id) do update set
    institution_id = coalesce(excluded.institution_id, public.plaid_items.institution_id),
    institution_name = excluded.institution_name,
    access_token_secret_id = excluded.access_token_secret_id
  returning id into row_id;

  return row_id;
end;
$$;

create or replace function public.delete_plaid_item_for(p_user_id uuid, p_item_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  secret_id uuid;
begin
  select access_token_secret_id into secret_id from public.plaid_items where user_id = p_user_id and item_id = p_item_id;
  delete from public.plaid_items where user_id = p_user_id and item_id = p_item_id;
  if secret_id is not null then delete from vault.secrets where id = secret_id; end if;
end;
$$;

revoke all on function public.plaid_items_for_user(uuid) from public, anon, authenticated;
revoke all on function public.store_plaid_item_for(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.delete_plaid_item_for(uuid, text) from public, anon, authenticated;
grant execute on function public.plaid_items_for_user(uuid) to service_role;
grant execute on function public.store_plaid_item_for(uuid, text, text, text, text) to service_role;
grant execute on function public.delete_plaid_item_for(uuid, text) to service_role;

-- The app no longer sends tokens to the database, so the functions that accepted them from a signed-in person go.
drop function if exists public.store_plaid_item(text, text, text);
drop function if exists public.delete_plaid_item(text);
