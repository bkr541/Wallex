-- Checks, on the real database, that nobody can reach another person's loan records, and that the guards in
-- 20261015120000_loan_persistence.sql do what they say.
--
-- Run it with:   supabase db query --linked -f supabase/tests/loan_persistence_rls.sql
--
-- It creates two throwaway users and some loans inside a single DO block, acts as each of them (as the "authenticated"
-- role with their id in the request claims, the way the API does) and, as its last step, raises an error that carries the
-- results. That error rolls back everything the script did, including the two users. Nothing is left behind.
-- Read the lines that start "PASS" or "FAIL" in the error text.

do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a1';
  b uuid := '00000000-0000-4000-8000-0000000000b2';
  res text := '';
  n bigint;
  rev integer;
  state text;

  procedure_note text;
begin
  insert into auth.users (id, aud, role, email) values
    (a, 'authenticated', 'authenticated', 'rls-test-a@example.invalid'),
    (b, 'authenticated', 'authenticated', 'rls-test-b@example.invalid');

  -- ===== as A: write one of everything ======================================================================
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', a::text, true);
  set local role authenticated;

  insert into public.loans (user_id, id, lender, amount_cents, installment_count, frequency, first_date, loan_type)
    values (a, 'L1', 'Klarna', 40000, 4, 'monthly', '2026-02-01', 'bnpl');
  insert into public.loan_bnpl_purchases (user_id, loan_id, merchant, purchase_cents) values (a, 'L1', 'Wayfair', 50000);
  insert into public.loan_installment_links (user_id, id, loan_id, installment, txn_id, account_id, expected_cents, actual_cents, expected_date, actual_date, status, source)
    values (a, 'L1:1:t1', 'L1', 1, 't1', 'chk', 10000, 10000, '2026-02-01', '2026-02-01', 'linked', 'manual');
  insert into public.loan_manual_payments (user_id, id, loan_id, installment, amount_cents, paid_on, source) values (a, 'p1', 'L1', 2, 10000, '2026-03-01', 'cash');
  insert into public.loan_adjustments (user_id, id, loan_id, kind, amount_cents) values (a, 'adj1', 'L1', 'fee', 1234);
  insert into public.loan_transaction_roles (user_id, id, loan_id, txn_id, account_id, role, amount_cents, txn_date) values (a, 'L1:t7', 'L1', 't7', 'chk', 'fee', -750, '2026-03-10');

  select count(*) into n from public.loans;
  res := res || format(E'%s: A reads back their own loan (%s row)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);

  -- ===== as B: nothing of A's is visible or changeable ======================================================
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', b::text, true);
  set local role authenticated;

  select (select count(*) from public.loans) + (select count(*) from public.loan_bnpl_purchases) + (select count(*) from public.loan_installment_links)
       + (select count(*) from public.loan_manual_payments) + (select count(*) from public.loan_adjustments) + (select count(*) from public.loan_transaction_roles) into n;
  res := res || format(E'%s: B sees none of A''s rows in any of the six tables (%s visible)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);

  update public.loans set lender = 'Hacked' where id = 'L1';
  get diagnostics n = row_count;
  res := res || format(E'%s: B cannot update A''s loan (%s rows changed)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);

  update public.loan_manual_payments set amount_cents = 1 where id = 'p1';
  get diagnostics n = row_count;
  res := res || format(E'%s: B cannot update A''s payment (%s rows changed)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);

  delete from public.loans where id = 'L1';
  get diagnostics n = row_count;
  res := res || format(E'%s: B cannot delete A''s loan (%s rows removed)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);

  begin
    insert into public.loans (user_id, id, lender, amount_cents, installment_count, frequency, first_date) values (a, 'forged', 'X', 100, 1, 'monthly', '2026-01-01');
    res := res || E'FAIL: B was able to add a loan in A''s name\n';
  exception when others then
    get stacked diagnostics state = returned_sqlstate;
    res := res || format(E'%s: B cannot add a loan in A''s name (error %s)\n', case when state = '42501' then 'PASS' else 'FAIL' end, state);
  end;

  begin
    insert into public.loan_manual_payments (user_id, id, loan_id, amount_cents, paid_on, source) values (b, 'sneak', 'L1', 100, '2026-01-01', 'cash');
    res := res || E'FAIL: B was able to hang a payment on A''s loan\n';
  exception when others then
    get stacked diagnostics state = returned_sqlstate;
    res := res || format(E'%s: B cannot attach a payment to A''s loan (error %s)\n', case when state = '23503' then 'PASS' else 'FAIL' end, state);
  end;

  begin
    insert into public.loan_manual_payments (user_id, id, loan_id, amount_cents, paid_on, source) values (a, 'forged-child', 'L1', 100, '2026-01-01', 'cash');
    res := res || E'FAIL: B was able to add a payment in A''s name\n';
  exception when others then
    get stacked diagnostics state = returned_sqlstate;
    -- Refused either by row-level security (42501) or, first, by the "needs a live loan" guard, which cannot see A's loan as B (23503).
    res := res || format(E'%s: B cannot add a payment in A''s name (error %s)\n', case when state in ('42501', '23503') then 'PASS' else 'FAIL' end, state);
  end;

  -- B has a loan of their own, even with the same id as A's.
  insert into public.loans (user_id, id, lender, amount_cents, installment_count, frequency, first_date) values (b, 'L1', 'Affirm', 25000, 3, 'monthly', '2026-01-01');
  select count(*) into n from public.loans;
  res := res || format(E'%s: B has their own loan under the same id and sees only it (%s row)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);

  -- ===== as A again: still intact, and the guards work =======================================================
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', a::text, true);
  set local role authenticated;

  select lender, revision into state, rev from public.loans where id = 'L1';
  res := res || format(E'%s: A''s loan is untouched by B (%s, revision %s)\n', case when state = 'Klarna' and rev = 1 then 'PASS' else 'FAIL' end, state, rev);

  update public.loans set item = 'Sofa' where id = 'L1';
  select revision into rev from public.loans where id = 'L1';
  res := res || format(E'%s: an update raises the revision by one (now %s)\n', case when rev = 2 then 'PASS' else 'FAIL' end, rev);

  begin
    update public.loans set id = 'L9' where id = 'L1';
    res := res || E'FAIL: a loan''s id was changed\n';
  exception when others then
    get stacked diagnostics state = returned_sqlstate;
    res := res || format(E'%s: a loan''s id cannot be changed (error %s)\n', case when state = '23514' then 'PASS' else 'FAIL' end, state);
  end;

  begin
    insert into public.loan_installment_links (user_id, id, loan_id, installment, txn_id, account_id, expected_cents, actual_cents, expected_date, actual_date, status, source)
      values (a, 'L1:2:t1', 'L1', 2, 't1', 'chk', 10000, 10000, '2026-03-01', '2026-03-01', 'linked', 'manual');
    res := res || E'FAIL: one transaction paid two installments\n';
  exception when others then
    get stacked diagnostics state = returned_sqlstate;
    res := res || format(E'%s: one transaction cannot pay two installments (error %s)\n', case when state = '23505' then 'PASS' else 'FAIL' end, state);
  end;

  begin
    insert into public.loan_transaction_roles (user_id, id, loan_id, txn_id, account_id, role, amount_cents, txn_date) values (a, 'L1:t7b', 'L1', 't7', 'chk', 'purchase', -500, '2026-03-10');
    res := res || E'FAIL: one transaction was given two roles\n';
  exception when others then
    get stacked diagnostics state = returned_sqlstate;
    res := res || format(E'%s: one transaction cannot have two roles (error %s)\n', case when state = '23505' then 'PASS' else 'FAIL' end, state);
  end;

  begin
    insert into public.loans (user_id, id, lender, amount_cents, installment_count, frequency, first_date) values (a, 'zero', 'X', 0, 1, 'monthly', '2026-01-01');
    res := res || E'FAIL: a loan of nothing was accepted\n';
  exception when others then
    get stacked diagnostics state = returned_sqlstate;
    res := res || format(E'%s: a loan of zero cents is refused (error %s)\n', case when state = '23514' then 'PASS' else 'FAIL' end, state);
  end;

  -- Deleting a loan leaves a tombstone and takes what hangs off it.
  update public.loans set deleted_at = now(), deleted_by = 'device-1' where id = 'L1';
  select (select count(*) from public.loan_bnpl_purchases where deleted_at is null) + (select count(*) from public.loan_installment_links where deleted_at is null)
       + (select count(*) from public.loan_manual_payments where deleted_at is null) + (select count(*) from public.loan_adjustments where deleted_at is null)
       + (select count(*) from public.loan_transaction_roles where deleted_at is null) into n;
  res := res || format(E'%s: deleting a loan tombstones everything attached to it (%s still live)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from public.loans where id = 'L1';
  res := res || format(E'%s: the deleted loan is kept as a tombstone (%s row)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);

  begin
    insert into public.loan_manual_payments (user_id, id, loan_id, amount_cents, paid_on, source) values (a, 'late', 'L1', 100, '2026-04-01', 'cash');
    res := res || E'FAIL: a payment was added to a deleted loan\n';
  exception when others then
    get stacked diagnostics state = returned_sqlstate;
    res := res || format(E'%s: nothing can be added to a deleted loan (error %s)\n', case when state = '23503' then 'PASS' else 'FAIL' end, state);
  end;

  -- ===== signed out: nothing at all ==========================================================================
  reset role;
  set local role anon;
  begin
    select count(*) into n from public.loans;
    res := res || E'FAIL: a signed-out visitor could read loans\n';
  exception when others then
    get stacked diagnostics state = returned_sqlstate;
    res := res || format(E'%s: a signed-out visitor cannot read loans (error %s)\n', case when state = '42501' then 'PASS' else 'FAIL' end, state);
  end;
  reset role;

  -- Everything above is undone by this error.
  raise exception E'RLS_TEST_RESULTS\n%', res;
end;
$$;
