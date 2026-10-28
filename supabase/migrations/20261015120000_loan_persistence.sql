-- Wallex: loans and pay-later repayments, kept in the signed-in person's account instead of on one device.
--
-- Six tables, all owned by one user:
--   loans                    the loan itself (lender, financed amount, schedule terms, type)
--   loan_bnpl_purchases      what a pay-later loan paid for (store, category, price, down payment)
--   loan_installment_links   bank transactions the person confirmed as paying an installment
--   loan_manual_payments     payments the person recorded by hand
--   loan_adjustments         waived or canceled installments, recorded fees
--   loan_transaction_roles   bank transactions tied to a loan as its purchase, down payment, fee, refund
--
-- Ownership: every table's primary key starts with user_id, and every child table points at its loan with a composite
-- foreign key (user_id, loan_id) -> loans (user_id, id). A child row can therefore only exist under a loan with the same
-- owner, and row-level security limits every row to its owner, so nobody can read, change, delete or attach anything to
-- another person's records.
--
-- Money is whole cents (bigint). Ids are the text ids the app already uses, so loans saved before accounts keep theirs.
--
-- Syncing between devices: each row carries a revision that goes up by one on every update, so a device can write
-- "only if nobody changed it since I last read it". Deleting sets deleted_at (a tombstone) instead of removing the row,
-- so a device that was offline cannot bring a deleted loan back by writing its old copy.

-- Triggers shared by the six tables --------------------------------------------------------------------------------

create or replace function public.bump_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.revision = old.revision + 1;
  return new;
end;
$$;

-- Who owns a row, and which loan a child row belongs to, can never be changed after it is written.
create or replace function public.lock_loan_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id
     or to_jsonb(new) ->> 'id' is distinct from to_jsonb(old) ->> 'id'
     or to_jsonb(new) ->> 'loan_id' is distinct from to_jsonb(old) ->> 'loan_id' then
    raise exception 'The owner and identity of a loan record cannot change' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- A live row can only hang off a live loan. This is what stops an offline device from adding payments to a loan that
-- was deleted somewhere else.
create or replace function public.require_live_loan()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deleted_at is null
     and not exists (
       select 1 from public.loans l
       where l.user_id = new.user_id and l.id = new.loan_id and l.deleted_at is null
     ) then
    raise exception 'The loan this belongs to has been deleted' using errcode = '23503';
  end if;
  return new;
end;
$$;

-- Deleting a loan deletes what hangs off it, with the same tombstone.
create or replace function public.tombstone_loan_children()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update public.loan_bnpl_purchases set deleted_at = new.deleted_at, deleted_by = new.deleted_by
      where user_id = new.user_id and loan_id = new.id and deleted_at is null;
    update public.loan_installment_links set deleted_at = new.deleted_at, deleted_by = new.deleted_by
      where user_id = new.user_id and loan_id = new.id and deleted_at is null;
    update public.loan_manual_payments set deleted_at = new.deleted_at, deleted_by = new.deleted_by
      where user_id = new.user_id and loan_id = new.id and deleted_at is null;
    update public.loan_adjustments set deleted_at = new.deleted_at, deleted_by = new.deleted_by
      where user_id = new.user_id and loan_id = new.id and deleted_at is null;
    update public.loan_transaction_roles set deleted_at = new.deleted_at, deleted_by = new.deleted_by
      where user_id = new.user_id and loan_id = new.id and deleted_at is null;
  end if;
  return new;
end;
$$;

-- Tables ------------------------------------------------------------------------------------------------------------

create table public.loans (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 80),
  lender text not null check (char_length(lender) <= 120),
  item text not null default '' check (char_length(item) <= 500),
  amount_cents bigint not null check (amount_cents > 0), -- what was financed, after any down payment
  apr numeric(7, 4) not null default 0 check (apr >= 0 and apr <= 100),
  installment_count smallint not null check (installment_count between 1 and 600),
  frequency text not null check (frequency in ('weekly', 'biweekly', 'monthly')),
  first_date date not null,
  loan_type text check (loan_type in ('bnpl', 'personal', 'auto', 'other')), -- null: saved before types existed, not yet chosen
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by text, -- the device that deleted it
  primary key (user_id, id)
);

create table public.loan_bnpl_purchases (
  user_id uuid not null,
  loan_id text not null,
  merchant text check (char_length(merchant) <= 200),
  category text check (char_length(category) <= 200),
  purchase_date date,
  purchase_cents bigint check (purchase_cents > 0), -- the full price, before any down payment
  down_payment_cents bigint check (down_payment_cents >= 0),
  plan_id text check (char_length(plan_id) <= 200),
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by text,
  primary key (user_id, loan_id),
  foreign key (user_id, loan_id) references public.loans (user_id, id) on delete cascade
);

