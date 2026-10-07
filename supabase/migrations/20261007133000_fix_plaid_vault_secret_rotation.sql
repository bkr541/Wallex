-- Make repeated Plaid connection syncs idempotent. Vault secret names are unique,
-- so an existing token must be updated instead of recreated with the same name.
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
  named_secret uuid;
  new_secret uuid;
  secret_name text;
  row_id uuid;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if coalesce(trim(p_item_id), '') = '' or coalesce(trim(p_access_token), '') = '' then
    raise exception 'Plaid item ID and access token are required';
  end if;

  secret_name := 'plaid-' || caller::text || '-' || p_item_id;

  select user_id, access_token_secret_id
    into owner, old_secret
    from public.plaid_items
    where item_id = p_item_id;

  if owner is not null and owner <> caller then
    raise exception 'Plaid item belongs to another user';
  end if;

  -- Prefer the secret referenced by the item, but also recover a named secret
  -- left behind by an interrupted or older sync.
  select id into named_secret
    from vault.secrets
    where name = secret_name;

  if old_secret is not null and exists (select 1 from vault.secrets where id = old_secret) then
    perform vault.update_secret(
      old_secret,
      p_access_token,
      secret_name,
      'Wallex Plaid access token'
    );
    new_secret := old_secret;
    if named_secret is not null and named_secret <> old_secret then
      delete from vault.secrets where id = named_secret;
    end if;
  elsif named_secret is not null then
    perform vault.update_secret(
      named_secret,
      p_access_token,
      secret_name,
      'Wallex Plaid access token'
    );
    new_secret := named_secret;
  else
    new_secret := vault.create_secret(
      p_access_token,
      secret_name,
      'Wallex Plaid access token'
    );
  end if;

  insert into public.plaid_items (user_id, item_id, institution_name, access_token_secret_id)
  values (caller, p_item_id, nullif(trim(p_institution_name), ''), new_secret)
  on conflict (item_id) do update set
    institution_name = excluded.institution_name,
    access_token_secret_id = excluded.access_token_secret_id
  returning id into row_id;

  return row_id;
end;
$$;

revoke all on function public.store_plaid_item(text, text, text) from public;
grant execute on function public.store_plaid_item(text, text, text) to authenticated;
