-- Administration, samples, stockists, enquiries, analytics and privacy controls.
-- Additive only: new tables, columns and functions. No data is dropped or rewritten.

-- ===========================================================================
-- Products: archive, sample availability
-- ===========================================================================
alter table public.finishes
  add column archived_at timestamptz,
  add column sample_available boolean not null default true;
comment on column public.finishes.archived_at is 'Set when a finish is archived: hidden from the public site and from new quotes, kept for history.';
comment on column public.finishes.sample_available is 'False when free samples of this finish cannot be sent just now (out of sample stock).';

-- Finishes have column-level UPDATE grants (prices are derived, never edited here), so the
-- new column an administrator sets needs its own. sample_available is changed only through
-- set_sample_availability() below.
grant update (archived_at) on public.finishes to authenticated;

-- An archived finish is never public.
create function public.finishes_archive_hides() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.archived_at is not null then new.published := false; end if;
  return new;
end;
$$;
create trigger finishes_archive_hides before insert or update on public.finishes
  for each row execute function public.finishes_archive_hides();

drop trigger audit_finishes on public.finishes;
create trigger audit_finishes after insert or update or delete on public.finishes
  for each row execute function public.audit_row('name', 'slug', 'style', 'colour_family', 'description', 'specs', 'published', 'collection_id', 'product_type', 'sort_order', 'archived_at', 'sample_available');

-- A samples manager can mark a finish's samples in or out of stock without product permissions.
create function public.set_sample_availability(p_finish uuid, p_available boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_permission('manage_samples') then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.finishes set sample_available = p_available where id = p_finish;
end;
$$;
revoke execute on function public.set_sample_availability(uuid, boolean) from public, anon;
grant execute on function public.set_sample_availability(uuid, boolean) to authenticated;

-- Document types for photography and brand assets (the file kind is recorded per document).
alter type public.document_type add value if not exists 'marketing_photo';
alter type public.document_type add value if not exists 'brand_asset';
alter table public.documents
  add column content_type text not null default 'application/pdf'
    check (content_type in ('application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/zip')),
  add column size_bytes bigint check (size_bytes is null or size_bytes >= 0);

-- ===========================================================================
-- Stockists: contact detail, hours, verification before going live, range carried
-- ===========================================================================
alter table public.stockists
  add column email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add column opening_hours text check (opening_hours is null or length(opening_hours) <= 600),
  add column description text check (description is null or length(description) <= 600),
  add column verified_at timestamptz,
  add column verified_by uuid references auth.users (id) on delete set null;
comment on column public.stockists.email is 'Shown publicly. The address leads are forwarded to is private (stockist_private.lead_email).';
comment on column public.stockists.verified_at is 'When Duratek confirmed the listing details with the business. A stockist cannot be published until this is set.';

-- Going live needs verified details. Existing published rows are left alone;
-- this applies when a listing is published (new, or turned on).
create function public.stockists_publish_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.published and (tg_op = 'INSERT' or not old.published) and new.verified_at is null then
    raise exception 'A stockist must be verified before it is published' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger stockists_publish_guard before insert or update on public.stockists
  for each row execute function public.stockists_publish_guard();

-- Private detail the public must never read (the stockists table is public once published).
create table public.stockist_private (
  stockist_id uuid primary key references public.stockists (id) on delete cascade,
  lead_email text check (lead_email is null or lead_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  admin_note text check (admin_note is null or length(admin_note) <= 2000),
  verification_note text check (verification_note is null or length(verification_note) <= 1000),
  -- Account-specific commercial terms. Never a resale price: stockists set their own prices.
  price_list_id uuid references public.price_lists (id) on delete set null,
  terms_note text check (terms_note is null or length(terms_note) <= 2000),
  payment_terms text check (payment_terms is null or length(payment_terms) <= 300),
  terms_valid_from date,
  terms_valid_to date,
  updated_at timestamptz not null default now(),
  check (terms_valid_to is null or terms_valid_from is null or terms_valid_to > terms_valid_from)
);
comment on table public.stockist_private is 'Admin-only: where leads go, notes and commercial terms. RRP is a recommendation; nothing here may set a stockist''s resale price.';

-- The range a stockist carries. This is NOT stock: no inventory is connected.
create table public.stockist_products (
  stockist_id uuid not null references public.stockists (id) on delete cascade,
  finish_id uuid not null references public.finishes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (stockist_id, finish_id)
);
create index stockist_products_finish_idx on public.stockist_products (finish_id);
comment on table public.stockist_products is 'Finishes a stockist says it carries. Not live stock: say "contact the stockist to check availability".';

-- ===========================================================================
-- Enquiries and contact requests
-- ===========================================================================
create type public.enquiry_kind as enum ('stockist', 'product', 'contact');
create type public.enquiry_status as enum ('new', 'contacted', 'closed', 'spam');

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  kind public.enquiry_kind not null,
  stockist_id uuid references public.stockists (id) on delete set null,
  finish_id uuid references public.finishes (id) on delete set null,
  name text not null check (length(trim(name)) between 1 and 200),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone is null or length(phone) <= 30),
  postcode text check (postcode is null or postcode ~* '^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$'),
  message text not null check (length(trim(message)) between 1 and 2000),
  wants_contact boolean not null default true,
  -- Consent to pass these details to the stockist. Never forwarded without it.
  share_with_stockist boolean not null default false,
  status public.enquiry_status not null default 'new',
  handled_by uuid references auth.users (id) on delete set null,
  handled_at timestamptz,
  admin_note text check (admin_note is null or length(admin_note) <= 2000),
  -- Set only when the forwarding email was actually accepted for sending.
  forwarded_at timestamptz,
  anonymised_at timestamptz,
  created_at timestamptz not null default now()
);
create index enquiries_status_created_idx on public.enquiries (status, created_at desc);
create index enquiries_stockist_idx on public.enquiries (stockist_id);
create index enquiries_finish_idx on public.enquiries (finish_id);
create index enquiries_email_idx on public.enquiries (lower(email));

