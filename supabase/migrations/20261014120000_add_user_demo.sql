-- Demo mode settings (developer accounts): whether it is on and the conditions that suppress transactions.
alter table public.user_settings
  add column if not exists demo jsonb not null default '{}'::jsonb;
