-- Foundation tests: roles and permissions, suspension, registration,
-- the price resolver (tiers, accounts, stockists, promotions, volume breaks,
-- future prices, VAT), audit log, settings, saved products and projects.
-- Run with: npm run db:test
begin;
create extension if not exists pgtap with schema extensions;
select plan(78);

-- ---------------------------------------------------------------------------
-- Fixtures (as postgres)
-- ---------------------------------------------------------------------------
-- Signups. One tries to make itself an approved administrator through its metadata.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-c000-000000000001', 'owner@f.local', '{}'),
  ('00000000-0000-4000-c000-000000000002', 'pricing@f.local', '{}'),
  ('00000000-0000-4000-c000-000000000003', 'fitter@f.local', '{"company_name":"Fell Floors","contact_name":"Fran","trade_type":"fitter","postcode":"la94aa","vat_number":"123456789","company_number":"12345678","website":"https://fellfloors.co.uk","additional_info":"Fitting for 12 years"}'),
  ('00000000-0000-4000-c000-000000000004', 'other@f.local', '{"company_name":"Other Floors","vat_number":"not-a-vat","postcode":"nowhere"}'),
  ('00000000-0000-4000-c000-000000000005', 'stockist@f.local', '{"company_name":"Kendal Showroom"}'),
  ('00000000-0000-4000-c000-000000000006', 'sneaky@f.local', '{"company_name":"Sneaky Ltd","status":"approved","role":"super_admin","is_admin":true}');

select is(
  (select status::text || '/' || role::text || '/' || is_admin::text from public.profiles where id = '00000000-0000-4000-c000-000000000006'),
  'pending/trade/false', 'signup metadata cannot set status, role or admin');
select is(
  (select b.postcode || '|' || b.vat_number || '|' || b.company_number || '|' || b.website from public.businesses b
   join public.profiles p on p.business_id = b.id where p.id = '00000000-0000-4000-c000-000000000003'),
  'LA9 4AA|GB123456789|12345678|https://fellfloors.co.uk', 'registration stores a normalised business record');
select is(
  (select additional_info from public.trade_applications where profile_id = '00000000-0000-4000-c000-000000000003'),
  'Fitting for 12 years', 'registration stores the application');
select is(
  (select coalesce(b.vat_number, 'none') || '|' || coalesce(b.postcode, 'none') from public.businesses b
   join public.profiles p on p.business_id = b.id where p.id = '00000000-0000-4000-c000-000000000004'),
  'none|none', 'invalid VAT number and postcode are dropped, not stored');

update public.profiles set role = 'super_admin', status = 'approved' where id = '00000000-0000-4000-c000-000000000001';
update public.profiles set role = 'admin', status = 'approved' where id = '00000000-0000-4000-c000-000000000002';
insert into public.admin_permissions (profile_id, permission) values ('00000000-0000-4000-c000-000000000002', 'manage_pricing');
update public.profiles set status = 'approved', tier_id = (select id from public.price_tiers where name like 'Demo tier A%')
  where id in ('00000000-0000-4000-c000-000000000003', '00000000-0000-4000-c000-000000000004');
update public.profiles set status = 'approved', role = 'stockist' where id = '00000000-0000-4000-c000-000000000005';

select is((select is_admin from public.profiles where id = '00000000-0000-4000-c000-000000000002'), true, 'role admin keeps the legacy is_admin flag in step');

-- Price fixtures on Keswick Oak (default variant: packs of 2.21 m²). RRP 33.33 inc VAT; tier A 22.22 ex VAT.
create temporary table k as
  select v.id as vid from public.product_variants v join public.finishes f on f.id = v.finish_id
  where f.slug = 'keswick-oak' and v.is_default;
grant select on k to anon, authenticated;
update public.price_list_items set amount_pence = 3333
  where price_list_id = (select id from public.price_lists where kind = 'rrp') and variant_id = (select vid from k);

insert into public.price_lists (code, name, kind, prices_include_vat) values ('stockist-main', 'Stockists', 'stockist', false);
insert into public.price_list_items (price_list_id, variant_id, amount_pence, price_unit)
  select id, (select vid from k), 1900, 'm2' from public.price_lists where code = 'stockist-main';

-- Volume break on tier A: 20.00 from 100 m².
insert into public.price_list_items (price_list_id, variant_id, amount_pence, price_unit, min_quantity)
  select id, (select vid from k), 2000, 'm2', 100 from public.price_lists where tier_id = (select id from public.price_tiers where name like 'Demo tier A%');
-- Future price on tier A: 25.00 from next month.
insert into public.price_list_items (price_list_id, variant_id, amount_pence, price_unit, valid_from)
  select id, (select vid from k), 2500, 'm2', now() + interval '30 days' from public.price_lists where tier_id = (select id from public.price_tiers where name like 'Demo tier A%');