-- ===========================================================================
-- Samples: fulfilment and dispatch
-- ===========================================================================
alter type public.sample_status add value if not exists 'processing';
alter type public.sample_status add value if not exists 'cancelled';
alter table public.sample_requests
  add column carrier text check (carrier is null or length(carrier) <= 80),
  add column tracking_ref text check (tracking_ref is null or length(tracking_ref) <= 120),
  add column dispatch_note text check (dispatch_note is null or length(dispatch_note) <= 500),
  add column dispatched_by uuid references auth.users (id) on delete set null,
  add column customer_notified_at timestamptz,
  add column anonymised_at timestamptz;

-- Audit without copying personal details: only the watched columns are recorded,
-- never the whole row (names, emails and addresses stay out of the append-only log).
create function public.audit_row_min() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  watch text[] := tg_argv;
  changed text[];
  oo jsonb := '{}';
  nn jsonb := '{}';
  c text;
begin
  if tg_op = 'UPDATE' then
    select array_agg(key order by key) into changed
    from jsonb_object_keys(n) key
    where (o -> key) is distinct from (n -> key) and key = any (watch);
    if changed is null then return null; end if;
  end if;
  foreach c in array watch loop
    if o ? c then oo := oo || jsonb_build_object(c, o -> c); end if;
    if n ? c then nn := nn || jsonb_build_object(c, n -> c); end if;
  end loop;
  insert into public.audit_log (actor_id, actor_role, action, table_name, record_id, changed_fields, old_data, new_data)
  values ((select auth.uid()), coalesce((select auth.role()), current_user), lower(tg_op), tg_table_name,
          coalesce(n ->> 'id', o ->> 'id'), changed,
          case when o is null then null else oo end, case when n is null then null else nn end);
  return null;
end;
$$;

