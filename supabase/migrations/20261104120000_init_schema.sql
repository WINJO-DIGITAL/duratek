-- Duratek v1 schema: catalogue, trade accounts, prices, samples, stockists.
-- Money is integer pence. Personal data is admin-only. Prices are readable
-- only by approved trade users, and only their own tier or account price.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.finish_style as enum ('plank', 'herringbone');
create type public.trade_type as enum ('fitter', 'retailer', 'contractor', 'specifier');
create type public.profile_status as enum ('pending', 'approved', 'rejected');
create type public.image_kind as enum ('swatch', 'room', 'closeup');
create type public.document_type as enum ('tech_sheet', 'warranty', 'certificate', 'fitting_guide', 'brochure');
create type public.stockist_type as enum ('showroom', 'retailer', 'fitter');
create type public.sample_status as enum ('new', 'sent');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.price_tiers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  company_name text not null default '',
  contact_name text not null default '',
  phone text,
  trade_type public.trade_type,
  status public.profile_status not null default 'pending',
  tier_id uuid references public.price_tiers (id) on delete set null,
  is_admin boolean not null default false,
  list_as_stockist boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Trade accounts. A trade application is a profile with status = pending.';

create table public.finishes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  style public.finish_style not null,
  colour_family text not null,
  description text not null default '',
  specs jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  published boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index finishes_published_sort_idx on public.finishes (published, sort_order);

create table public.finish_images (
  id uuid primary key default gen_random_uuid(),
  finish_id uuid not null references public.finishes (id) on delete cascade,
  url text not null, -- absolute URL, or a path in the finish-images storage bucket
  kind public.image_kind not null,
  alt text not null check (length(trim(alt)) > 0),
  width integer check (width > 0),
  height integer check (height > 0),
  blur_data_url text, -- tiny base64 placeholder for next/image
  sort_order integer not null default 0
);
create index finish_images_finish_idx on public.finish_images (finish_id, kind, sort_order);

create table public.prices (
  finish_id uuid not null references public.finishes (id) on delete cascade,
  tier_id uuid not null references public.price_tiers (id) on delete cascade,
  price_per_m2_pence integer not null check (price_per_m2_pence >= 0),
  updated_at timestamptz not null default now(),
  primary key (finish_id, tier_id)
);

create table public.price_overrides (
  finish_id uuid not null references public.finishes (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  price_per_m2_pence integer not null check (price_per_m2_pence >= 0),
  updated_at timestamptz not null default now(),
  primary key (finish_id, profile_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type public.document_type not null,
  finish_id uuid references public.finishes (id) on delete cascade,
  storage_path text not null unique, -- path in the private documents bucket
  trade_only boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.sample_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 200),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text,
  address_line1 text not null,
  address_line2 text,
  town text not null,
  postcode text not null check (postcode ~* '^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$'),
  finish_ids uuid[] not null check (cardinality(finish_ids) >= 1),
  marketing_opt_in boolean not null default false,
  status public.sample_status not null default 'new',
  created_at timestamptz not null default now()
);
create index sample_requests_status_created_idx on public.sample_requests (status, created_at desc);

create table public.stockists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.stockist_type not null,
  address text not null,
  postcode text not null,
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  phone text,
  website text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.online_retailers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null check (url ~ '^https://'),
  logo_path text,
  sort_order integer not null default 0,
  published boolean not null default false
);

create table public.shortlists (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  token text not null unique
    default translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/=', '-_'),
  finish_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.inspiration (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  mood text not null,
  image_path text not null, -- absolute URL or a path in the finish-images bucket
  alt text not null default '',
  width integer,
  height integer,
  blur_data_url text,
  finish_ids uuid[] not null default '{}',
  sort_order integer not null default 0,
  published boolean not null default false,
  is_demo boolean not null default false
);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger finishes_touch before update on public.finishes
  for each row execute function public.touch_updated_at();
create trigger prices_touch before update on public.prices
  for each row execute function public.touch_updated_at();
create trigger price_overrides_touch before update on public.price_overrides
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Role helpers. SECURITY DEFINER so policies can read profiles without
-- recursing through profiles' own RLS.
-- ---------------------------------------------------------------------------
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

create function public.is_approved_trade() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'approved'
  );
$$;

create function public.current_tier_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.tier_id from public.profiles p
  where p.id = (select auth.uid()) and p.status = 'approved';
$$;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_approved_trade() from public, anon;
revoke execute on function public.current_tier_id() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_approved_trade() to authenticated;
grant execute on function public.current_tier_id() to authenticated;