create table public.loan_installment_links (
  user_id uuid not null,
  id text not null check (char_length(id) between 1 and 300), -- "<loan id>:<installment>:<transaction id>"
  loan_id text not null,
  installment smallint not null check (installment >= 1),
  lender text not null default '',
  txn_id text not null check (char_length(txn_id) between 1 and 200),
  account_id text not null,
  expected_cents bigint not null check (expected_cents > 0),
  actual_cents bigint not null check (actual_cents > 0),
  expected_date date not null,
  actual_date date not null,
  status text not null check (status in ('linked', 'rejected')),
  source text not null check (source in ('suggestion', 'manual')),
  pending_at_link boolean not null default false,
  previous_txn_ids text[] not null default '{}',
  client_created_at timestamptz,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by text,
  primary key (user_id, id),
  foreign key (user_id, loan_id) references public.loans (user_id, id) on delete cascade
);
-- One outgoing transaction pays one installment.
create unique index loan_installment_links_one_payment_per_txn
  on public.loan_installment_links (user_id, txn_id) where status = 'linked' and deleted_at is null;

create table public.loan_manual_payments (
  user_id uuid not null,
  id text not null check (char_length(id) between 1 and 80),
  loan_id text not null,
  installment smallint check (installment >= 1), -- null: goes to the oldest unpaid installment
  amount_cents bigint not null check (amount_cents > 0),
  paid_on date not null,
  source text not null check (source in ('bank-transfer', 'debit-card', 'credit-card', 'lender-app', 'cash', 'other')),
  note text check (char_length(note) <= 500),
  client_created_at timestamptz,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by text,
  primary key (user_id, id),
  foreign key (user_id, loan_id) references public.loans (user_id, id) on delete cascade
);

create table public.loan_adjustments (
  user_id uuid not null,
  id text not null check (char_length(id) between 1 and 80),
  loan_id text not null,
  kind text not null check (kind in ('waived', 'canceled', 'fee')),
  installment smallint check (installment >= 1),
  amount_cents bigint check (amount_cents > 0),
  adjusted_on date,
  note text check (char_length(note) <= 500),
  client_created_at timestamptz,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by text,
  primary key (user_id, id),
  foreign key (user_id, loan_id) references public.loans (user_id, id) on delete cascade,
  check ((kind in ('waived', 'canceled') and installment is not null) or (kind = 'fee' and amount_cents is not null))
);

create table public.loan_transaction_roles (
  user_id uuid not null,
  id text not null check (char_length(id) between 1 and 300), -- "<loan id>:<transaction id>"
  loan_id text not null,
  txn_id text not null check (char_length(txn_id) between 1 and 200),
  account_id text not null,
  role text not null check (role in ('purchase', 'down-payment', 'fee', 'refund', 'adjustment')),
  amount_cents bigint not null check (amount_cents <> 0), -- the transaction's amount: negative out, positive in
  txn_date date not null,
  note text check (char_length(note) <= 500),
  client_created_at timestamptz,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by text,
  primary key (user_id, id),
  foreign key (user_id, loan_id) references public.loans (user_id, id) on delete cascade
);
-- A transaction has one role.
create unique index loan_transaction_roles_one_role_per_txn
  on public.loan_transaction_roles (user_id, txn_id) where deleted_at is null;

-- Indexes for the foreign keys: finding a loan's rows, and cascading.
create index loan_installment_links_loan_idx on public.loan_installment_links (user_id, loan_id);
create index loan_manual_payments_loan_idx on public.loan_manual_payments (user_id, loan_id);
create index loan_adjustments_loan_idx on public.loan_adjustments (user_id, loan_id);
create index loan_transaction_roles_loan_idx on public.loan_transaction_roles (user_id, loan_id);

-- Triggers ----------------------------------------------------------------------------------------------------------

create trigger loans_lock_identity before update on public.loans for each row execute function public.lock_loan_identity();
create trigger loans_revision before update on public.loans for each row execute function public.bump_revision();
create trigger loans_updated_at before update on public.loans for each row execute function public.set_updated_at();
create trigger loans_tombstone_children after update on public.loans for each row execute function public.tombstone_loan_children();

