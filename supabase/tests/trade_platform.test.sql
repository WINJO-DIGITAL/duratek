-- Trade platform RLS tests: preferences, quotes, quote lines, customer quote
-- links and the owner's dashboard. Run with: npm run db:test
begin;
create extension if not exists pgtap with schema extensions;
select plan(37);

-- ---------------------------------------------------------------------------
-- Fixtures (as postgres)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-b000-000000000001', 'pending@quotes.local', '{"company_name":"Pending Floors"}'),
  ('00000000-0000-4000-b000-000000000002', 'fitter-a@quotes.local', '{"company_name":"A Floors","contact_name":"Alex"}'),
  ('00000000-0000-4000-b000-000000000003', 'fitter-b@quotes.local', '{"company_name":"B Floors"}'),
  ('00000000-0000-4000-b000-000000000005', 'owner@quotes.local', '{}');

update public.profiles set status = 'approved', tier_id = (select id from public.price_tiers where name like 'Demo tier A%')
  where id in ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-b000-000000000003');
update public.profiles set status = 'approved', is_admin = true where id = '00000000-0000-4000-b000-000000000005';

-- ---------------------------------------------------------------------------
-- Approved trader A builds a quote
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-b000-000000000002","role":"authenticated"}';

select lives_ok(
  $$insert into public.trade_preferences (default_markup_bp, quote_footer) values (4000, 'Thanks from A Floors')$$,
  'approved trader can save their preferences');
select lives_ok(
  $$insert into public.quotes (customer_name, customer_email, site_postcode) values ('Mrs Smith', 'smith@home.local', 'LA9 4AA')$$,
  'approved trader can create a quote');
select is((select reference from public.quotes where customer_name = 'Mrs Smith'), 'Q-0001', 'first quote is Q-0001');
select is((select profile_id::text from public.quotes where customer_name = 'Mrs Smith'), '00000000-0000-4000-b000-000000000002', 'quote belongs to its creator by default');
select lives_ok(
  $$insert into public.quotes (customer_name) values ('Mr Jones')$$,
  'second quote');
select is((select reference from public.quotes where customer_name = 'Mr Jones'), 'Q-0002', 'references run per trader');
select lives_ok(
  $$insert into public.quote_lines (quote_id, kind, finish_id, description, quantity, unit, unit_cost_pence, unit_sell_pence, area_m2, wastage_pct)
    select q.id, 'flooring', f.id, 'Keswick Oak', 10, 'pack', 4000, 5600, 20, 10
    from public.quotes q, public.finishes f where q.customer_name = 'Mrs Smith' and f.slug = 'keswick-oak'$$,
  'approved trader can add a flooring line');
select lives_ok(
  $$insert into public.quote_lines (quote_id, kind, description, quantity, unit, unit_cost_pence, unit_sell_pence)
    select id, 'labour', 'Fitting', 20, 'm2', 0, 1200 from public.quotes where customer_name = 'Mrs Smith'$$,
  'approved trader can add a labour line');
select throws_ok(
  $$insert into public.quotes (profile_id, customer_name) values ('00000000-0000-4000-b000-000000000003', 'Spoofed')$$,
  '42501', null, 'trader cannot create a quote for another trader');
select throws_ok(
  $$insert into public.quote_lines (quote_id, kind, description, quantity, unit, unit_sell_pence) values (gen_random_uuid(), 'other', 'x', 1, 'item', 1)$$,
  '42501', null, 'trader cannot add a line to a quote that is not theirs');
reset role;

-- A quote for trader B, written as postgres.
insert into public.quotes (profile_id, customer_name, status) values ('00000000-0000-4000-b000-000000000003', 'B customer', 'sent');
insert into public.quote_lines (quote_id, kind, description, quantity, unit, unit_cost_pence, unit_sell_pence)
  select id, 'other', 'B line', 1, 'item', 100, 200 from public.quotes where customer_name = 'B customer';

