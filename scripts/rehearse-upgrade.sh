#!/usr/bin/env bash
# Rehearses the production upgrade on the LOCAL stack only.
# Builds a database at production's schema (the first two migrations and the
# seed production was loaded with), adds production-like rows, applies every
# later migration, and proves nothing that existed before was lost or changed.
# Never point this at production: it resets the database it runs against.
set -euo pipefail
cd "$(dirname "$0")/.."
grep -q "127.0.0.1:54321" .env.local || { echo "Refusing: .env.local is not the local stack."; exit 1; }
DB="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
PROD_COMMIT=6b40e4e97c2b4ee99e580c5803c153d3907d210e   # what production runs today
PROD_VERSION=20261105100000                            # its last migration
TMP=$(mktemp -d)
cp supabase/seed.sql "$TMP/seed.current.sql"
trap 'cp "$TMP/seed.current.sql" supabase/seed.sql' EXIT   # always put the real seed back

git show "$PROD_COMMIT:supabase/seed.sql" > supabase/seed.sql
npx supabase db reset --local --version "$PROD_VERSION" >/dev/null 2>&1
cp "$TMP/seed.current.sql" supabase/seed.sql

# Rows like the ones production may hold: accounts in each state, an account price,
# a sample request, a published stockist, a document, a shortlist.
psql "$DB" -v ON_ERROR_STOP=1 -q <<'SQL'
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-9000-000000000001', 'fitter@rehearsal.local', '{"company_name":"Rehearsal Floors","contact_name":"Rae Fitter"}'),
  ('00000000-0000-4000-9000-000000000002', 'pending@rehearsal.local', '{"company_name":"Waiting Ltd"}'),
  ('00000000-0000-4000-9000-000000000003', 'owner@rehearsal.local', '{"company_name":"Duratek"}'),
  ('00000000-0000-4000-9000-000000000004', 'rejected@rehearsal.local', '{"company_name":"Nope Ltd"}');
update public.profiles set status = 'approved', tier_id = (select id from public.price_tiers order by name limit 1) where id = '00000000-0000-4000-9000-000000000001';
update public.profiles set status = 'approved', is_admin = true where id = '00000000-0000-4000-9000-000000000003';
update public.profiles set status = 'rejected' where id = '00000000-0000-4000-9000-000000000004';
insert into public.price_overrides (finish_id, profile_id, price_per_m2_pence)
  select id, '00000000-0000-4000-9000-000000000001', 1777 from public.finishes order by name limit 1;
insert into public.sample_requests (name, email, address_line1, town, postcode, finish_ids, marketing_opt_in)
  select 'Real Customer', 'real@customer.example.com', '1 High St', 'Kendal', 'LA9 4AA', array[id], true from public.finishes order by name limit 1;
insert into public.stockists (name, type, address, postcode, lat, lng, published) values ('Live Stockist', 'showroom', '2 High St', 'LA9 4DT', 54.32, -2.74, true), ('Hidden Stockist', 'fitter', '3 High St', 'LA9 4DT', null, null, false);
insert into public.documents (title, type, storage_path, trade_only) values ('Brochure', 'brochure', 'brochure/live.pdf', false), ('Tech sheet', 'tech_sheet', 'tech_sheet/live.pdf', true);
insert into public.shortlists (profile_id, name, finish_ids) select '00000000-0000-4000-9000-000000000001', 'Job 1', array[id] from public.finishes order by name limit 2;
SQL