create trigger loan_bnpl_purchases_lock_identity before update on public.loan_bnpl_purchases for each row execute function public.lock_loan_identity();
create trigger loan_bnpl_purchases_revision before update on public.loan_bnpl_purchases for each row execute function public.bump_revision();
create trigger loan_bnpl_purchases_updated_at before update on public.loan_bnpl_purchases for each row execute function public.set_updated_at();
create trigger loan_bnpl_purchases_live_loan before insert or update on public.loan_bnpl_purchases for each row execute function public.require_live_loan();

create trigger loan_installment_links_lock_identity before update on public.loan_installment_links for each row execute function public.lock_loan_identity();
create trigger loan_installment_links_revision before update on public.loan_installment_links for each row execute function public.bump_revision();
create trigger loan_installment_links_updated_at before update on public.loan_installment_links for each row execute function public.set_updated_at();
create trigger loan_installment_links_live_loan before insert or update on public.loan_installment_links for each row execute function public.require_live_loan();

create trigger loan_manual_payments_lock_identity before update on public.loan_manual_payments for each row execute function public.lock_loan_identity();
create trigger loan_manual_payments_revision before update on public.loan_manual_payments for each row execute function public.bump_revision();
create trigger loan_manual_payments_updated_at before update on public.loan_manual_payments for each row execute function public.set_updated_at();
create trigger loan_manual_payments_live_loan before insert or update on public.loan_manual_payments for each row execute function public.require_live_loan();

create trigger loan_adjustments_lock_identity before update on public.loan_adjustments for each row execute function public.lock_loan_identity();
create trigger loan_adjustments_revision before update on public.loan_adjustments for each row execute function public.bump_revision();
create trigger loan_adjustments_updated_at before update on public.loan_adjustments for each row execute function public.set_updated_at();
create trigger loan_adjustments_live_loan before insert or update on public.loan_adjustments for each row execute function public.require_live_loan();

create trigger loan_transaction_roles_lock_identity before update on public.loan_transaction_roles for each row execute function public.lock_loan_identity();
create trigger loan_transaction_roles_revision before update on public.loan_transaction_roles for each row execute function public.bump_revision();
create trigger loan_transaction_roles_updated_at before update on public.loan_transaction_roles for each row execute function public.set_updated_at();
create trigger loan_transaction_roles_live_loan before insert or update on public.loan_transaction_roles for each row execute function public.require_live_loan();

-- Row-level security -------------------------------------------------------------------------------------------------
-- Every row is visible and changeable only to the user it belongs to. "with check" stops anyone writing a row that
-- names another user, and the composite foreign keys stop a child from pointing at another user's loan.

alter table public.loans enable row level security;
alter table public.loan_bnpl_purchases enable row level security;
alter table public.loan_installment_links enable row level security;
alter table public.loan_manual_payments enable row level security;
alter table public.loan_adjustments enable row level security;
alter table public.loan_transaction_roles enable row level security;

create policy "Users read their own loans" on public.loans for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users add their own loans" on public.loans for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users change their own loans" on public.loans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users remove their own loans" on public.loans for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users read their own purchases" on public.loan_bnpl_purchases for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users add their own purchases" on public.loan_bnpl_purchases for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users change their own purchases" on public.loan_bnpl_purchases for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users remove their own purchases" on public.loan_bnpl_purchases for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users read their own links" on public.loan_installment_links for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users add their own links" on public.loan_installment_links for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users change their own links" on public.loan_installment_links for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users remove their own links" on public.loan_installment_links for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users read their own payments" on public.loan_manual_payments for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users add their own payments" on public.loan_manual_payments for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users change their own payments" on public.loan_manual_payments for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users remove their own payments" on public.loan_manual_payments for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users read their own adjustments" on public.loan_adjustments for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users add their own adjustments" on public.loan_adjustments for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users change their own adjustments" on public.loan_adjustments for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users remove their own adjustments" on public.loan_adjustments for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users read their own roles" on public.loan_transaction_roles for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users add their own roles" on public.loan_transaction_roles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users change their own roles" on public.loan_transaction_roles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users remove their own roles" on public.loan_transaction_roles for delete to authenticated using ((select auth.uid()) = user_id);

-- Nothing here is for signed-out visitors.
revoke all on table public.loans, public.loan_bnpl_purchases, public.loan_installment_links, public.loan_manual_payments,
  public.loan_adjustments, public.loan_transaction_roles from anon;
grant select, insert, update, delete on table public.loans, public.loan_bnpl_purchases, public.loan_installment_links,
  public.loan_manual_payments, public.loan_adjustments, public.loan_transaction_roles to authenticated;
