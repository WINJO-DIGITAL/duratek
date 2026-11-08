-- Trade platform: trader preferences, quotations, customer quote links,
-- sample dispatch time and the owner's dashboard figures.
-- Additive only: no existing table, column or row is changed or removed.
--
-- A trader's costs, selling prices, margins and customers are private to that
-- trader. The owner sees aggregate demand only (admin_dashboard_stats).

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.quote_status as enum ('draft', 'sent', 'accepted', 'declined');
create type public.quote_line_kind as enum ('flooring', 'accessory', 'labour', 'other');
create type public.quote_unit as enum ('pack', 'm2', 'item', 'hour', 'metre');

-- ---------------------------------------------------------------------------
-- Trader preferences
-- ---------------------------------------------------------------------------
create table public.trade_preferences (
  profile_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  -- Markup on cost, in basis points (3000 = 30%).
  default_markup_bp integer not null default 3000 check (default_markup_bp between 0 and 100000),
  default_wastage_pct numeric(4, 1) not null default 10 check (default_wastage_pct between 0 and 50),
  vat_registered boolean not null default true,
  quote_footer text not null default '' check (length(quote_footer) <= 2000),
  updated_at timestamptz not null default now()
);
comment on table public.trade_preferences is 'A trader''s own defaults for quotes and calculators. Private to that trader.';

-- ---------------------------------------------------------------------------
-- Quotes
-- ---------------------------------------------------------------------------
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reference text not null default '',
  customer_name text not null check (length(trim(customer_name)) between 1 and 200),
  customer_email text check (customer_email is null or customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  customer_phone text check (customer_phone is null or length(customer_phone) <= 30),
  site_address text not null default '' check (length(site_address) <= 400),
  site_postcode text check (site_postcode is null or site_postcode ~* '^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$'),
  status public.quote_status not null default 'draft',
  -- VAT rate in basis points (2000 = 20%). 0 for a trader who isn't VAT registered.
  vat_rate_bp integer not null default 2000 check (vat_rate_bp between 0 and 10000),
  notes text not null default '' check (length(notes) <= 4000),
  valid_until date,
  share_token text not null unique
    default translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_'),
  sent_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, reference)
);
create index quotes_profile_created_idx on public.quotes (profile_id, created_at desc);
comment on column public.quotes.share_token is 'Customer link /q/<token>. Only works once the quote is no longer a draft.';

create table public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  kind public.quote_line_kind not null,
  finish_id uuid references public.finishes (id) on delete set null,
  description text not null check (length(trim(description)) between 1 and 300),
  quantity numeric(10, 2) not null check (quantity > 0 and quantity <= 100000),
  unit public.quote_unit not null,
  -- What the trader pays, per unit. PRIVATE: never in the customer copy.
  unit_cost_pence integer not null default 0 check (unit_cost_pence between 0 and 100000000),
  -- What the customer pays, per unit, before VAT.
  unit_sell_pence integer not null check (unit_sell_pence between 0 and 100000000),
  -- For flooring lines: the measured area and wastage the packs were worked out from.
  area_m2 numeric(10, 2) check (area_m2 is null or area_m2 > 0),
  wastage_pct numeric(4, 1) check (wastage_pct is null or wastage_pct between 0 and 50),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index quote_lines_quote_idx on public.quote_lines (quote_id, sort_order);
comment on column public.quote_lines.unit_cost_pence is 'Trader''s own cost. Private to the trader; never shown to their customer.';

create trigger trade_preferences_touch before update on public.trade_preferences
  for each row execute function public.touch_updated_at();
create trigger quotes_touch before update on public.quotes
  for each row execute function public.touch_updated_at();

-- Quote references run per trader: Q-0001, Q-0002 ...
create function public.assign_quote_reference() returns trigger
language plpgsql set search_path = '' as $$
declare
  n integer;
begin
  if new.reference is null or new.reference = '' then
    select coalesce(max((substring(q.reference from '^Q-([0-9]+)$'))::integer), 0) + 1 into n
    from public.quotes q where q.profile_id = new.profile_id;
    new.reference := 'Q-' || lpad(n::text, 4, '0');
  end if;
  return new;
end;
$$;
create trigger quotes_reference before insert on public.quotes
  for each row execute function public.assign_quote_reference();

-- Touching a line marks its quote updated.
create function public.touch_quote_from_line() returns trigger
language plpgsql set search_path = '' as $$
begin
  update public.quotes set updated_at = now() where id = coalesce(new.quote_id, old.quote_id);
  return null;
end;
$$;
create trigger quote_lines_touch after insert or update or delete on public.quote_lines
  for each row execute function public.touch_quote_from_line();

-- ---------------------------------------------------------------------------
-- Sample dispatch
-- ---------------------------------------------------------------------------
alter table public.sample_requests add column sent_at timestamptz;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.trade_preferences enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_lines enable row level security;

revoke all on public.trade_preferences, public.quotes, public.quote_lines from anon;