snapshot() {
  psql "$DB" -v ON_ERROR_STOP=1 -At <<'SQL'
select 'finishes ' || count(*) || ' ' || md5(string_agg(concat_ws('~', id, name, slug, style, colour_family, description, published, coalesce(rrp_per_m2_pence::text,''), sort_order), '|' order by id)) from public.finishes;
select 'finish_images ' || count(*) || ' ' || md5(string_agg(concat_ws('~', finish_id, url, kind, alt, sort_order), '|' order by finish_id, sort_order, url)) from public.finish_images;
select 'price_tiers ' || count(*) || ' ' || md5(string_agg(concat_ws('~', id, name), '|' order by id)) from public.price_tiers;
select 'prices ' || count(*) || ' ' || md5(string_agg(concat_ws('~', finish_id, tier_id, price_per_m2_pence), '|' order by finish_id, tier_id)) from public.prices;
select 'price_overrides ' || count(*) || ' ' || md5(string_agg(concat_ws('~', finish_id, profile_id, price_per_m2_pence), '|' order by finish_id, profile_id)) from public.price_overrides;
select 'profiles ' || count(*) || ' ' || md5(string_agg(concat_ws('~', id, coalesce(company_name,''), coalesce(contact_name,''), status, coalesce(tier_id::text,''), is_admin), '|' order by id)) from public.profiles;
select 'auth_users ' || count(*) || ' ' || md5(string_agg(concat_ws('~', id, email), '|' order by id)) from auth.users;
select 'sample_requests ' || count(*) || ' ' || md5(string_agg(concat_ws('~', id, name, email, address_line1, town, postcode, finish_ids::text, marketing_opt_in, status), '|' order by id)) from public.sample_requests;
select 'stockists ' || count(*) || ' ' || md5(string_agg(concat_ws('~', id, name, type, address, postcode, coalesce(lat::text,''), published), '|' order by id)) from public.stockists;
select 'online_retailers ' || count(*) || ' ' || md5(string_agg(concat_ws('~', id, name, url, published), '|' order by id)) from public.online_retailers;
select 'documents ' || count(*) || ' ' || md5(string_agg(concat_ws('~', id, title, type, storage_path, trade_only), '|' order by id)) from public.documents;
select 'shortlists ' || count(*) || ' ' || md5(string_agg(concat_ws('~', id, profile_id, name, token, finish_ids::text), '|' order by id)) from public.shortlists;
select 'inspiration ' || count(*) || ' ' || md5(string_agg(concat_ws('~', id, title, mood, image_path, published), '|' order by id)) from public.inspiration;
SQL
}
snapshot > "$TMP/before.txt"

echo "== applying the later migrations"
npx supabase migration up --local 2>&1 | grep -E "Applying|ERROR|error" || true

snapshot > "$TMP/after.txt"
echo "== existing data, before and after"
if diff "$TMP/before.txt" "$TMP/after.txt" >/dev/null; then cat "$TMP/after.txt" | awk '{print "same  " $1 " (" $2 " rows)"}'; else echo "DIFFERENT:"; diff "$TMP/before.txt" "$TMP/after.txt" || true; fi

echo "== the upgraded database behaves"
psql "$DB" -v ON_ERROR_STOP=1 -At <<'SQL'
select 'migrations applied: ' || count(*) from supabase_migrations.schema_migrations;
select 'owner became super administrator: ' || (role = 'super_admin') from public.profiles where id = '00000000-0000-4000-9000-000000000003';
select 'trade accounts kept role trade: ' || bool_and(role = 'trade') from public.profiles where not is_admin;
select 'every finish has a default variant: ' || (count(*) = (select count(*) from public.finishes)) from public.product_variants where is_default;
select 'published stockist still published: ' || published from public.stockists where name = 'Live Stockist';
select 'every legacy tier price is in a price list: ' || not exists (
  select 1 from public.prices p where not exists (
    select 1 from public.price_list_items i join public.price_lists l on l.id = i.price_list_id join public.product_variants v on v.id = i.variant_id
    where l.tier_id = p.tier_id and v.finish_id = p.finish_id and i.amount_pence = p.price_per_m2_pence));
select 'the account price is in its own list: ' || exists (select 1 from public.price_list_items i join public.price_lists l on l.id = i.price_list_id where l.profile_id = '00000000-0000-4000-9000-000000000001' and i.amount_pence = 1777);
SQL
psql "$DB" -v ON_ERROR_STOP=1 -Atq <<'SQL'
-- a visitor gets the RRP that was there before, for every finish
begin;
set local role anon; set local request.jwt.claims = '{"role":"anon"}';
select 'visitor (anon role: ' || current_user || ') RRP matches the old RRP on every finish: ' || (count(*) = (select count(*) from public.finishes) and bool_and(c.source = 'rrp' and c.amount_pence = f.rrp_per_m2_pence)) from public.catalogue_prices() c join public.finishes f on f.id = c.finish_id;
rollback;
begin;
set local role authenticated; set local request.jwt.claims = '{"sub":"00000000-0000-4000-9000-000000000001","role":"authenticated"}';
select 'fitter gets the account price where one was set: ' || exists (select 1 from public.catalogue_prices() where source = 'account' and amount_pence = 1777);
select 'fitter gets the tier price elsewhere: ' || (count(*) filter (where source = 'trade') = count(*) - 1) from public.catalogue_prices();
rollback;
begin;
set local role authenticated; set local request.jwt.claims = '{"sub":"00000000-0000-4000-9000-000000000002","role":"authenticated"}';
select 'pending account still gets only the RRP: ' || bool_and(source = 'rrp') from public.catalogue_prices();
rollback;
SQL
echo "== done (the local database is now an upgraded copy; run 'npx supabase db reset' to return to the dev seed)"
