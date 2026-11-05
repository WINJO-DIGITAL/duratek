-- RLS tests. Run with: npm run db:test  (supabase test db)
-- Each block impersonates a user by setting the role and JWT claims that
-- PostgREST would set, then checks what that user can read and write.
begin;
create extension if not exists pgtap with schema extensions;
select plan(44);

-- ---------------------------------------------------------------------------
-- Fixtures (as postgres)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-a000-000000000001', 'pending@test.local', '{"company_name":"Pending Ltd","trade_type":"fitter","status":"approved","is_admin":true}'),
  ('00000000-0000-4000-a000-000000000002', 'tier-a@test.local', '{"company_name":"Tier A Ltd"}'),
  ('00000000-0000-4000-a000-000000000003', 'tier-b@test.local', '{"company_name":"Tier B Ltd"}'),
  ('00000000-0000-4000-a000-000000000004', 'rejected@test.local', '{}'),
  ('00000000-0000-4000-a000-000000000005', 'admin@test.local', '{}');

select is(
  (select status::text || '/' || is_admin::text from public.profiles where id = '00000000-0000-4000-a000-000000000001'),
  'pending/false',
  'signup metadata cannot set status or is_admin'
);

update public.profiles set status = 'approved', tier_id = (select id from public.price_tiers where name like 'Demo tier A%')
  where id = '00000000-0000-4000-a000-000000000002';
update public.profiles set status = 'approved', tier_id = (select id from public.price_tiers where name like 'Demo tier B%')
  where id = '00000000-0000-4000-a000-000000000003';
update public.profiles set status = 'rejected', tier_id = (select id from public.price_tiers where name like 'Demo tier A%')
  where id = '00000000-0000-4000-a000-000000000004';
update public.profiles set status = 'approved', is_admin = true where id = '00000000-0000-4000-a000-000000000005';

insert into public.price_overrides (finish_id, profile_id, price_per_m2_pence)
  select id, '00000000-0000-4000-a000-000000000003', 1500 from public.finishes where slug = 'keswick-oak';

insert into public.finishes (name, slug, style, colour_family, published) values ('Hidden Draft', 'hidden-draft', 'plank', 'natural', false);
insert into public.finish_images (finish_id, url, kind, alt)
  select id, 'https://example.com/x.jpg', 'room', 'draft' from public.finishes where slug = 'hidden-draft';

insert into public.documents (title, type, storage_path, trade_only) values
  ('Public brochure', 'brochure', 'test/brochure.pdf', false),
  ('Trade tech sheet', 'tech_sheet', 'test/tech.pdf', true);

insert into public.sample_requests (name, email, address_line1, town, postcode, finish_ids)
  select 'Test Person', 'person@test.local', '1 High Street', 'Kendal', 'LA9 4AA', array[id] from public.finishes where slug = 'keswick-oak';

insert into public.shortlists (profile_id, name, token, finish_ids)
  select '00000000-0000-4000-a000-000000000002', 'Smith kitchen', 'test-token-abcdefghijklmnop', array[id]
  from public.finishes where slug = 'keswick-oak';

-- ---------------------------------------------------------------------------
-- anon (logged out)
-- ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select is((select count(*)::int from public.finishes), 11, 'anon sees the 11 published finishes');
select is((select count(*)::int from public.finishes where slug = 'hidden-draft'), 0, 'anon cannot see an unpublished finish');
select is((select count(*)::int from public.finish_images i join public.finishes f on f.id = i.finish_id where f.slug = 'hidden-draft'), 0, 'anon cannot see images of an unpublished finish');
select throws_ok('select * from public.prices', '42501', null, 'anon cannot read prices');
select throws_ok('select * from public.price_overrides', '42501', null, 'anon cannot read price overrides');
select is((select count(*)::int from public.finishes where rrp_per_m2_pence = 3333), 11, 'anon can read the public RRP');
update public.finishes set rrp_per_m2_pence = 1;
select is((select count(*)::int from public.finishes where rrp_per_m2_pence = 1), 0, 'anon cannot change an RRP');
select throws_ok('select * from public.my_prices', '42501', null, 'anon cannot read my_prices');
select throws_ok('select * from public.price_tiers', '42501', null, 'anon cannot read price tiers');
select throws_ok('select * from public.profiles', '42501', null, 'anon cannot read profiles');
select throws_ok('select * from public.sample_requests', '42501', null, 'anon cannot read sample requests');
select throws_ok(
  $$insert into public.sample_requests (name, email, address_line1, town, postcode, finish_ids) values ('x', 'x@y.zz', '1', 'T', 'LA9 4AA', '{}')$$,
  '42501', null, 'anon cannot insert sample requests directly (server route only)');
