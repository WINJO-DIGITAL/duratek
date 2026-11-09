-- Trade portal: customers, projects with rooms, quote ownership checks,
-- branding on the customer copy, logo storage. Run with: npm run db:test
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-e000-000000000001', 'a@portal.local', '{"company_name":"A Floors"}'),
  ('00000000-0000-4000-e000-000000000002', 'b@portal.local', '{"company_name":"B Floors"}'),
  ('00000000-0000-4000-e000-000000000003', 'pending@portal.local', '{"company_name":"Waiting"}');
update public.profiles set status = 'approved', tier_id = (select id from public.price_tiers where name like 'Demo tier A%')
  where id in ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-e000-000000000002');

-- ---------------------------------------------------------------------------
-- Trader A: customer, project with rooms, quote, branding
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-e000-000000000001","role":"authenticated"}';
select lives_ok($$insert into public.customers (name, email, postcode) values ('Mrs Smith', 'smith@home.local', 'LA9 4AA')$$, 'trader adds a customer');
select throws_ok($$insert into public.customers (name, postcode) values ('Bad', 'nowhere')$$, '23514', null, 'a bad postcode is refused');
select lives_ok($$insert into public.projects (name, customer_id) select 'Smith house', id from public.customers where name = 'Mrs Smith'$$, 'trader creates a project for their customer');
select lives_ok(
  $$insert into public.project_items (project_id, room_name, length_m, width_m, wastage_pct, finish_id)
    select p.id, 'Kitchen', 5, 4, 10, f.id from public.projects p, public.finishes f where p.name = 'Smith house' and f.slug = 'keswick-oak'$$,
  'trader adds a measured room');
select throws_ok(
  $$insert into public.project_items (project_id, room_name, length_m, width_m) select id, 'Bad', -1, 4 from public.projects where name = 'Smith house'$$,
  '23514', null, 'a negative measurement is refused');
select lives_ok(
  $$insert into public.quotes (customer_name, customer_id, project_id, contingency_bp)
    select 'Mrs Smith', c.id, p.id, 500 from public.customers c, public.projects p where c.name = 'Mrs Smith' and p.name = 'Smith house'$$,
  'trader quotes from their project for their customer');
select lives_ok(
  $$insert into public.quote_lines (quote_id, kind, description, quantity, unit, unit_cost_pence, unit_sell_pence, room_name)
    select id, 'flooring', 'Keswick Oak', 10, 'pack', 4911, 6875, 'Kitchen' from public.quotes where customer_name = 'Mrs Smith'$$,
  'flooring line for a room');
select lives_ok(
  $$insert into public.quote_lines (quote_id, kind, description, quantity, unit, unit_cost_pence, unit_sell_pence)
    select id, k::public.quote_line_kind, k, 1, 'item', 1000, 1500 from public.quotes, unnest(array['underlay','trim','adhesive','delivery','expense']) k where customer_name = 'Mrs Smith'$$,
  'underlay, trim, adhesive, delivery and expense lines');
select throws_ok($$insert into public.quotes (customer_name, contingency_bp) values ('X', 9000)$$, '23514', null, 'contingency above 50% is refused');
select lives_ok(
  $$insert into public.trade_preferences (display_name, contact_email, contact_phone, website, brand_colour, logo_path, labour_per_m2_pence)
    values ('A Floors Ltd', 'hello@afloors.local', '01539 000111', 'https://afloors.local', '#2B5D3A', '00000000-0000-4000-e000-000000000001/logo.png', 1500)$$,
  'trader saves their branding');
select throws_ok($$update public.trade_preferences set brand_colour = 'red'$$, '23514', null, 'a brand colour must be a hex colour');
select throws_ok($$update public.trade_preferences set website = 'javascript:alert(1)'$$, '23514', null, 'a website must be https');
select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner) values ('trade-logos', '00000000-0000-4000-e000-000000000001/logo.png', '00000000-0000-4000-e000-000000000001')$$,
  'trader uploads a logo into their own folder');
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner) values ('trade-logos', '00000000-0000-4000-e000-000000000002/logo.png', '00000000-0000-4000-e000-000000000001')$$,
  '42501', null, 'trader cannot put a logo in another trader''s folder');
reset role;

-- ---------------------------------------------------------------------------
-- Trader B cannot see or use any of it
-- ---------------------------------------------------------------------------
select set_config('test.customer', (select id::text from public.customers where name = 'Mrs Smith'), true);
select set_config('test.project', (select id::text from public.projects where name = 'Smith house'), true);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-e000-000000000002","role":"authenticated"}';
select is((select count(*)::int from public.customers), 0, 'another trader sees none of the customers');
select is((select count(*)::int from public.project_items), 0, 'another trader sees none of the rooms');
select throws_ok(
  $$insert into public.quotes (customer_name, customer_id) values ('Hijack', current_setting('test.customer')::uuid)$$,
  '42501', null, 'another trader cannot quote against the customer, even knowing its id');
select throws_ok(
  $$insert into public.projects (name, customer_id) values ('Hijack', current_setting('test.customer')::uuid)$$,
  '42501', null, 'another trader cannot attach a project to the customer');
select throws_ok(
  $$insert into public.project_items (project_id, room_name) values (current_setting('test.project')::uuid, 'Hijack')$$,
  '42501', null, 'another trader cannot add a room to the project');
reset role;

-- ---------------------------------------------------------------------------
-- Pending accounts and the public
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-e000-000000000003","role":"authenticated"}';
select throws_ok($$insert into public.customers (name) values ('X')$$, '42501', null, 'a pending account cannot add customers');
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok('select * from public.customers', '42501', null, 'anon cannot read customers');
reset role;

-- ---------------------------------------------------------------------------
-- The customer copy: branding and rooms, never costs or contingency
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{}';
update public.quotes set status = 'sent', sent_at = now() where customer_name = 'Mrs Smith';
select set_config('test.token', (select share_token from public.quotes where customer_name = 'Mrs Smith'), true);
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is(public.get_shared_quote(current_setting('test.token')) -> 'trader' ->> 'company_name', 'A Floors Ltd', 'the customer copy carries the trader''s business name');
select is(public.get_shared_quote(current_setting('test.token')) -> 'trader' ->> 'brand_colour', '#2B5D3A', '...and brand colour');
select is(public.get_shared_quote(current_setting('test.token')) -> 'lines' -> 0 ->> 'room_name', 'Kitchen', '...and room names');
select is(jsonb_array_length(public.get_shared_quote(current_setting('test.token')) -> 'lines'), 6, 'every line is there');
-- Check keys and values, not digits in random ids (a uuid can contain "4911" by chance).
select ok(
  public.get_shared_quote(current_setting('test.token'))::text !~ '(unit_cost|contingency|smith@home)'
  and not exists (select 1 from jsonb_array_elements(public.get_shared_quote(current_setting('test.token')) -> 'lines') l
                  where exists (select 1 from jsonb_each(l) e where e.key ~ 'cost' or e.value::text = '4911')),
  'no cost, contingency or customer email in the customer copy');
select ok(public.get_shared_quote(current_setting('test.token')) -> 'lines' -> 0 ? 'unit_sell_pence', 'sell prices are there');
reset role;

select * from finish();
rollback;
