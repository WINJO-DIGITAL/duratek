-- Administration, samples, stockists, enquiries, analytics and privacy controls.
-- Run with: npm run db:test
begin;
create extension if not exists pgtap with schema extensions;
select plan(57);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-f000-000000000001', 'owner@ops.local', '{"company_name":"Owner"}'),
  ('00000000-0000-4000-f000-000000000002', 'stockistadmin@ops.local', '{"company_name":"Stockist admin"}'),
  ('00000000-0000-4000-f000-000000000003', 'trader@ops.local', '{"company_name":"Trader Ltd","contact_name":"Tina Trader"}'),
  ('00000000-0000-4000-f000-000000000004', 'samplesadmin@ops.local', '{"company_name":"Samples admin"}'),
  ('00000000-0000-4000-f000-000000000005', 'rejected@ops.local', '{"company_name":"Nope Ltd"}'),
  ('00000000-0000-4000-f000-000000000006', 'products@ops.local', '{"company_name":"Products admin"}');
update public.profiles set role = 'super_admin', status = 'approved' where id = '00000000-0000-4000-f000-000000000001';
update public.profiles set role = 'admin', status = 'approved' where id in ('00000000-0000-4000-f000-000000000002', '00000000-0000-4000-f000-000000000004', '00000000-0000-4000-f000-000000000006');
insert into public.admin_permissions (profile_id, permission) values
  ('00000000-0000-4000-f000-000000000002', 'manage_stockists'),
  ('00000000-0000-4000-f000-000000000004', 'manage_samples'),
  ('00000000-0000-4000-f000-000000000006', 'manage_products');
update public.profiles set status = 'approved' where id = '00000000-0000-4000-f000-000000000003';
update public.profiles set status = 'rejected' where id = '00000000-0000-4000-f000-000000000005';
-- A status change stamps the time itself, so back-date it in a second step.
update public.profiles set status_changed_at = now() - interval '13 months' where id = '00000000-0000-4000-f000-000000000005';

-- Fixtures as the database owner.
insert into public.stockists (id, name, type, address, postcode, published, verified_at) values
  ('00000000-0000-4000-f100-000000000001', 'Verified Floors', 'showroom', '1 High St', 'LA9 4AA', true, now()),
  ('00000000-0000-4000-f100-000000000002', 'Draft Floors', 'showroom', '2 High St', 'LA9 4AB', false, null);
insert into public.stockist_private (stockist_id, lead_email, admin_note, terms_note) values
  ('00000000-0000-4000-f100-000000000001', 'leads@verified.local', 'private note', 'Account terms');
insert into public.stockist_products (stockist_id, finish_id)
  select '00000000-0000-4000-f100-000000000001'::uuid, id from public.finishes where slug = 'keswick-oak'
  union all select '00000000-0000-4000-f100-000000000002', id from public.finishes where slug = 'keswick-oak';
insert into public.sample_requests (id, name, email, address_line1, town, postcode, finish_ids)
  select '00000000-0000-4000-f200-000000000001', 'Jane Public', 'jane@public.local', '5 Lake Rd', 'Kendal', 'LA9 4AA', array[id] from public.finishes where slug = 'keswick-oak';
insert into public.sample_requests (id, name, email, address_line1, town, postcode, finish_ids, created_at)
  select '00000000-0000-4000-f200-000000000002', 'Old Customer', 'old@public.local', '6 Lake Rd', 'Kendal', 'LA9 4AA', array[id], now() - interval '30 months' from public.finishes where slug = 'keswick-oak';
insert into public.enquiries (id, kind, stockist_id, name, email, message, share_with_stockist) values
  ('00000000-0000-4000-f300-000000000001', 'stockist', '00000000-0000-4000-f100-000000000001', 'Jane Public', 'jane@public.local', 'Do you carry Keswick Oak?', true);
insert into public.consent_records (email, purpose, granted, wording, source) values
  ('jane@public.local', 'stockist_contact', true, 'Pass my details to Verified Floors', 'enquiry');
insert into public.notification_log (kind, recipient, subject, status) values ('enquiry', 'jane@public.local', 'Your enquiry', 'sent');
insert into public.privacy_requests (id, email, kind, status) values ('00000000-0000-4000-f400-000000000001', 'jane@public.local', 'erase', 'new');

-- Document files: a visitor reads public ones; trade-only ones need an approved account.
insert into public.documents (id, title, type, storage_path, trade_only, content_type) values
  ('00000000-0000-4000-f500-000000000001', 'Public brochure', 'brochure', 'brochure/pub-test.pdf', false, 'application/pdf'),
  ('00000000-0000-4000-f500-000000000002', 'Trade sheet', 'tech_sheet', 'tech_sheet/trade-test.pdf', true, 'application/pdf');