-- The one exception to an append-only log: clearing personal data that an older entry copied
-- (UK GDPR erasure). Only the copied row data may be cleared, never the record that something happened.
create or replace function public.audit_log_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE'
     and coalesce(current_setting('duratek.redacting', true), '') = 'on'
     and new.table_name in ('sample_requests', 'enquiries', 'businesses', 'profiles', 'privacy_requests')
     and new.old_data is null and new.new_data is null
     and (to_jsonb(new) - 'old_data' - 'new_data') = (to_jsonb(old) - 'old_data' - 'new_data') then
    return new;
  end if;
  raise exception 'audit records cannot be changed or deleted';
end;
$$;

create function public.redact_audit(p_table text, p_ids text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('duratek.redacting', 'on', true);
  update public.audit_log set old_data = null, new_data = null
  where table_name = p_table and record_id = any (p_ids) and (old_data is not null or new_data is not null);
  perform set_config('duratek.redacting', 'off', true);
end;
$$;
revoke execute on function public.redact_audit(text, text[]) from public, anon, authenticated;

drop trigger audit_sample_requests on public.sample_requests;
create trigger audit_sample_requests after update or delete on public.sample_requests
  for each row execute function public.audit_row_min('status', 'sent_at', 'carrier', 'tracking_ref');

-- ===========================================================================
-- Email log: what was attempted and what happened. Never a made-up success.
-- ===========================================================================
create table public.notification_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null check (length(kind) between 1 and 60),
  recipient text not null,
  subject text not null,
  status text not null check (status in ('sent', 'failed', 'not_configured', 'suppressed')),
  related_table text,
  related_id uuid
);
create index notification_log_created_idx on public.notification_log (created_at desc);
create index notification_log_recipient_idx on public.notification_log (lower(recipient));

-- ===========================================================================
-- Finish views: a daily count per finish. No visitor, address or cookie is stored.
-- ===========================================================================
create table public.finish_views (
  finish_id uuid not null references public.finishes (id) on delete cascade,
  day date not null default current_date,
  views integer not null default 0 check (views >= 0),
  primary key (finish_id, day)
);

create function public.record_finish_view(p_slug text) returns void
language sql security definer set search_path = '' as $$
  insert into public.finish_views (finish_id, day, views)
  select f.id, current_date, 1 from public.finishes f where f.slug = p_slug and f.published
  on conflict (finish_id, day) do update set views = public.finish_views.views + 1;
$$;
revoke execute on function public.record_finish_view(text) from public, anon, authenticated;
grant execute on function public.record_finish_view(text) to service_role;

-- ===========================================================================
-- Consent and privacy requests
-- ===========================================================================
create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  purpose text not null check (purpose in ('marketing', 'stockist_contact')),
  granted boolean not null,
  wording text not null check (length(wording) between 1 and 600),
  source text not null check (length(source) between 1 and 60),
  source_id uuid,
  created_at timestamptz not null default now(),
  anonymised_at timestamptz
);
create index consent_records_email_idx on public.consent_records (lower(email), created_at desc);
comment on table public.consent_records is 'What a person agreed to, in what words, where and when. Kept as evidence; the email is anonymised on erasure.';

create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  kind text not null check (kind in ('access', 'erase', 'withdraw_marketing', 'correct', 'other')),
  details text check (details is null or length(details) <= 2000),
  status text not null default 'new' check (status in ('new', 'verifying', 'done', 'refused')),
  -- UK GDPR: one month to respond.
  due_at timestamptz not null default (now() + interval '1 month'),
  handled_by uuid references auth.users (id) on delete set null,
  handled_at timestamptz,
  outcome_note text check (outcome_note is null or length(outcome_note) <= 1000),
  created_at timestamptz not null default now(),
  anonymised_at timestamptz
);
create index privacy_requests_status_idx on public.privacy_requests (status, due_at);

-- Retention periods the owner can change in settings.
insert into public.system_settings (key, value, is_public, description) values
  ('retention_sample_requests_months', '24', false, 'Sample requests are anonymised this many months after they are made.'),
  ('retention_enquiries_months', '24', false, 'Enquiries are anonymised this many months after they are made.'),
  ('retention_rejected_accounts_months', '12', false, 'Rejected trade applications are deleted this many months after the decision.'),
  ('retention_email_log_days', '90', false, 'The email log is deleted after this many days.'),
  ('retention_privacy_requests_months', '36', false, 'Closed privacy requests are anonymised after this many months.')