-- ---------------------------------------------------------------------------
-- Isolation between traders
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-b000-000000000002","role":"authenticated"}';
select is((select count(*)::int from public.quotes), 2, 'trader A sees only their own quotes');
select is((select count(*)::int from public.quote_lines), 2, 'trader A sees only their own quote lines');
select is((select count(*)::int from public.trade_preferences), 1, 'trader A sees only their own preferences');
update public.quotes set customer_name = 'Hijacked' where customer_name = 'B customer';
reset role;
select is((select count(*)::int from public.quotes where customer_name = 'Hijacked'), 0, 'trader A cannot edit trader B''s quote');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-b000-000000000003","role":"authenticated"}';
select is((select count(*)::int from public.quotes), 1, 'trader B sees only their own quote');
select is((select count(*)::int from public.quote_lines where description = 'Keswick Oak'), 0, 'trader B cannot see trader A''s costs');
delete from public.quote_lines where description = 'Keswick Oak';
reset role;
select is((select count(*)::int from public.quote_lines where description = 'Keswick Oak'), 1, 'trader B cannot delete trader A''s lines');

-- ---------------------------------------------------------------------------
-- Pending applicant and the owner have no row access
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-b000-000000000001","role":"authenticated"}';
select is((select count(*)::int from public.quotes), 0, 'pending applicant sees no quotes');
select throws_ok(
  $$insert into public.quotes (customer_name) values ('Pending attempt')$$,
  '42501', null, 'pending applicant cannot create a quote');
select throws_ok(
  $$insert into public.trade_preferences (default_markup_bp) values (1)$$,
  '42501', null, 'pending applicant cannot save preferences');
select throws_ok('select public.admin_dashboard_stats()', '42501', null, 'non-admin cannot read the dashboard figures');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-b000-000000000005","role":"authenticated"}';
select is((select count(*)::int from public.quotes), 0, 'owner has no row access to traders'' quotes');
select is((select count(*)::int from public.quote_lines), 0, 'owner cannot read traders'' costs');
select is(((select public.admin_dashboard_stats()) -> 'quotes' ->> 'sent')::int, 1, 'owner sees quote counts by status');
select is(
  ((select public.admin_dashboard_stats()) -> 'quoted_m2_by_finish_90d' -> 0 ->> 'm2')::numeric, 20.00::numeric,
  'owner sees m2 quoted per finish');
select ok(
  (select public.admin_dashboard_stats())::text !~ '(unit_cost|unit_sell|smith@home|Mrs Smith)',
  'dashboard figures hold no prices, costs or customer details');
reset role;

-- ---------------------------------------------------------------------------
-- anon and the customer link
-- ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok('select * from public.quotes', '42501', null, 'anon cannot read quotes');
select throws_ok('select * from public.quote_lines', '42501', null, 'anon cannot read quote lines');
select throws_ok('select public.admin_dashboard_stats()', '42501', null, 'anon cannot read the dashboard figures');
reset role;

-- Draft quotes are not shared.
select set_config('test.token_a', (select share_token from public.quotes where customer_name = 'Mrs Smith'), true);
set local role anon;
select is(public.get_shared_quote(current_setting('test.token_a')), null, 'a draft quote cannot be opened by link');
reset role;

update public.quotes set status = 'sent', sent_at = now() where customer_name = 'Mrs Smith';

set local role anon;
select is(public.get_shared_quote(current_setting('test.token_a')) ->> 'reference', 'Q-0001', 'a sent quote opens by link');
select is(jsonb_array_length(public.get_shared_quote(current_setting('test.token_a')) -> 'lines'), 2, 'the customer sees every line');
select ok(
  public.get_shared_quote(current_setting('test.token_a'))::text !~ '(unit_cost|4000|smith@home)',
  'the customer copy has no cost and no customer email');
select is(public.get_shared_quote('short'), null, 'a short token returns nothing');
select is(public.respond_to_quote(current_setting('test.token_a'), 'maybe'), null, 'only accept or decline');
select is(public.respond_to_quote(current_setting('test.token_a'), 'accepted'), 'accepted', 'the customer can accept a sent quote');
select is(public.respond_to_quote(current_setting('test.token_a'), 'declined'), null, 'an answered quote cannot be changed by link');
reset role;

select * from finish();
rollback;
