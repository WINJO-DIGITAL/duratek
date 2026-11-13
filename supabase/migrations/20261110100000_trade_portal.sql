-- Trade portal: the trader's customers, project rooms with measurements,
-- room-grouped quote lines, contingency, and the trader's own branding for
-- quotes. Additive only.

-- ---------------------------------------------------------------------------
-- Customers: the trader's own customer records. Private to that trader.
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone is null or length(phone) <= 30),
  address text not null default '' check (length(address) <= 400),
  postcode text check (postcode is null or postcode ~ '^[A-Z]{1,2}[0-9][A-Z0-9]? [0-9][A-Z]{2}$'),
  notes text not null default '' check (length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customers_profile_idx on public.customers (profile_id, name);
create trigger customers_touch before update on public.customers for each row execute function public.touch_updated_at();

alter table public.customers enable row level security;
revoke all on public.customers from anon;
create policy "trade manage own customers" on public.customers for all to authenticated
  using (profile_id = (select auth.uid()) and (select public.is_approved_trade()))
  with check (profile_id = (select auth.uid()) and (select public.is_approved_trade()));

-- ---------------------------------------------------------------------------
-- Projects: a customer, and rooms with measurements.
-- ---------------------------------------------------------------------------
alter table public.projects add column customer_id uuid references public.customers (id) on delete set null;
create index projects_customer_idx on public.projects (customer_id);

alter table public.project_items
  add column length_m numeric(7, 2) check (length_m is null or (length_m > 0 and length_m <= 1000)),
  add column width_m numeric(7, 2) check (width_m is null or (width_m > 0 and width_m <= 1000)),
  add column wastage_pct numeric(4, 1) check (wastage_pct is null or wastage_pct between 0 and 50);
comment on table public.project_items is 'Rooms of a project: name, measurements (or a measured area), wastage and the chosen finish.';

drop policy "trade manage own projects" on public.projects;
create policy "trade manage own projects" on public.projects for all to authenticated
  using (profile_id = (select auth.uid()) and (select public.is_approved_trade()))
  with check (
    profile_id = (select auth.uid()) and (select public.is_approved_trade())
    and (customer_id is null or exists (select 1 from public.customers c where c.id = customer_id and c.profile_id = (select auth.uid())))
  );

-- ---------------------------------------------------------------------------
-- Quotes: a customer record, a contingency allowance, lines grouped by room.
-- ---------------------------------------------------------------------------
alter table public.quotes
  add column customer_id uuid references public.customers (id) on delete set null,
  -- An internal cost allowance for the unexpected, as a share of the job cost. Never shown to the customer.
  add column contingency_bp integer not null default 0 check (contingency_bp between 0 and 5000);
create index quotes_customer_idx on public.quotes (customer_id);
alter table public.quote_lines add column room_name text check (room_name is null or length(room_name) <= 120);

drop policy "trade manage own quotes" on public.quotes;
create policy "trade manage own quotes" on public.quotes for all to authenticated
  using (profile_id = (select auth.uid()) and (select public.is_approved_trade()))
  with check (
    profile_id = (select auth.uid()) and (select public.is_approved_trade())
    and (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.profile_id = (select auth.uid())))
    and (customer_id is null or exists (select 1 from public.customers c where c.id = customer_id and c.profile_id = (select auth.uid())))
  );

-- ---------------------------------------------------------------------------
-- The trader's branding for quotes.
-- ---------------------------------------------------------------------------
alter table public.trade_preferences
  add column display_name text check (display_name is null or length(display_name) <= 120),
  add column contact_email text check (contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add column contact_phone text check (contact_phone is null or length(contact_phone) <= 30),
  add column website text check (website is null or website ~ '^https://'),
  add column address text check (address is null or length(address) <= 400),
  add column logo_path text check (logo_path is null or logo_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,80}$'),
  add column brand_colour text check (brand_colour is null or brand_colour ~ '^#[0-9a-fA-F]{6}$'),
  -- Default labour rate, per m², before VAT.
  add column labour_per_m2_pence integer check (labour_per_m2_pence is null or labour_per_m2_pence between 0 and 1000000);

-- Logos: public (they appear on quotes customers open by link), in a folder per trader.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trade-logos', 'trade-logos', true, 1048576, array['image/png', 'image/jpeg'])
on conflict (id) do nothing;

create policy "trade manage own logo" on storage.objects for all to authenticated
  using (bucket_id = 'trade-logos' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.is_approved_trade()))
  with check (bucket_id = 'trade-logos' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.is_approved_trade()));

-- ---------------------------------------------------------------------------
-- The customer's copy now carries the trader's branding and room names.
-- Still sell prices only: no cost, no margin, no contingency, no customer
-- email or phone, never a draft.
-- ---------------------------------------------------------------------------
create or replace function public.get_shared_quote(p_token text)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'reference', q.reference,
    'status', q.status,
    'customer_name', q.customer_name,
    'site_address', q.site_address,
    'site_postcode', q.site_postcode,
    'notes', q.notes,
    'valid_until', q.valid_until,
    'vat_rate_bp', q.vat_rate_bp,
    'issued_at', coalesce(q.sent_at, q.created_at),
    'responded_at', q.responded_at,
    'trader', jsonb_build_object(
      'company_name', coalesce(nullif(tp.display_name, ''), p.company_name),
      'contact_name', p.contact_name,
      'phone', coalesce(tp.contact_phone, p.phone),
      'email', tp.contact_email,
      'website', tp.website,
      'address', tp.address,
      'logo_path', tp.logo_path,
      'brand_colour', tp.brand_colour
    ),
    'footer', coalesce(tp.quote_footer, ''),
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', l.kind,
        'finish_id', l.finish_id,
        'room_name', l.room_name,
        'description', l.description,
        'quantity', l.quantity,
        'unit', l.unit,
        'unit_sell_pence', l.unit_sell_pence
      ) order by l.sort_order, l.created_at)
      from public.quote_lines l where l.quote_id = q.id
    ), '[]'::jsonb)
  )
  from public.quotes q
  join public.profiles p on p.id = q.profile_id
  left join public.trade_preferences tp on tp.profile_id = q.profile_id
  where length(p_token) >= 20
    and q.share_token = p_token
    and q.status <> 'draft'
    and p.status = 'approved';
$$;