select is((select count(*)::int from public.documents), 1, 'anon sees only public documents');
select is((select count(*)::int from public.online_retailers), 1, 'anon sees published online retailers');
select is((select count(*)::int from public.inspiration), 10, 'anon sees published inspiration');
select is((select name from public.get_shared_shortlist('test-token-abcdefghijklmnop')), 'Smith kitchen', 'anon can open a shared shortlist by token');
select is((select count(*)::int from public.get_shared_shortlist('test-token')), 0, 'a short or wrong token returns nothing');
select throws_ok('select public.is_admin()', '42501', null, 'anon cannot call role helpers');
reset role;

-- ---------------------------------------------------------------------------
-- pending trade applicant
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated"}';

select is((select count(*)::int from public.prices), 0, 'pending user sees no prices');
select is((select count(*)::int from public.my_prices), 0, 'pending user has no effective prices');
select is((select count(*)::int from public.profiles), 1, 'pending user sees only their own profile');
select is((select count(*)::int from public.documents), 1, 'pending user sees only public documents');
select throws_ok(
  $$update public.profiles set status = 'approved' where id = '00000000-0000-4000-a000-000000000001'$$,
  'P0001', null, 'pending user cannot approve themselves');
select throws_ok(
  $$update public.profiles set is_admin = true where id = '00000000-0000-4000-a000-000000000001'$$,
  'P0001', null, 'pending user cannot make themselves admin');
select lives_ok(
  $$update public.profiles set company_name = 'Renamed Ltd' where id = '00000000-0000-4000-a000-000000000001'$$,
  'pending user can edit their own contact details');
select throws_ok(
  $$insert into public.shortlists (profile_id, name) values ('00000000-0000-4000-a000-000000000001', 'x')$$,
  '42501', null, 'pending user cannot create shortlists');
reset role;

-- ---------------------------------------------------------------------------
-- approved, tier A
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}';

select is((select count(*)::int from public.prices), 11, 'tier A user sees one price per finish');
select is((select count(distinct tier_id)::int from public.prices), 1, 'tier A user sees only their own tier');
select is((select min(price_per_m2_pence) from public.my_prices), 2222, 'tier A effective price is the tier price');
select is((select count(*)::int from public.price_overrides), 0, 'tier A user cannot see another account''s override');
select is((select count(*)::int from public.price_tiers), 1, 'tier A user sees only their own tier row');
select is((select count(*)::int from public.documents), 2, 'approved user sees trade documents');
select is((select count(*)::int from public.sample_requests), 0, 'approved trade cannot read sample requests (personal data)');
select is((select count(*)::int from public.shortlists), 1, 'approved user sees their own shortlist');
select throws_ok(
  $$insert into public.prices (finish_id, tier_id, price_per_m2_pence) select id, (select public.current_tier_id()), 1 from public.finishes limit 1$$,
  '42501', null, 'approved trade cannot write prices');
reset role;

-- ---------------------------------------------------------------------------
-- approved, tier B, with an account override on Keswick Oak
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

select is(
  (select price_per_m2_pence from public.my_prices m join public.finishes f on f.id = m.finish_id where f.slug = 'keswick-oak'),
  1500, 'account override wins over tier price');
select is(
  (select price_per_m2_pence from public.my_prices m join public.finishes f on f.id = m.finish_id where f.slug = 'fellside-oak'),
  1111, 'tier B price applies where no override');
select is((select count(*)::int from public.shortlists), 0, 'tier B user cannot see tier A user''s shortlist');
reset role;

-- ---------------------------------------------------------------------------
-- rejected (still has a tier assigned)
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000004","role":"authenticated"}';
select is((select count(*)::int from public.prices), 0, 'rejected user sees no prices even with a tier set');
reset role;

-- ---------------------------------------------------------------------------
-- admin
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000005","role":"authenticated"}';
select is((select count(*)::int from public.prices), 22, 'admin sees every tier''s prices');
update public.finishes set rrp_per_m2_pence = 4444 where slug = 'keswick-oak';
select is((select rrp_per_m2_pence from public.finishes where slug = 'keswick-oak'), 4444, 'admin can set an RRP');
select is((select count(*)::int from public.sample_requests), 1, 'admin can read sample requests');
select lives_ok(
  $$update public.profiles set status = 'approved' where id = '00000000-0000-4000-a000-000000000001'$$,
  'admin can approve an applicant');
reset role;

select * from finish();
rollback;