-- Account price for Other Floors: 21.00.
insert into public.price_lists (code, name, kind, profile_id, prices_include_vat)
  values ('account-other', 'Other Floors', 'account', '00000000-0000-4000-c000-000000000004', false);
insert into public.price_list_items (price_list_id, variant_id, amount_pence, price_unit)
  select id, (select vid from k), 2100, 'm2' from public.price_lists where code = 'account-other';

-- ---------------------------------------------------------------------------
-- The public
-- ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is((select source::text || ':' || amount_pence from public.price_for((select vid from k))), 'rrp:3333', 'public gets the RRP');
select is((select net_pence || '/' || gross_pence || '/' || prices_include_vat from public.price_for((select vid from k))), '2778/3333/true', 'RRP is VAT inclusive: net and gross both stated');
select is((select price_unit::text from public.price_for((select vid from k))), 'm2', 'the unit the price is per is stated');
select is((select count(*)::int from public.catalogue_prices() where source <> 'rrp'), 0, 'the public catalogue holds RRPs only');
select is((select amount_pence from public.price_for((select vid from k), 1, now() + interval '60 days')), 3333, 'the public cannot look ahead in time');
select throws_ok('select * from public.price_lists', '42501', null, 'public cannot read price lists');
select throws_ok('select * from public.price_list_items', '42501', null, 'public cannot read price items');
select throws_ok('select * from public.price_for_account(''00000000-0000-4000-c000-000000000003'', (select vid from k))', '42501', null, 'public cannot ask what an account pays');
select throws_ok('select * from public.audit_log', '42501', null, 'public cannot read the audit log');
select throws_ok('select * from public.businesses', '42501', null, 'public cannot read businesses');
select is((select count(*)::int from public.system_settings where key = 'quote_validity_days'), 0, 'public reads only public settings');
select is((select value::text from public.system_settings where key = 'default_vat_rate_bp'), '2000', 'public reads the VAT rate');
reset role;

-- ---------------------------------------------------------------------------
-- Approved trade, tier A
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-c000-000000000003","role":"authenticated"}';
select is((select source::text || ':' || amount_pence from public.price_for((select vid from k))), 'trade:2222', 'tier account gets its tier price');
select is((select net_pence || '/' || gross_pence || '/' || prices_include_vat from public.price_for((select vid from k))), '2222/2666/false', 'trade price is VAT exclusive: net and gross both stated');
select is((select rrp_amount_pence from public.price_for((select vid from k))), 3333, 'trade sees the RRP alongside');
select is((select amount_pence from public.price_for((select vid from k), 46)), 2000, 'volume break: 46 packs is 101.66 m², over the 100 m² break');
select is((select amount_pence from public.price_for((select vid from k), 45)), 2222, 'just under the break (45 packs, 99.45 m²): the normal price');
select is((select amount_pence from public.price_for((select vid from k), 1, now() + interval '60 days')), 2222, 'a trade account cannot look ahead to future prices');
select is((select count(*)::int from public.price_lists), 0, 'trade cannot read price lists');
select is((select count(*)::int from public.price_list_items), 0, 'trade cannot read raw price items');
select lives_ok($$update public.price_list_items set amount_pence = 1$$, 'an update by trade touches nothing');
select throws_ok(
  $$insert into public.price_list_items (price_list_id, variant_id, amount_pence, price_unit) select (select id from public.price_lists limit 1), (select vid from k), 1, 'm2'$$,
  '42501', null, 'trade cannot write prices');
select throws_ok($$select * from public.price_for_account('00000000-0000-4000-c000-000000000004', (select vid from k))$$, '42501', null, 'trade cannot ask what another account pays');
select is((select count(*)::int from public.price_overrides), 0, 'trade cannot see another account''s negotiated prices');
select is((select count(*)::int from public.businesses), 1, 'trade reads only their own business');
select is((select count(*)::int from public.trade_applications), 1, 'trade reads only their own application');
select throws_ok($$update public.profiles set role = 'super_admin' where id = '00000000-0000-4000-c000-000000000003'$$, 'P0001', null, 'trade cannot promote themselves');
select throws_ok($$update public.profiles set business_id = null where id = '00000000-0000-4000-c000-000000000003'$$, 'P0001', null, 'trade cannot detach their business');
select throws_ok($$insert into public.admin_permissions (profile_id, permission) values ('00000000-0000-4000-c000-000000000003', 'manage_pricing')$$, 'P0001', null, 'trade cannot grant itself permissions');
select is((select count(*)::int from public.audit_log), 0, 'trade cannot read the audit log');
update public.system_settings set value = '0' where key = 'default_vat_rate_bp';
select is((select value::text from public.system_settings where key = 'default_vat_rate_bp'), '2000', 'trade cannot change settings');
select lives_ok($$insert into public.saved_products (finish_id) select id from public.finishes where slug = 'keswick-oak'$$, 'trade saves a product');
select lives_ok($$insert into public.projects (name, customer_name) values ('Smith kitchen', 'Mrs Smith')$$, 'trade creates a project');
select throws_ok($$insert into public.projects (profile_id, name) values ('00000000-0000-4000-c000-000000000004', 'Spoof')$$, '42501', null, 'trade cannot create a project for someone else');
reset role;