on conflict (key) do nothing;

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.stockist_private enable row level security;
alter table public.stockist_products enable row level security;
alter table public.enquiries enable row level security;
alter table public.notification_log enable row level security;
alter table public.finish_views enable row level security;
alter table public.consent_records enable row level security;
alter table public.privacy_requests enable row level security;

create policy "stockist managers read private detail" on public.stockist_private for all to authenticated
  using (public.has_permission('manage_stockists')) with check (public.has_permission('manage_stockists'));

create policy "public read range of published stockists" on public.stockist_products for select to anon, authenticated
  using (exists (select 1 from public.stockists s where s.id = stockist_id and s.published));
create policy "stockist managers manage range" on public.stockist_products for all to authenticated
  using (public.has_permission('manage_stockists')) with check (public.has_permission('manage_stockists'));

-- Enquiries are inserted by the server (service role). Only stockist managers read or handle them.
create policy "stockist managers handle enquiries" on public.enquiries for all to authenticated
  using (public.has_permission('manage_stockists')) with check (public.has_permission('manage_stockists'));

create policy "settings managers read the email log" on public.notification_log for select to authenticated
  using (public.has_permission('manage_settings'));
-- Any administrator's action may log the email it sent.
create policy "administrators log emails" on public.notification_log for insert to authenticated
  with check (public.is_admin());

create policy "report readers read views" on public.finish_views for select to authenticated
  using (public.has_permission('view_reports'));

create policy "settings managers read consent" on public.consent_records for select to authenticated
  using (public.has_permission('manage_settings'));
create policy "settings managers handle privacy requests" on public.privacy_requests for all to authenticated
  using (public.has_permission('manage_settings')) with check (public.has_permission('manage_settings'));

-- ===========================================================================
-- Fix: public document files could not be downloaded by visitors. One storage policy served
-- visitors and traders and called is_approved_trade(), which visitors may not execute, so the
-- download failed for them with "permission denied for function" (Postgres checks function
-- permissions before it evaluates the OR). Split it: public files for everyone, trade-only
-- files for approved trade accounts. Who may read what is unchanged.
-- ===========================================================================
drop policy "read permitted documents files" on storage.objects;
create policy "anyone reads public document files" on storage.objects for select to anon, authenticated
  using (bucket_id = 'documents' and exists (
    select 1 from public.documents d where d.storage_path = name and not d.trade_only));
create policy "approved trade read trade document files" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and exists (
    select 1 from public.documents d where d.storage_path = name and d.trade_only and (select public.is_approved_trade())));

-- Audit the records that change who is told what.
create trigger audit_stockist_private after insert or update or delete on public.stockist_private
  for each row execute function public.audit_row('price_list_id', 'terms_valid_from', 'terms_valid_to', 'payment_terms');
create trigger audit_stockist_products after insert or delete on public.stockist_products
  for each row execute function public.audit_row();
create trigger audit_enquiries after update on public.enquiries
  for each row execute function public.audit_row_min('status', 'forwarded_at');
create trigger audit_privacy_requests after update on public.privacy_requests
  for each row execute function public.audit_row_min('status', 'handled_at');

-- ===========================================================================
-- Privacy: export, erase, delete account, retention
-- ===========================================================================
create function public.privacy_allowed() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_permission('manage_settings') or coalesce((select auth.role()), '') = 'service_role';
$$;
revoke execute on function public.privacy_allowed() from public, anon;
grant execute on function public.privacy_allowed() to authenticated, service_role;