-- New auth users become pending trade applications. Only safe, self-reported
-- fields are copied from signup metadata; status, tier and is_admin are never
-- taken from user input.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  tt text := meta ->> 'trade_type';
begin
  insert into public.profiles (id, company_name, contact_name, phone, trade_type)
  values (
    new.id,
    left(coalesce(meta ->> 'company_name', ''), 200),
    left(coalesce(meta ->> 'contact_name', ''), 200),
    left(meta ->> 'phone', 40),
    case when tt in ('fitter', 'retailer', 'contractor', 'specifier')
      then tt::public.trade_type end
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.price_tiers enable row level security;
alter table public.profiles enable row level security;
alter table public.finishes enable row level security;
alter table public.finish_images enable row level security;
alter table public.prices enable row level security;
alter table public.price_overrides enable row level security;
alter table public.documents enable row level security;
alter table public.sample_requests enable row level security;
alter table public.stockists enable row level security;
alter table public.online_retailers enable row level security;
alter table public.shortlists enable row level security;
alter table public.inspiration enable row level security;

-- Defence in depth: anon has no table privileges at all on private tables,
-- so a missing policy can never leak them.
revoke all on public.price_tiers, public.profiles, public.prices, public.price_overrides,
  public.sample_requests, public.shortlists from anon;

-- authenticated is the role for both traders and admins, so it holds column
-- grants on every editable profile column. Policies decide whose rows can be
-- touched; profiles_guard (below) stops a non-admin changing status, tier,
-- trade type or is_admin on their own row.
revoke insert, update, delete on public.profiles from authenticated;
grant insert, delete on public.profiles to authenticated;
grant update (company_name, contact_name, phone, list_as_stockist, trade_type, status, tier_id, is_admin)
  on public.profiles to authenticated;

-- price_tiers
create policy "approved trade read own tier" on public.price_tiers for select to authenticated
  using (id = (select public.current_tier_id()));
create policy "admin manage tiers" on public.price_tiers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- profiles
create policy "read own profile" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "admin read profiles" on public.profiles for select to authenticated
  using ((select public.is_admin()));
create policy "update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid()) and not (select public.is_admin()))
  with check (id = (select auth.uid()));
create policy "admin manage profiles" on public.profiles for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- A non-admin who updates their own row must not change privileged columns.
create function public.guard_profile_privileged_columns() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select auth.role()) = 'authenticated' and not public.is_admin() then
    if new.status is distinct from old.status
      or new.tier_id is distinct from old.tier_id
      or new.is_admin is distinct from old.is_admin
      or new.trade_type is distinct from old.trade_type then
      raise exception 'not allowed to change account status, tier or role';
    end if;
  end if;
  return new;
end;
$$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();

-- finishes and images: public catalogue
create policy "public read published finishes" on public.finishes for select to anon, authenticated
  using (published);
create policy "admin manage finishes" on public.finishes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "public read images of published finishes" on public.finish_images for select to anon, authenticated
  using (exists (select 1 from public.finishes f where f.id = finish_id and f.published));
create policy "admin manage finish images" on public.finish_images for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- prices: approved trade, own tier only
create policy "approved trade read own tier prices" on public.prices for select to authenticated
  using (tier_id = (select public.current_tier_id()));
create policy "admin manage prices" on public.prices for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "approved trade read own overrides" on public.price_overrides for select to authenticated
  using (profile_id = (select auth.uid()) and (select public.is_approved_trade()));
create policy "admin manage overrides" on public.price_overrides for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- The effective price for the signed-in user: account override, else tier.
-- security_invoker means the RLS above applies to whoever queries it.
create view public.my_prices with (security_invoker = true) as
  select f.id as finish_id,
         coalesce(o.price_per_m2_pence, p.price_per_m2_pence) as price_per_m2_pence,
         (o.price_per_m2_pence is not null) as is_account_price
  from public.finishes f
  left join public.prices p on p.finish_id = f.id
  left join public.price_overrides o on o.finish_id = f.id and o.profile_id = (select auth.uid())
  where coalesce(o.price_per_m2_pence, p.price_per_m2_pence) is not null;
revoke all on public.my_prices from anon;

-- documents: public ones for everyone, trade-only for approved trade
create policy "public read public documents" on public.documents for select to anon, authenticated
  using (not trade_only);
create policy "approved trade read trade documents" on public.documents for select to authenticated
  using (trade_only and (select public.is_approved_trade()));
create policy "admin manage documents" on public.documents for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- sample_requests: personal data, admin only. Public submissions go through
-- a server route that validates, rate-limits, then inserts with the service
-- role, so there is deliberately no anon insert policy.
create policy "admin manage sample requests" on public.sample_requests for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- stockists and online retailers
create policy "public read published stockists" on public.stockists for select to anon, authenticated
  using (published);
create policy "admin manage stockists" on public.stockists for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "public read published retailers" on public.online_retailers for select to anon, authenticated
  using (published);
create policy "admin manage retailers" on public.online_retailers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- inspiration
create policy "public read published inspiration" on public.inspiration for select to anon, authenticated
  using (published);
create policy "admin manage inspiration" on public.inspiration for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- shortlists: approved traders manage their own
create policy "trade manage own shortlists" on public.shortlists for all to authenticated
  using (profile_id = (select auth.uid()) and (select public.is_approved_trade()))
  with check (profile_id = (select auth.uid()) and (select public.is_approved_trade()));
create policy "admin read shortlists" on public.shortlists for select to authenticated
  using ((select public.is_admin()));

-- Public shared shortlist by token. Returns names and finish ids only, never
-- prices and never the owner's details.
create function public.get_shared_shortlist(share_token text)
returns table (name text, finish_ids uuid[])
language sql stable security definer set search_path = '' as $$
  select s.name, s.finish_ids from public.shortlists s
  where s.token = share_token and length(share_token) >= 20;
$$;
revoke execute on function public.get_shared_shortlist(text) from public;
grant execute on function public.get_shared_shortlist(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('finish-images', 'finish-images', true), ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "admin write finish images" on storage.objects for all to authenticated
  using (bucket_id = 'finish-images' and (select public.is_admin()))
  with check (bucket_id = 'finish-images' and (select public.is_admin()));

create policy "admin manage documents files" on storage.objects for all to authenticated
  using (bucket_id = 'documents' and (select public.is_admin()))
  with check (bucket_id = 'documents' and (select public.is_admin()));

-- Signed URLs for documents are created server-side as the requesting user,
-- so this policy decides who can obtain one.
create policy "read permitted documents files" on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'documents' and exists (
      select 1 from public.documents d
      where d.storage_path = name
        and (not d.trade_only or (select public.is_approved_trade()))
    )
  );