-- ---------------------------------------------------------------------------
-- Another approved account with negotiated prices
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-c000-000000000004","role":"authenticated"}';
select is((select source::text || ':' || amount_pence from public.price_for((select vid from k))), 'account:2100', 'account price beats the tier price');
select is((select count(*)::int from public.projects), 0, 'cannot see another trader''s projects');
select is((select count(*)::int from public.saved_products), 0, 'cannot see another trader''s saved products');
reset role;
select set_config('test.project', (select id::text from public.projects where name = 'Smith kitchen'), true);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-c000-000000000004","role":"authenticated"}';
select throws_ok(
  $$insert into public.quotes (customer_name, project_id) values ('X', current_setting('test.project')::uuid)$$,
  '42501', null, 'cannot attach a quote to another trader''s project, even knowing its id');
reset role;

-- ---------------------------------------------------------------------------
-- Stockist
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-c000-000000000005","role":"authenticated"}';
select is((select source::text || ':' || amount_pence from public.price_for((select vid from k))), 'stockist:1900', 'stockist gets the stockist price');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-c000-000000000003","role":"authenticated"}';
select is((select amount_pence from public.price_for((select vid from k))), 2222, 'a trade account never gets the stockist price');
reset role;

-- ---------------------------------------------------------------------------
-- Promotions (as postgres): a public one below the RRP, a trade one above the trade price.
-- ---------------------------------------------------------------------------
insert into public.price_lists (code, name, kind, audience, prices_include_vat, valid_to)
  values ('spring-public', 'Spring offer', 'promotion', 'public', true, now() + interval '7 days'),
         ('trade-dud', 'Trade offer', 'promotion', 'trade', false, null);
insert into public.price_list_items (price_list_id, variant_id, amount_pence, price_unit)
  select id, (select vid from k), 2999, 'm2' from public.price_lists where code = 'spring-public';
insert into public.price_list_items (price_list_id, variant_id, amount_pence, price_unit)
  select id, (select vid from k), 2300, 'm2' from public.price_lists where code = 'trade-dud';

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is((select amount_pence || ':' || is_promotion from public.price_for((select vid from k))), '2999:true', 'a public promotion below the RRP applies');
select is((select rrp_amount_pence from public.price_for((select vid from k))), 3333, 'the RRP is still reported during a promotion');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-c000-000000000003","role":"authenticated"}';
select is((select amount_pence || ':' || is_promotion from public.price_for((select vid from k))), '2222:false',
  'a promotion dearer than the trade price is ignored (the public 29.99 inc VAT is 24.99 net, the trade one 23.00)');
reset role;
update public.price_lists set active = false where code in ('spring-public', 'trade-dud');

-- ---------------------------------------------------------------------------
-- Pricing manager (admin with manage_pricing only)
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-c000-000000000002","role":"authenticated"}';
select is((select amount_pence from public.price_for((select vid from k), 1, now() + interval '60 days')), 3333, 'a pricing manager with no trade account sees the RRP for themselves...');
select is((select amount_pence from public.price_for_account('00000000-0000-4000-c000-000000000003', (select vid from k), 1, now() + interval '60 days')), 2500,
  '...and can preview what an account will pay once a future price starts');
select lives_ok(
  $$update public.price_list_items set amount_pence = 2323 where variant_id = (select vid from k) and min_quantity = 1 and valid_from is null and price_list_id = (select id from public.price_lists where tier_id = (select id from public.price_tiers where name like 'Demo tier A%'))$$,
  'pricing manager changes a tier price');
select is(
  (select price_per_m2_pence from public.prices where finish_id = (select finish_id from public.product_variants where id = (select vid from k)) and tier_id = (select id from public.price_tiers where name like 'Demo tier A%')),
  2323, 'the legacy tier price follows the price list');
select throws_ok(
  $$insert into public.price_list_items (price_list_id, variant_id, amount_pence, price_unit) select id, (select vid from k), 100, 'item' from public.price_lists where kind = 'rrp'$$,
  'P0001', null, 'a price unit that does not fit the product is refused');
