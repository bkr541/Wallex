-- The Rules tab: how Wallex counts money (card payments, income, bill categories, ignored merchants, Patterns defaults).
-- Stored as one JSON object on the user's settings row; the app fills in anything missing with its defaults.
alter table public.user_settings
  add column if not exists rules jsonb not null default '{}'::jsonb;