-- Everything held about an email address in the customer-facing tables.
create function public.export_person_data(p_email text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare e text := lower(trim(p_email));
begin
  if not public.privacy_allowed() then raise exception 'not allowed' using errcode = '42501'; end if;
  return jsonb_build_object(
    'email', e,
    'exported_at', now(),
    'sample_requests', coalesce((select jsonb_agg(to_jsonb(s) - 'id' order by s.created_at) from public.sample_requests s where lower(s.email) = e), '[]'),
    'enquiries', coalesce((select jsonb_agg(to_jsonb(q) - 'admin_note' order by q.created_at) from public.enquiries q where lower(q.email) = e), '[]'),
    'consent_records', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at) from public.consent_records c where lower(c.email) = e), '[]'),
    'privacy_requests', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from public.privacy_requests r where lower(r.email) = e), '[]'),
    'emails_sent', coalesce((select jsonb_agg(jsonb_build_object('kind', n.kind, 'subject', n.subject, 'status', n.status, 'at', n.created_at) order by n.created_at) from public.notification_log n where lower(n.recipient) = e), '[]'),
    'trade_account', (
      select jsonb_build_object(
        'company_name', p.company_name, 'contact_name', p.contact_name, 'phone', p.phone,
        'status', p.status, 'created_at', p.created_at)
      from public.profiles p join auth.users u on u.id = p.id where lower(u.email) = e
    )
  );
end;
$$;