create policy "trade manage own preferences" on public.trade_preferences for all to authenticated
  using (profile_id = (select auth.uid()) and (select public.is_approved_trade()))
  with check (profile_id = (select auth.uid()) and (select public.is_approved_trade()));

create policy "trade manage own quotes" on public.quotes for all to authenticated
  using (profile_id = (select auth.uid()) and (select public.is_approved_trade()))
  with check (profile_id = (select auth.uid()) and (select public.is_approved_trade()));

create policy "trade manage own quote lines" on public.quote_lines for all to authenticated
  using (
    (select public.is_approved_trade()) and exists (
      select 1 from public.quotes q where q.id = quote_id and q.profile_id = (select auth.uid())
    )
  )
  with check (
    (select public.is_approved_trade()) and exists (
      select 1 from public.quotes q where q.id = quote_id and q.profile_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Customer copy of a quote, by link. Sell prices only: no cost, no margin,
-- no other quotes, no customer email or phone. Drafts are never shared, and
-- a trader whose access was removed can no longer share.
-- ---------------------------------------------------------------------------
create function public.get_shared_quote(p_token text)
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
      'company_name', p.company_name,
      'contact_name', p.contact_name,
      'phone', p.phone
    ),
    'footer', coalesce(tp.quote_footer, ''),
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', l.kind,
        'finish_id', l.finish_id,
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
revoke execute on function public.get_shared_quote(text) from public;
grant execute on function public.get_shared_quote(text) to anon, authenticated;

-- The customer accepts or declines a sent quote. Only sent -> accepted/declined.
-- Returns the new status, or null if nothing changed.
create function public.respond_to_quote(p_token text, p_decision text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  result text;
begin
  if p_decision not in ('accepted', 'declined') or length(p_token) < 20 then
    return null;
  end if;
  update public.quotes q
     set status = p_decision::public.quote_status, responded_at = now()
   where q.share_token = p_token
     and q.status = 'sent'
     and exists (select 1 from public.profiles p where p.id = q.profile_id and p.status = 'approved')
  returning q.status::text into result;
  return result;
end;
$$;
revoke execute on function public.respond_to_quote(text, text) from public;
grant execute on function public.respond_to_quote(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Owner dashboard figures. Counts and demand only: no trader prices, margins
-- or customer details.
-- ---------------------------------------------------------------------------
create function public.admin_dashboard_stats()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'accounts', (
      select jsonb_build_object(
        'pending', count(*) filter (where status = 'pending'),
        'approved', count(*) filter (where status = 'approved'),
        'rejected', count(*) filter (where status = 'rejected'),
        'new_30d', count(*) filter (where created_at > now() - interval '30 days')
      ) from public.profiles where not is_admin
    ),
    'samples', (
      select jsonb_build_object(
        'new', count(*) filter (where status = 'new'),
        'sent', count(*) filter (where status = 'sent'),
        'last_30d', count(*) filter (where created_at > now() - interval '30 days'),
        'marketing_opt_in_30d', count(*) filter (where marketing_opt_in and created_at > now() - interval '30 days')
      ) from public.sample_requests
    ),
    'samples_by_finish_90d', coalesce((
      select jsonb_agg(jsonb_build_object('finish_id', x.finish_id, 'count', x.n) order by x.n desc)
      from (
        select fid as finish_id, count(*) as n
        from public.sample_requests s, unnest(s.finish_ids) as fid
        where s.created_at > now() - interval '90 days'
        group by fid
      ) x
    ), '[]'::jsonb),
    'samples_by_week', coalesce((
      select jsonb_agg(jsonb_build_object('week', w.week, 'count', w.n) order by w.week)
      from (
        select date_trunc('week', created_at)::date as week, count(*) as n
        from public.sample_requests
        where created_at > now() - interval '12 weeks'
        group by 1
      ) w
    ), '[]'::jsonb),
    'quotes', (
      select jsonb_build_object(
        'draft', count(*) filter (where status = 'draft'),
        'sent', count(*) filter (where status = 'sent'),
        'accepted', count(*) filter (where status = 'accepted'),
        'declined', count(*) filter (where status = 'declined'),
        'last_30d', count(*) filter (where created_at > now() - interval '30 days')
      ) from public.quotes
    ),
    'quoted_m2_by_finish_90d', coalesce((
      select jsonb_agg(jsonb_build_object('finish_id', y.finish_id, 'm2', y.m2, 'quotes', y.quotes) order by y.m2 desc)
      from (
        select l.finish_id, sum(coalesce(l.area_m2, 0)) as m2, count(distinct l.quote_id) as quotes
        from public.quote_lines l join public.quotes q on q.id = l.quote_id
        where l.kind = 'flooring' and l.finish_id is not null and q.created_at > now() - interval '90 days'
        group by l.finish_id
      ) y
    ), '[]'::jsonb),
    'shortlists', (select count(*) from public.shortlists),
    'stockists', (
      select jsonb_build_object('published', count(*) filter (where published), 'total', count(*)) from public.stockists
    ),
    'documents', (select count(*) from public.documents)
  );
end;
$$;
revoke execute on function public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated;
