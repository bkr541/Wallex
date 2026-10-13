-- Developer / admin accounts. These see the developer tools in the app (the Scratchpad and the desktop / phone view switch).
-- The list can be read by the person it names and changed by nobody from the app: rows are added here, in a migration, or
-- by the project owner in the SQL editor.
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'developer')),
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

drop policy if exists "People can see their own admin row" on public.app_admins;
create policy "People can see their own admin row" on public.app_admins
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- No insert, update or delete policy exists, and the table grants below leave nothing to write with, so nobody can
-- promote themselves.
revoke all on table public.app_admins from anon, authenticated;
grant select on table public.app_admins to authenticated;

insert into public.app_admins (user_id, role)
select id, 'admin' from auth.users where id = 'f26090e7-2c2e-4194-8879-61d59ddbcae8'
on conflict (user_id) do nothing;