-- Anonymise an email address in the customer-facing tables. Counts only; nothing personal comes back.
create function public.erase_person_data(p_email text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  e text := lower(trim(p_email));
  ids_s text[]; ids_e text[];
  n_consent int; n_req int; n_log int;
begin
  if not public.privacy_allowed() then raise exception 'not allowed' using errcode = '42501'; end if;
  with u as (
    update public.sample_requests set
      name = 'Removed', email = 'removed-' || id || '@invalid.example', phone = null,
      address_line1 = 'Removed', address_line2 = null, town = 'Removed', postcode = 'ZZ99 9ZZ',
      anonymised_at = now()
    where lower(email) = e and anonymised_at is null returning id)
  select coalesce(array_agg(id::text), '{}') into ids_s from u;
  with u as (
    update public.enquiries set
      name = 'Removed', email = 'removed-' || id || '@invalid.example', phone = null, postcode = null,
      message = '[removed]', admin_note = null, anonymised_at = now()
    where lower(email) = e and anonymised_at is null returning id)
  select coalesce(array_agg(id::text), '{}') into ids_e from u;
  perform public.redact_audit('sample_requests', ids_s);
  perform public.redact_audit('enquiries', ids_e);
  update public.consent_records set email = 'removed-' || id || '@invalid.example', anonymised_at = now()
  where lower(email) = e and anonymised_at is null;
  get diagnostics n_consent = row_count;
  update public.privacy_requests set email = 'removed-' || id || '@invalid.example', details = null, anonymised_at = now()
  where lower(email) = e and anonymised_at is null and status in ('done', 'refused');
  get diagnostics n_req = row_count;
  delete from public.notification_log where lower(recipient) = e;
  get diagnostics n_log = row_count;
  insert into public.audit_log (actor_id, actor_role, action, table_name, record_id, changed_fields)
  values ((select auth.uid()), 'privacy', 'erase_person', 'privacy', null,
          array['sample_requests:' || cardinality(ids_s), 'enquiries:' || cardinality(ids_e), 'consent:' || n_consent, 'email_log:' || n_log]);
  return jsonb_build_object('sample_requests', cardinality(ids_s), 'enquiries', cardinality(ids_e), 'consent_records', n_consent, 'privacy_requests', n_req, 'email_log', n_log);
end;
$$;

-- Delete a trade account and everything it owns. Never an administrator.
create function public.delete_trade_account(p_profile uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.profiles; biz uuid;
begin
  if not (public.privacy_allowed() or (select auth.uid()) = p_profile) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into r from public.profiles where id = p_profile;
  if not found then return; end if;
  if r.role in ('super_admin', 'admin') then
    raise exception 'Administrators cannot be deleted here' using errcode = '42501';
  end if;
  biz := r.business_id;
  insert into public.audit_log (actor_id, actor_role, action, table_name, record_id)
  values ((select auth.uid()), coalesce((select role::text from public.profiles where id = (select auth.uid())), 'system'),
          'delete_account', 'profiles', p_profile::text);
  delete from auth.users where id = p_profile; -- cascades to the profile and everything it owns
  perform public.redact_audit('profiles', array[p_profile::text]);
  if biz is not null and not exists (select 1 from public.profiles where business_id = biz) then
    delete from public.businesses where id = biz;
    perform public.redact_audit('businesses', array[biz::text]);
  end if;
end;
$$;

-- Apply the retention periods. Safe to run repeatedly.
create function public.purge_expired_personal_data() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  m_samples int; m_enq int; m_rej int; d_log int; m_req int;
  n_samples int; n_enq int; n_log int; n_req int; n_rej int := 0;
  r record;
  ids_s text[]; ids_e text[];
begin
  if not public.privacy_allowed() then raise exception 'not allowed' using errcode = '42501'; end if;
  select coalesce((select (value #>> '{}')::int from public.system_settings where key = 'retention_sample_requests_months'), 24) into m_samples;
  select coalesce((select (value #>> '{}')::int from public.system_settings where key = 'retention_enquiries_months'), 24) into m_enq;
  select coalesce((select (value #>> '{}')::int from public.system_settings where key = 'retention_rejected_accounts_months'), 12) into m_rej;
  select coalesce((select (value #>> '{}')::int from public.system_settings where key = 'retention_email_log_days'), 90) into d_log;
  select coalesce((select (value #>> '{}')::int from public.system_settings where key = 'retention_privacy_requests_months'), 36) into m_req;

  with u as (
    update public.sample_requests set
      name = 'Removed', email = 'removed-' || id || '@invalid.example', phone = null,
      address_line1 = 'Removed', address_line2 = null, town = 'Removed', postcode = 'ZZ99 9ZZ', anonymised_at = now()
    where anonymised_at is null and created_at < now() - make_interval(months => m_samples) returning id)
  select coalesce(array_agg(id::text), '{}') into ids_s from u;
  n_samples := cardinality(ids_s);
  perform public.redact_audit('sample_requests', ids_s);

  with u as (
    update public.enquiries set
      name = 'Removed', email = 'removed-' || id || '@invalid.example', phone = null, postcode = null,
      message = '[removed]', admin_note = null, anonymised_at = now()
    where anonymised_at is null and created_at < now() - make_interval(months => m_enq) returning id)
  select coalesce(array_agg(id::text), '{}') into ids_e from u;
  n_enq := cardinality(ids_e);
  perform public.redact_audit('enquiries', ids_e);

  delete from public.notification_log where created_at < now() - make_interval(days => d_log);
  get diagnostics n_log = row_count;

  update public.privacy_requests set email = 'removed-' || id || '@invalid.example', details = null, anonymised_at = now()
  where anonymised_at is null and status in ('done', 'refused') and coalesce(handled_at, created_at) < now() - make_interval(months => m_req);
  get diagnostics n_req = row_count;

  -- Rejected applicants: delete the account and its application.
  for r in
    select id from public.profiles
    where status = 'rejected' and role = 'trade' and coalesce(status_changed_at, updated_at) < now() - make_interval(months => m_rej)
  loop
    perform public.delete_trade_account(r.id);
    n_rej := n_rej + 1;
  end loop;

  insert into public.audit_log (actor_id, actor_role, action, table_name, record_id, changed_fields)
  values ((select auth.uid()), 'privacy', 'retention_purge', 'privacy', null,
          array['sample_requests:' || n_samples, 'enquiries:' || n_enq, 'email_log:' || n_log, 'privacy_requests:' || n_req, 'rejected_accounts:' || n_rej]);
  return jsonb_build_object('sample_requests', n_samples, 'enquiries', n_enq, 'email_log', n_log, 'privacy_requests', n_req, 'rejected_accounts', n_rej);
end;
$$;

revoke execute on function public.export_person_data(text), public.erase_person_data(text), public.delete_trade_account(uuid), public.purge_expired_personal_data() from public, anon;
grant execute on function public.export_person_data(text), public.erase_person_data(text), public.delete_trade_account(uuid), public.purge_expired_personal_data() to authenticated, service_role;

-- ===========================================================================
-- Reporting: counts only, no personal data. Enquiries, quotations and sales are different things.
-- ===========================================================================
create function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_permission('view_reports') then raise exception 'admin only' using errcode = '42501'; end if;
  return jsonb_build_object(
    'products', (select jsonb_build_object(
        'total', count(*) filter (where archived_at is null),
        'active', count(*) filter (where published and archived_at is null),
        'hidden', count(*) filter (where not published and archived_at is null),
        'archived', count(*) filter (where archived_at is not null)) from public.finishes),
    'variants', (select count(*) from public.product_variants where active),
    'accounts', (select jsonb_build_object(
        'trade_approved', count(*) filter (where role = 'trade' and status = 'approved'),
        'pending', count(*) filter (where status = 'pending'),
        'stockist_approved', count(*) filter (where role = 'stockist' and status = 'approved')) from public.profiles),
    'stockists', (select jsonb_build_object(
        'live', count(*) filter (where published),
        'unverified', count(*) filter (where verified_at is null),
        'total', count(*)) from public.stockists),
    'samples', (select jsonb_build_object(
        'to_send', count(*) filter (where status in ('new', 'processing')),
        'total', count(*)) from public.sample_requests),
    'enquiries', (select jsonb_build_object('new', count(*) filter (where status = 'new'), 'total', count(*)) from public.enquiries),
    'privacy_open', (select count(*) from public.privacy_requests where status in ('new', 'verifying')),
    -- Quotations are the traders' own quotes to their customers. Counts by day only.
    'quotes_7d', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'created', d.n) order by d.day)
      from (select created_at::date as day, count(*) as n from public.quotes where created_at > now() - interval '7 days' group by 1) d), '[]'),
    'recent_activity', coalesce((
      select jsonb_agg(jsonb_build_object('at', a.occurred_at, 'action', a.action, 'table', a.table_name) order by a.occurred_at desc)
      from (select occurred_at, action, table_name from public.audit_log order by occurred_at desc limit 8) a), '[]')
  );
end;
$$;

create function public.admin_analytics(p_days integer default 90) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare since timestamptz := now() - make_interval(days => greatest(1, least(p_days, 730)));
begin
  if not public.has_permission('view_reports') then raise exception 'admin only' using errcode = '42501'; end if;
  return jsonb_build_object(
    'days', greatest(1, least(p_days, 730)),
    'views_by_finish', coalesce((
      select jsonb_agg(jsonb_build_object('finish_id', v.finish_id, 'views', v.n) order by v.n desc)
      from (select finish_id, sum(views) as n from public.finish_views where day >= since::date group by 1) v), '[]'),
    'samples_by_finish', coalesce((
      select jsonb_agg(jsonb_build_object('finish_id', s.fid, 'requested', s.n) order by s.n desc)
      from (select fid, count(*) as n from public.sample_requests r, unnest(r.finish_ids) fid where r.created_at >= since and r.status <> 'cancelled' group by 1) s), '[]'),
    'samples_by_status', coalesce((
      select jsonb_object_agg(x.status, x.n) from (select status, count(*) as n from public.sample_requests where created_at >= since group by 1) x), '{}'),
    'samples_by_week', coalesce((
      select jsonb_agg(jsonb_build_object('week', w.week, 'count', w.n) order by w.week)
      from (select date_trunc('week', created_at)::date as week, count(*) as n from public.sample_requests where created_at >= since group by 1) w), '[]'),
    'accounts_by_month', coalesce((
      select jsonb_agg(jsonb_build_object('month', a.month, 'applied', a.applied, 'approved', a.approved) order by a.month)
      from (select date_trunc('month', p.created_at)::date as month, count(*) as applied, count(*) filter (where p.status = 'approved') as approved
            from public.profiles p where p.role in ('trade', 'stockist') and p.created_at >= since group by 1) a), '[]'),
    'accounts_active_30d', (select count(*) from auth.users u join public.profiles p on p.id = u.id
                            where p.role in ('trade', 'stockist') and p.status = 'approved' and u.last_sign_in_at > now() - interval '30 days'),
    'enquiries_by_kind', coalesce((
      select jsonb_object_agg(x.kind, x.n) from (select kind, count(*) as n from public.enquiries where created_at >= since group by 1) x), '{}'),
    'enquiries_by_finish', coalesce((
      select jsonb_agg(jsonb_build_object('finish_id', e.finish_id, 'enquiries', e.n) order by e.n desc)
      from (select finish_id, count(*) as n from public.enquiries where finish_id is not null and created_at >= since group by 1) e), '[]'),
    'enquiries_by_stockist', coalesce((
      select jsonb_agg(jsonb_build_object('stockist', s.name, 'enquiries', e.n) order by e.n desc)
      from (select stockist_id, count(*) as n from public.enquiries where stockist_id is not null and created_at >= since group by 1) e
      join public.stockists s on s.id = e.stockist_id), '[]'),
    'enquiries_by_status', coalesce((
      select jsonb_object_agg(x.status, x.n) from (select status, count(*) as n from public.enquiries where created_at >= since group by 1) x), '{}'),
    -- Quotations: the traders' own quotes. Created, sent, accepted and declined are the trader's customer's answers, not Duratek sales.
    'quotes_by_status', coalesce((
      select jsonb_object_agg(x.status, x.n) from (select status, count(*) as n from public.quotes where created_at >= since group by 1) x), '{}'),
    'quotes_by_week', coalesce((
      select jsonb_agg(jsonb_build_object('week', w.week, 'count', w.n) order by w.week)
      from (select date_trunc('week', created_at)::date as week, count(*) as n from public.quotes where created_at >= since group by 1) w), '[]'),
    'quoted_m2_by_finish', coalesce((
      select jsonb_agg(jsonb_build_object('finish_id', y.finish_id, 'm2', y.m2) order by y.m2 desc)
      from (select l.finish_id, sum(coalesce(l.area_m2, 0)) as m2
            from public.quote_lines l join public.quotes q on q.id = l.quote_id
            where l.kind = 'flooring' and l.finish_id is not null and q.created_at >= since group by 1) y), '[]')
  );
end;
$$;

-- Price history: who changed which price, when. From the audit log, for pricing managers.
create function public.price_history(p_limit integer default 200)
returns table (occurred_at timestamptz, actor text, action text, list_name text, sku text, old_pence integer, new_pence integer, valid_from timestamptz, valid_to timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_permission('manage_pricing') then raise exception 'pricing only' using errcode = '42501'; end if;
  return query
    select a.occurred_at,
           coalesce(nullif(trim(p.contact_name), ''), p.company_name, 'System'),
           a.action,
           pl.name,
           v.sku,
           nullif(a.old_data ->> 'amount_pence', '')::integer,
           nullif(a.new_data ->> 'amount_pence', '')::integer,
           nullif(coalesce(a.new_data ->> 'valid_from', a.old_data ->> 'valid_from'), '')::timestamptz,
           nullif(coalesce(a.new_data ->> 'valid_to', a.old_data ->> 'valid_to'), '')::timestamptz
    from public.audit_log a
    left join public.profiles p on p.id = a.actor_id
    left join public.price_lists pl on pl.id = nullif(coalesce(a.new_data ->> 'price_list_id', a.old_data ->> 'price_list_id'), '')::uuid
    left join public.product_variants v on v.id = nullif(coalesce(a.new_data ->> 'variant_id', a.old_data ->> 'variant_id'), '')::uuid
    where a.table_name = 'price_list_items'
    order by a.occurred_at desc
    limit greatest(1, least(p_limit, 1000));
end;
$$;

revoke execute on function public.admin_overview(), public.admin_analytics(integer), public.price_history(integer) from public, anon;
grant execute on function public.admin_overview(), public.admin_analytics(integer), public.price_history(integer) to authenticated;
