-- Savings goals from the Insights tab: a list of { id, name, target, saved, monthly, created } kept on the user's settings row.
alter table public.user_settings
  add column if not exists goals jsonb not null default '[]'::jsonb;