select throws_ok($$update public.finishes set rrp_per_m2_pence = 1$$, '42501', null, 'nobody writes the legacy RRP column directly');
select is((select count(*)::int from public.sample_requests), 0, 'pricing manager cannot read customers'' sample requests');
select is((select count(*)::int from public.audit_log), 0, 'pricing manager cannot read the audit log without permission');
update public.profiles set status = 'approved' where id = '00000000-0000-4000-c000-000000000006';
reset role;
select is((select status::text from public.profiles where id = '00000000-0000-4000-c000-000000000006'), 'pending', 'pricing manager cannot approve accounts');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-c000-000000000002","role":"authenticated"}';
select throws_ok($$insert into public.admin_permissions (profile_id, permission) values ('00000000-0000-4000-c000-000000000002', 'view_audit')$$, 'P0001', null, 'an admin cannot grant themselves more');
select throws_ok('select public.admin_dashboard_stats()', '42501', null, 'pricing manager cannot read reports without permission');
reset role;

-- ---------------------------------------------------------------------------
-- Super administrator
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-c000-000000000001","role":"authenticated"}';
select lives_ok($$insert into public.admin_permissions (profile_id, permission) values ('00000000-0000-4000-c000-000000000002', 'view_audit')$$, 'super admin grants a permission');
select throws_ok($$insert into public.admin_permissions (profile_id, permission) values ('00000000-0000-4000-c000-000000000003', 'view_audit')$$, 'P0001', null, 'permissions only go to administrators');
select throws_ok($$update public.profiles set role = 'trade' where id = '00000000-0000-4000-c000-000000000001'$$, 'P0001', null, 'super admin cannot change their own role (no lock-out)');
select lives_ok($$update public.profiles set status = 'suspended', status_reason = 'Unpaid account' where id = '00000000-0000-4000-c000-000000000004'$$, 'super admin suspends an account');
select is((select reviewed_by::text from public.trade_applications where profile_id = '00000000-0000-4000-c000-000000000004'), '00000000-0000-4000-c000-000000000001', 'the review records who decided');
select ok((select count(*) from public.audit_log where table_name = 'profiles' and record_id = '00000000-0000-4000-c000-000000000004'
  and actor_id = '00000000-0000-4000-c000-000000000001' and 'status' = any(changed_fields)) = 1, 'the suspension is in the audit log with who did it');
select ok((select count(*) from public.audit_log where table_name = 'price_list_items' and actor_id = '00000000-0000-4000-c000-000000000002') >= 1, 'the price change is in the audit log with who did it');
select ok((select count(*) from public.audit_log where table_name = 'admin_permissions') >= 1, 'the permission grant is in the audit log');
select lives_ok($$update public.profiles set role = 'admin' where id = '00000000-0000-4000-c000-000000000006'$$, 'super admin can make someone an administrator');
reset role;

-- The pricing manager can now read the audit log.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-c000-000000000002","role":"authenticated"}';
select ok((select count(*) from public.audit_log) > 0, 'with view_audit, the audit log is readable');
select throws_ok($$delete from public.audit_log$$, '42501', null, 'not even an auditor can delete audit records');
reset role;

-- ---------------------------------------------------------------------------
-- Suspended account: nothing trade-only
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-c000-000000000004","role":"authenticated"}';
select is((select source::text from public.price_for((select vid from k))), 'rrp', 'a suspended account is back to the RRP');
select is((select count(*)::int from public.prices), 0, 'a suspended account reads no trade prices');
select throws_ok($$insert into public.quotes (customer_name) values ('X')$$, '42501', null, 'a suspended account cannot create quotes');
select throws_ok($$update public.profiles set status = 'approved' where id = '00000000-0000-4000-c000-000000000004'$$, 'P0001', null, 'a suspended account cannot reinstate itself');
reset role;

-- A suspended administrator loses their powers. (Fixture write as the database owner, no user claims.)
set local request.jwt.claims = '{}';
update public.profiles set status = 'suspended' where id = '00000000-0000-4000-c000-000000000002';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-c000-000000000002","role":"authenticated"}';
select is((select count(*)::int from public.price_lists), 0, 'a suspended administrator loses access');
reset role;

-- ---------------------------------------------------------------------------
-- The audit log is append-only, even for the database owner.
-- ---------------------------------------------------------------------------
select throws_ok($$update public.audit_log set action = 'x'$$, 'P0001', null, 'audit records cannot be edited (even as owner)');
select throws_ok($$delete from public.audit_log$$, 'P0001', null, 'audit records cannot be deleted (even as owner)');
select throws_ok($$truncate public.audit_log$$, 'P0001', null, 'the audit log cannot be truncated (even as owner)');

select * from finish();
rollback;