insert into storage.objects (bucket_id, name) values ('documents', 'brochure/pub-test.pdf'), ('documents', 'tech_sheet/trade-test.pdf');

-- ---------------------------------------------------------------------------
-- Stockists: verified before they go live
-- ---------------------------------------------------------------------------
select throws_ok(
  $$insert into public.stockists (name, type, address, postcode, published) values ('Daves Tiles', 'retailer', 'x', 'LA9 4AA', true)$$,
  '23514', null, 'an unverified stockist cannot be published');
select throws_ok(
  $$update public.stockists set published = true where id = '00000000-0000-4000-f100-000000000002'$$,
  '23514', null, 'an unverified listing cannot be turned on');
select lives_ok(
  $$update public.stockists set verified_at = now(), published = true where id = '00000000-0000-4000-f100-000000000002'$$,
  'once verified it can be published');
update public.stockists set published = false, verified_at = null where id = '00000000-0000-4000-f100-000000000002';
select lives_ok($$update public.stockists set phone = '01539 000000' where id = '00000000-0000-4000-f100-000000000001'$$, 'a verified, published listing can still be edited');

-- ---------------------------------------------------------------------------
-- The public sees published stockists and their range, never private detail
-- ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is((select count(*)::int from storage.objects where bucket_id = 'documents'), 1, 'a visitor can read the public document file, and only that');
select is((select count(*)::int from storage.objects where bucket_id = 'documents' and name like 'tech_sheet/%'), 0, '...not the trade-only one');
select is((select count(*)::int from public.stockists), 1, 'anon sees only the published stockist');
select is((select count(*)::int from public.stockist_products), 1, 'anon sees the range of published stockists only');
select is((select count(*)::int from public.stockist_private), 0, 'anon reads no private stockist detail');
select is((select count(*)::int from public.enquiries), 0, 'anon reads no enquiries');
select throws_ok($$insert into public.enquiries (kind, name, email, message) values ('contact', 'x', 'x@x.local', 'hi')$$, '42501', null, 'anon cannot write enquiries directly');
select is((select count(*)::int from public.consent_records) + (select count(*)::int from public.privacy_requests) + (select count(*)::int from public.notification_log), 0, 'anon reads no consent, privacy or email records');
select ok(not has_function_privilege('anon', 'public.record_finish_view(text)', 'execute'), 'anon cannot record a view directly');
select ok(not has_function_privilege('authenticated', 'public.record_finish_view(text)', 'execute'), 'signed-in users cannot record a view directly');
select throws_ok($$select public.export_person_data('jane@public.local')$$, '42501', null, 'anon cannot export personal data');
reset role;

-- ---------------------------------------------------------------------------
-- A trade user: no private stockist detail, no enquiries, no reports, no erasure
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-f000-000000000003","role":"authenticated"}';
select is((select count(*)::int from public.stockist_private) + (select count(*)::int from public.enquiries) + (select count(*)::int from public.consent_records), 0, 'a trade user reads no private stockist detail, enquiries or consent');
select is((select count(*)::int from storage.objects where bucket_id = 'documents'), 2, 'an approved trader reads both document files');
select throws_ok($$select public.admin_overview()$$, '42501', null, 'a trade user cannot read the overview');
select throws_ok($$select public.admin_analytics(30)$$, '42501', null, 'a trade user cannot read analytics');
select throws_ok($$select * from public.price_history(5)$$, '42501', null, 'a trade user cannot read price history');
select throws_ok($$select public.erase_person_data('jane@public.local')$$, '42501', null, 'a trade user cannot erase other people');
select throws_ok($$select public.purge_expired_personal_data()$$, '42501', null, 'a trade user cannot run the retention purge');
select throws_ok($$insert into public.notification_log (kind, recipient, subject, status) values ('x', 'y@y.local', 's', 'sent')$$, '42501', null, 'a trade user cannot write the email log');
reset role;

-- ---------------------------------------------------------------------------
-- A stockist manager: private detail and enquiries, but not samples or privacy
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-f000-000000000002","role":"authenticated"}';
select is((select count(*)::int from public.stockist_private), 1, 'a stockist manager reads private stockist detail');
select is((select count(*)::int from public.enquiries), 1, 'a stockist manager reads enquiries');
select lives_ok($$update public.enquiries set status = 'contacted', handled_at = now() where id = '00000000-0000-4000-f300-000000000001'$$, 'and handles them');
select is((select count(*)::int from public.sample_requests), 0, 'a stockist manager cannot read sample requests');
select throws_ok($$select public.erase_person_data('jane@public.local')$$, '42501', null, 'a stockist manager cannot erase personal data (needs settings)');
reset role;

-- A samples manager cannot read enquiries.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-f000-000000000004","role":"authenticated"}';
select is((select count(*)::int from public.enquiries), 0, 'a samples manager cannot read enquiries');
select lives_ok($$update public.sample_requests set status = 'sent', sent_at = now(), carrier = 'Royal Mail', tracking_ref = 'AB123' where id = '00000000-0000-4000-f200-000000000001'$$, 'a samples manager records dispatch');
select lives_ok($$select public.set_sample_availability((select id from public.finishes where slug = 'keswick-oak'), false)$$, 'a samples manager marks samples out of stock');
select is((select sample_available from public.finishes where slug = 'keswick-oak'), false, '...and it sticks');
select lives_ok($$select public.set_sample_availability((select id from public.finishes where slug = 'keswick-oak'), true)$$, '...and back in');
select lives_ok($$update public.finishes set name = 'Hacked' where slug = 'keswick-oak'$$, 'a samples manager''s product edit is silently refused by RLS');
reset role;
select is((select name from public.finishes where slug = 'keswick-oak'), 'Keswick Oak', '...and the product name is unchanged');

-- The audit log records what changed without copying personal details.
select is(
  (select count(*)::int from public.audit_log where table_name = 'sample_requests' and (new_data::text ilike '%jane%' or old_data::text ilike '%jane%' or new_data::text ilike '%Lake%')),
  0, 'the audit entry for a sample request holds no name, email or address');
select is(
  (select new_data ->> 'carrier' from public.audit_log where table_name = 'sample_requests' and action = 'update' order by id desc limit 1),
  'Royal Mail', 'but it does record the dispatch fields');
select throws_ok($$update public.audit_log set action = 'x'$$, 'P0001', null, 'the audit log still cannot be edited');

-- ---------------------------------------------------------------------------
-- Archive hides a finish: as an administrator with the products permission (column grants apply)
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-f000-000000000006","role":"authenticated"}';
select lives_ok($$update public.finishes set archived_at = now() where slug = 'keswick-oak'$$, 'a products manager archives a finish');
select is((select published from public.finishes where slug = 'keswick-oak'), false, 'archiving a finish unpublishes it');
select lives_ok($$update public.finishes set archived_at = null, published = true where slug = 'keswick-oak'$$, 'and restores it');
select throws_ok($$update public.finishes set sample_available = false where slug = 'keswick-oak'$$, '42501', null, 'sample availability can only change through its function, not by direct update');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-f000-000000000004","role":"authenticated"}';
select lives_ok($$update public.finishes set archived_at = now() where slug = 'keswick-oak'$$, 'a samples manager''s archive attempt is silently refused by RLS');
reset role;
select is((select archived_at is null from public.finishes where slug = 'keswick-oak'), true, '...and nothing was archived');

-- ---------------------------------------------------------------------------
-- Owner: reports, export, erase, delete, retention
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-f000-000000000001","role":"authenticated"}';
select ok((select public.admin_overview() ? 'products'), 'the owner reads the overview');
select ok((select public.admin_analytics(90) ? 'enquiries_by_kind'), 'and analytics');
select is((select public.export_person_data('JANE@public.local') -> 'sample_requests' -> 0 ->> 'name'), 'Jane Public', 'the export finds a person by email, any case');
select is((select jsonb_array_length(public.export_person_data('jane@public.local') -> 'enquiries')), 1, 'and includes their enquiries');
select is((select (public.erase_person_data('jane@public.local') ->> 'sample_requests')::int), 1, 'erasing anonymises their sample request');
select is((select count(*)::int from public.sample_requests where lower(email) = 'jane@public.local'), 0, 'no row still carries the email');
select is((select count(*)::int from public.notification_log where recipient = 'jane@public.local'), 0, 'their email log is deleted');
reset role;
select ok((select anonymised_at is not null from public.consent_records limit 1), 'the consent record is kept as evidence but anonymised');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-f000-000000000001","role":"authenticated"}';
select is((select (public.purge_expired_personal_data() ->> 'sample_requests')::int), 1, 'retention anonymises a sample request past its period');
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-f000-000000000005'), 0, 'and deletes a rejected account past its period');
select throws_ok($$select public.delete_trade_account('00000000-0000-4000-f000-000000000001')$$, '42501', null, 'an administrator cannot be deleted through this route');
reset role;

-- A trader can delete their own account.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-f000-000000000003","role":"authenticated"}';
select lives_ok($$select public.delete_trade_account('00000000-0000-4000-f000-000000000003')$$, 'a trader deletes their own account');
reset role;
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-f000-000000000003'), 0, 'the profile and its data are gone');

select * from finish();
rollback;
