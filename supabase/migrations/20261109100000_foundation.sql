-- Duratek foundation: roles and permissions, businesses and trade
-- applications, collections and product variants, a single pricing model
-- (price lists, items, promotions, volume breaks, future prices), VAT and
-- units of sale, saved products and projects, audit log, system settings.
--
-- Additive and non-destructive: no table, column or row is dropped. Existing
-- prices are copied into the new model; the old price columns and tables
-- (finishes.rrp_per_m2_pence, prices, price_overrides) become derived copies
-- kept in step by triggers, so prices are written in exactly one place.

-- ===========================================================================
-- Types
-- ===========================================================================
create type public.account_role as enum ('super_admin', 'admin', 'trade', 'stockist');
create type public.admin_permission as enum (
  'manage_accounts',   -- review applications, approve, suspend, tiers, account prices
  'manage_pricing',    -- price lists, items, promotions, tiers
  'manage_products',   -- finishes, collections, variants, images, inspiration
  'manage_stockists',  -- stockists, online retailers
  'manage_samples',    -- sample requests (personal data)
  'manage_documents',  -- documents and their files
  'manage_settings',   -- system settings
  'view_reports',      -- owner dashboard figures
  'view_audit'         -- audit log
);
create type public.product_type as enum ('flooring', 'accessory');
create type public.unit_of_sale as enum ('m2', 'pack', 'item', 'linear_metre');
create type public.price_list_kind as enum ('rrp', 'trade', 'stockist', 'account', 'promotion');
create type public.promotion_audience as enum ('public', 'trade', 'stockist', 'all');

-- ===========================================================================
-- System settings
-- ===========================================================================
create table public.system_settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,62}$'),
  value jsonb not null,
  is_public boolean not null default false,
  description text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
insert into public.system_settings (key, value, is_public, description) values
  ('currency', '"GBP"', true, 'Currency for every price. GBP only for now.'),
  ('default_vat_rate_bp', '2000', true, 'UK standard VAT rate in basis points (2000 = 20%). New variants start with this rate.'),
  ('sample_limit', '3', true, 'Free samples per request.'),
  ('quote_validity_days', '30', false, 'Suggested validity for new trade quotes.');

-- ===========================================================================
-- Accounts: roles, permissions, businesses, applications
-- ===========================================================================
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 200),
  business_type public.trade_type,
  company_number text check (company_number is null or company_number ~ '^(SC|NI|OC|SO|NC|R0|[0-9]{2})[0-9]{6}$'),
  vat_number text check (vat_number is null or vat_number ~ '^GB([0-9]{9}|[0-9]{12}|GD[0-9]{3}|HA[0-9]{3})$'),
  address_line1 text check (address_line1 is null or length(address_line1) <= 200),
  address_line2 text check (address_line2 is null or length(address_line2) <= 200),
  town text check (town is null or length(town) <= 100),
  postcode text check (postcode is null or postcode ~ '^[A-Z]{1,2}[0-9][A-Z0-9]? [0-9][A-Z]{2}$'),
  phone text check (phone is null or length(phone) <= 30),
  website text check (website is null or website ~ '^https://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.businesses is 'The company behind a trade or stockist account. Edited by account managers only once submitted.';

alter table public.profiles
  add column role public.account_role not null default 'trade',
  add column business_id uuid references public.businesses (id) on delete set null,
  add column status_reason text check (status_reason is null or length(status_reason) <= 1000),
  add column status_changed_at timestamptz,
  add column status_changed_by uuid references auth.users (id) on delete set null;
create index profiles_business_idx on public.profiles (business_id);
create index profiles_status_idx on public.profiles (status, created_at desc);
comment on column public.profiles.is_admin is 'Legacy flag, kept in step with role (super_admin or admin). Use role.';

-- Existing owners become super administrators.
update public.profiles set role = 'super_admin' where is_admin;

create table public.admin_permissions (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  permission public.admin_permission not null,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (profile_id, permission)
);
comment on table public.admin_permissions is 'What an administrator (role admin) may do. A super administrator may do everything.';

create table public.trade_applications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete set null,
  additional_info text not null default '' check (length(additional_info) <= 2000),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  decision_note text check (decision_note is null or length(decision_note) <= 1000)
);
comment on table public.trade_applications is 'What an applicant submitted, and its review. The account status lives on profiles.status (pending, approved, rejected, suspended).';

-- ---------------------------------------------------------------------------
-- Role helpers. SECURITY DEFINER so policies can read profiles without
-- recursing through profiles' own RLS. A suspended or rejected account has
-- no administrative power.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('super_admin', 'admin')
      and p.status not in ('rejected', 'suspended')
  );
$$;

create function public.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'super_admin' and p.status not in ('rejected', 'suspended')
  );
$$;

create function public.has_permission(p public.admin_permission) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles pr
    where pr.id = (select auth.uid())
      and pr.status not in ('rejected', 'suspended')
      and (
        pr.role = 'super_admin'
        or (pr.role = 'admin' and exists (
          select 1 from public.admin_permissions ap where ap.profile_id = pr.id and ap.permission = p
        ))
      )
  );
$$;

create function public.my_permissions() returns setof public.admin_permission
language sql stable security definer set search_path = '' as $$
  select e.permission from unnest(enum_range(null::public.admin_permission)) as e(permission)
  where public.has_permission(e.permission);
$$;

revoke execute on function public.is_super_admin(), public.has_permission(public.admin_permission), public.my_permissions() from public, anon;
grant execute on function public.is_super_admin(), public.has_permission(public.admin_permission), public.my_permissions() to authenticated;

-- Keep the legacy is_admin flag and role in step.
create function public.sync_profile_role() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.is_admin and new.role not in ('super_admin', 'admin') then
      new.role := 'super_admin';
    end if;
    new.is_admin := new.role in ('super_admin', 'admin');
  elsif new.role is distinct from old.role then
    new.is_admin := new.role in ('super_admin', 'admin');
  elsif new.is_admin is distinct from old.is_admin then
    new.role := case when new.is_admin then 'super_admin'::public.account_role else 'trade'::public.account_role end;
  end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.status_changed_at := now();
    new.status_changed_by := (select auth.uid());
  end if;
  return new;
end;
$$;
-- Named to run before profiles_guard (triggers fire in name order).
create trigger profiles_0_role_sync before insert or update on public.profiles
  for each row execute function public.sync_profile_role();

-- Who may change what on an account.
create or replace function public.guard_profile_privileged_columns() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select auth.role()) = 'authenticated' then
    if new.status is distinct from old.status
      or new.tier_id is distinct from old.tier_id
      or new.trade_type is distinct from old.trade_type
      or new.role is distinct from old.role
      or new.business_id is distinct from old.business_id
      or new.status_reason is distinct from old.status_reason then
      if not public.has_permission('manage_accounts') then
        raise exception 'not allowed to change account status, tier or role';
      end if;
      if new.id = (select auth.uid()) and (new.status is distinct from old.status or new.role is distinct from old.role) then
        raise exception 'you cannot change your own account status or role';
      end if;
      if new.role is distinct from old.role and not public.is_super_admin() then
        raise exception 'only a super administrator can change roles';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- Permissions: super administrators only, and never on themselves.
create function public.guard_admin_permissions() returns trigger
language plpgsql set search_path = '' as $$
declare
  target uuid := coalesce(new.profile_id, old.profile_id);
begin
  if (select auth.role()) = 'authenticated' then
    if not public.is_super_admin() then
      raise exception 'only a super administrator can change permissions';
    end if;
    if target = (select auth.uid()) then
      raise exception 'you cannot change your own permissions';
    end if;
  end if;
  if tg_op <> 'DELETE' then
    if not exists (select 1 from public.profiles p where p.id = new.profile_id and p.role = 'admin') then
      raise exception 'permissions can only be granted to administrators';
    end if;
    new.granted_by := coalesce(new.granted_by, (select auth.uid()));
    return new;
  end if;
  return old;
end;
$$;
create trigger admin_permissions_guard before insert or update or delete on public.admin_permissions
  for each row execute function public.guard_admin_permissions();

-- Reviewing an application: record who and when, on the application.
create function public.record_application_review() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    update public.trade_applications
       set reviewed_at = now(),
           reviewed_by = (select auth.uid()),
           decision_note = coalesce(new.status_reason, decision_note)
     where profile_id = new.id;
  end if;
  return null;
end;
$$;
create trigger profiles_application_review after update of status on public.profiles
  for each row execute function public.record_application_review();

-- New users: a pending account, their business and their application, from
-- self-reported signup fields only. Bad values are dropped, never trusted;
-- status, tier and role are never taken from user input.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  tt text := meta ->> 'trade_type';
  pc text := upper(regexp_replace(coalesce(meta ->> 'postcode', ''), '\s+', '', 'g'));
  cn text := upper(regexp_replace(coalesce(meta ->> 'company_number', ''), '\s+', '', 'g'));
  vn text := upper(regexp_replace(coalesce(meta ->> 'vat_number', ''), '\s+', '', 'g'));
  site text := left(coalesce(meta ->> 'website', ''), 300);
  company text := left(trim(coalesce(meta ->> 'company_name', '')), 200);
  biz uuid;
begin
  if pc ~ '^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$' then
    pc := left(pc, length(pc) - 3) || ' ' || right(pc, 3);
  else
    pc := null;
  end if;
  if vn ~ '^[0-9]{9}$' or vn ~ '^[0-9]{12}$' then vn := 'GB' || vn; end if;

  if company <> '' then
    insert into public.businesses (name, business_type, company_number, vat_number, address_line1, address_line2, town, postcode, phone, website)
    values (
      company,
      case when tt in ('fitter', 'retailer', 'contractor', 'specifier') then tt::public.trade_type end,
      case when cn ~ '^(SC|NI|OC|SO|NC|R0|[0-9]{2})[0-9]{6}$' then cn end,
      case when vn ~ '^GB([0-9]{9}|[0-9]{12}|GD[0-9]{3}|HA[0-9]{3})$' then vn end,
      nullif(left(trim(coalesce(meta ->> 'address_line1', '')), 200), ''),
      nullif(left(trim(coalesce(meta ->> 'address_line2', '')), 200), ''),
      nullif(left(trim(coalesce(meta ->> 'town', '')), 100), ''),
      pc,
      nullif(left(trim(coalesce(meta ->> 'phone', '')), 30), ''),
      case when site ~ '^https://[^\s/]+\.[^\s]+$' then site end
    )
    returning id into biz;
  end if;

  insert into public.profiles (id, company_name, contact_name, phone, trade_type, business_id)
  values (
    new.id,
    company,
    left(coalesce(meta ->> 'contact_name', ''), 200),
    left(meta ->> 'phone', 40),
    case when tt in ('fitter', 'retailer', 'contractor', 'specifier') then tt::public.trade_type end,
    biz
  );

  insert into public.trade_applications (profile_id, business_id, additional_info)
  values (new.id, biz, left(coalesce(meta ->> 'additional_info', ''), 2000));
  return new;
end;
$$;

-- ===========================================================================
-- Catalogue: collections, product type, variants
-- ===========================================================================
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  sort_order integer not null default 0,
  published boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.finishes
  add column collection_id uuid references public.collections (id) on delete set null,
  add column product_type public.product_type not null default 'flooring';
create index finishes_collection_idx on public.finishes (collection_id);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  finish_id uuid not null references public.finishes (id) on delete cascade,
  sku text not null unique check (sku ~ '^[A-Z0-9][A-Z0-9-]{2,39}$'),
  name text not null check (length(trim(name)) between 1 and 120),
  -- What a customer buys: a pack of flooring, a single item, a metre of trim.
  unit_of_sale public.unit_of_sale not null,
  pack_coverage_m2 numeric(7, 3) check (pack_coverage_m2 is null or pack_coverage_m2 > 0),
  units_per_pack integer check (units_per_pack is null or units_per_pack > 0),
  length_mm integer check (length_mm is null or length_mm > 0),
  width_mm integer check (width_mm is null or width_mm > 0),
  thickness_mm numeric(5, 2) check (thickness_mm is null or thickness_mm > 0),
  vat_rate_bp integer not null default 2000 check (vat_rate_bp between 0 and 10000),
  is_default boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (finish_id, name),
  -- A pack must say what it covers or holds.
  check (unit_of_sale <> 'pack' or pack_coverage_m2 is not null or units_per_pack is not null)
);
create index product_variants_finish_idx on public.product_variants (finish_id, sort_order);
create unique index product_variants_one_default on public.product_variants (finish_id) where is_default;
comment on table public.product_variants is 'The sellable versions of a finish (or accessory). Measurements here are the source; finishes.specs keeps a copy for display.';

-- The default variant's measurements are copied into finishes.specs for display.
create function public.sync_variant_specs() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v public.product_variants;
begin
  select * into v from public.product_variants
   where finish_id = coalesce(new.finish_id, old.finish_id) and is_default;
  if found then
    update public.finishes set specs = (specs - 'pack_coverage_m2' - 'plank_length_mm' - 'plank_width_mm' - 'thickness_mm')
      || jsonb_strip_nulls(jsonb_build_object(
           'pack_coverage_m2', v.pack_coverage_m2,
           'plank_length_mm', v.length_mm,
           'plank_width_mm', v.width_mm,
           'thickness_mm', v.thickness_mm))
     where id = v.finish_id;
  end if;
  return null;
end;
$$;
create trigger product_variants_sync_specs after insert or update or delete on public.product_variants
  for each row execute function public.sync_variant_specs();

-- ===========================================================================
-- Pricing: lists and items
-- ===========================================================================
create table public.price_lists (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(code) <= 60),
  name text not null check (length(trim(name)) between 1 and 120),
  kind public.price_list_kind not null,
  tier_id uuid unique references public.price_tiers (id) on delete cascade,
  profile_id uuid unique references public.profiles (id) on delete cascade,
  audience public.promotion_audience,
  currency char(3) not null default 'GBP' check (currency = 'GBP'),
  prices_include_vat boolean not null,
  is_default boolean not null default false,
  active boolean not null default true,
  valid_from timestamptz,
  valid_to timestamptz,
  description text not null default '',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_from is null or valid_to > valid_from),
  check ((kind = 'account') = (profile_id is not null)),
  check (tier_id is null or kind = 'trade'),
  check ((kind = 'promotion') = (audience is not null)),
  check (not is_default or kind = 'trade')
);
create unique index price_lists_one_rrp on public.price_lists (kind) where kind = 'rrp';
create unique index price_lists_one_default_trade on public.price_lists (kind) where is_default;
comment on table public.price_lists is 'Every price belongs to a list: the public RRP, the standard trade list, a tier, a stockist list, one account, or a promotion.';

create table public.price_list_items (
  id uuid primary key default gen_random_uuid(),
  price_list_id uuid not null references public.price_lists (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  amount_pence integer not null check (amount_pence > 0 and amount_pence <= 100000000),
  -- The price is per this unit: per m², per pack, per item or per metre.
  price_unit public.unit_of_sale not null,
  -- Volume break: applies from this quantity (in price_unit) upwards.
  min_quantity numeric(10, 2) not null default 1 check (min_quantity > 0),
  valid_from timestamptz,
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  check (valid_to is null or valid_from is null or valid_to > valid_from)
);
create unique index price_list_items_unique on public.price_list_items
  (price_list_id, variant_id, min_quantity, coalesce(valid_from, '-infinity'::timestamptz));
create index price_list_items_variant_idx on public.price_list_items (variant_id);
comment on column public.price_list_items.min_quantity is 'Volume break, in price_unit. The highest break at or below the quantity bought applies.';

-- An item's unit must make sense for its variant.
create function public.check_price_unit() returns trigger
language plpgsql set search_path = '' as $$
declare
  v public.product_variants;
begin
  select * into v from public.product_variants where id = new.variant_id;
  if new.price_unit = 'm2' then
    if v.unit_of_sale <> 'm2' and v.pack_coverage_m2 is null then
      raise exception 'a price per m² needs a variant with pack coverage';
    end if;
  elsif new.price_unit <> v.unit_of_sale then
    raise exception 'price unit % does not match the variant''s unit of sale %', new.price_unit, v.unit_of_sale;
  end if;
  new.created_by := coalesce(new.created_by, (select auth.uid()));
  return new;
end;
$$;
create trigger price_list_items_unit before insert or update on public.price_list_items
  for each row execute function public.check_price_unit();

create trigger collections_touch before update on public.collections for each row execute function public.touch_updated_at();
create trigger product_variants_touch before update on public.product_variants for each row execute function public.touch_updated_at();
create trigger price_lists_touch before update on public.price_lists for each row execute function public.touch_updated_at();
create trigger price_list_items_touch before update on public.price_list_items for each row execute function public.touch_updated_at();
create trigger businesses_touch before update on public.businesses for each row execute function public.touch_updated_at();

-- The two standing lists. RRPs are consumer prices, so VAT inclusive; trade
-- prices are VAT exclusive (UK trade convention; confirm with Duratek).
insert into public.price_lists (code, name, kind, prices_include_vat, description)
values ('rrp', 'RRP (public)', 'rrp', true, 'Recommended retail price, shown to everyone.');
insert into public.price_lists (code, name, kind, prices_include_vat, is_default, description)
values ('trade-standard', 'Standard trade', 'trade', false, true, 'Applies to approved trade accounts with no tier price.');
-- A new tier gets its trade list.
create function public.create_tier_price_list() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.price_lists (code, name, kind, tier_id, prices_include_vat)
  values ('tier-' || left(replace(new.id::text, '-', ''), 12), new.name, 'trade', new.id, false)
  on conflict do nothing;
  return null;
end;
$$;
create trigger price_tiers_list after insert on public.price_tiers
  for each row execute function public.create_tier_price_list();

-- ---------------------------------------------------------------------------
-- The price resolver. Prices are decided here, from the caller's own account
-- (auth.uid()), never from anything the browser sends.
--
-- Base price, first list with an applicable item wins:
--   account list > stockist list (stockist role) > tier list > standard trade > RRP
-- Trade lists apply only to an approved account; the public sees the RRP.
-- Within a list: the highest volume break at or below the quantity, then
-- the most recent start date. Items and lists must be valid at the time.
-- A promotion for the caller's audience replaces the base price when it is
-- lower (compared before VAT, in the same price unit).
-- ---------------------------------------------------------------------------
create function public._resolve_price(p_uid uuid, p_variant uuid, p_quantity numeric, p_at timestamptz)
returns table (
  variant_id uuid,
  amount_pence integer,
  currency text,
  prices_include_vat boolean,
  vat_rate_bp integer,
  price_unit public.unit_of_sale,
  net_pence integer,
  gross_pence integer,
  source public.price_list_kind,
  price_list_id uuid,
  min_quantity numeric,
  is_promotion boolean,
  rrp_amount_pence integer,
  rrp_includes_vat boolean,
  rrp_price_unit public.unit_of_sale
)
language sql stable security definer set search_path = '' as $$
  with me as (
    select pr.id, pr.role, pr.tier_id from public.profiles pr where pr.id = p_uid and pr.status = 'approved'
  ),
  ctx as (
    select v.id, v.vat_rate_bp,
           exists (select 1 from me) as trade_ok,
           (select role from me) as my_role,
           (select tier_id from me) as my_tier,
           q.qty,
           case v.unit_of_sale when 'pack' then q.qty * coalesce(v.pack_coverage_m2, 0) when 'm2' then q.qty end as qty_m2
    from public.product_variants v
    cross join (select case when p_quantity is null or p_quantity <= 0 then 1::numeric else p_quantity end as qty) q
    where v.id = p_variant and v.active
  ),
  cand as (
    select distinct on (l.id)
      case
        when l.kind = 'promotion' and (l.audience in ('public', 'all')
             or (l.audience = 'trade' and c.trade_ok)
             or (l.audience = 'stockist' and c.trade_ok and c.my_role = 'stockist')) then 0
        when l.kind = 'account' and c.trade_ok and l.profile_id = p_uid then 1
        when l.kind = 'stockist' and c.trade_ok and c.my_role = 'stockist' then 2
        when l.kind = 'trade' and c.trade_ok and l.tier_id is not null and l.tier_id = c.my_tier then 3
        when l.kind = 'trade' and c.trade_ok and l.is_default then 4
        when l.kind = 'rrp' then 5
      end as rnk,
      l.id as list_id, l.kind, l.prices_include_vat as include_vat,
      i.amount_pence as amount, i.price_unit as unit, i.min_quantity as min_q,
      case when l.prices_include_vat
        then round(i.amount_pence * 10000.0 / (10000 + c.vat_rate_bp))::integer
        else i.amount_pence end as net
    from ctx c
    join public.price_list_items i on i.variant_id = c.id
    join public.price_lists l on l.id = i.price_list_id
    where l.active
      and (l.valid_from is null or l.valid_from <= p_at) and (l.valid_to is null or l.valid_to > p_at)
      and (i.valid_from is null or i.valid_from <= p_at) and (i.valid_to is null or i.valid_to > p_at)
      and i.min_quantity <= case when i.price_unit = 'm2' then coalesce(c.qty_m2, c.qty) else c.qty end
    order by l.id, i.min_quantity desc, i.valid_from desc nulls last
  ),
  valid as (select * from cand where rnk is not null),
  base as (select * from valid where rnk >= 1 order by rnk limit 1),
  promo as (
    select * from valid
    where rnk = 0 and (not exists (select 1 from base) or unit = (select unit from base))
    order by net limit 1
  ),
  promo_wins as (select * from promo where not exists (select 1 from base) or net < (select net from base)),
  chosen as (select * from promo_wins union all select * from base where not exists (select 1 from promo_wins)),
  rrp as (select * from valid where kind = 'rrp' limit 1)
  select c.id, ch.amount, 'GBP'::text, ch.include_vat, c.vat_rate_bp, ch.unit, ch.net,
         case when ch.include_vat then ch.amount else ch.net + round(ch.net * c.vat_rate_bp / 10000.0)::integer end,
         ch.kind, ch.list_id, ch.min_q, ch.kind = 'promotion',
         (select amount from rrp), (select include_vat from rrp), (select unit from rrp)
  from ctx c cross join chosen ch;
$$;
revoke execute on function public._resolve_price(uuid, uuid, numeric, timestamptz) from public, anon, authenticated;

-- The caller's own price. Quantity is in the variant's unit of sale. Only an
-- administrator who manages pricing may ask about another time.
create function public.price_for(p_variant uuid, p_quantity numeric default 1, p_at timestamptz default null)
returns table (
  variant_id uuid, amount_pence integer, currency text, prices_include_vat boolean, vat_rate_bp integer,
  price_unit public.unit_of_sale, net_pence integer, gross_pence integer, source public.price_list_kind,
  price_list_id uuid, min_quantity numeric, is_promotion boolean,
  rrp_amount_pence integer, rrp_includes_vat boolean, rrp_price_unit public.unit_of_sale
)
language sql stable security definer set search_path = '' as $$
  select * from public._resolve_price(
    (select auth.uid()), p_variant, p_quantity,
    case when p_at is not null and public.has_permission('manage_pricing') then p_at else now() end
  );
$$;

-- The caller's price for every active default variant of a published finish, quantity 1.
create function public.catalogue_prices()
returns table (
  finish_id uuid, variant_id uuid, amount_pence integer, currency text, prices_include_vat boolean, vat_rate_bp integer,
  price_unit public.unit_of_sale, net_pence integer, gross_pence integer, source public.price_list_kind,
  is_promotion boolean, rrp_amount_pence integer, rrp_includes_vat boolean
)
language sql stable security definer set search_path = '' as $$
  select v.finish_id, r.variant_id, r.amount_pence, r.currency, r.prices_include_vat, r.vat_rate_bp, r.price_unit,
         r.net_pence, r.gross_pence, r.source, r.is_promotion, r.rrp_amount_pence, r.rrp_includes_vat
  from public.product_variants v
  join public.finishes f on f.id = v.finish_id and f.published
  cross join lateral public._resolve_price((select auth.uid()), v.id, 1, now()) r
  where v.is_default and v.active;
$$;

-- What a given account pays: for administrators who manage pricing or accounts.
create function public.price_for_account(p_profile uuid, p_variant uuid, p_quantity numeric default 1, p_at timestamptz default null)
returns table (
  variant_id uuid, amount_pence integer, currency text, prices_include_vat boolean, vat_rate_bp integer,
  price_unit public.unit_of_sale, net_pence integer, gross_pence integer, source public.price_list_kind,
  price_list_id uuid, min_quantity numeric, is_promotion boolean,
  rrp_amount_pence integer, rrp_includes_vat boolean, rrp_price_unit public.unit_of_sale
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.has_permission('manage_pricing') or public.has_permission('manage_accounts')) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query select * from public._resolve_price(p_profile, p_variant, p_quantity, coalesce(p_at, now()));
end;
$$;

revoke execute on function public.price_for(uuid, numeric, timestamptz), public.catalogue_prices() from public;
grant execute on function public.price_for(uuid, numeric, timestamptz), public.catalogue_prices() to anon, authenticated;
revoke execute on function public.price_for_account(uuid, uuid, numeric, timestamptz) from public, anon;
grant execute on function public.price_for_account(uuid, uuid, numeric, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Legacy price columns, kept in step for code that still reads them: the
-- current, undated, single-quantity, per-m² price of each finish's default
-- variant. Written only by this function; nobody else may write them.
-- ---------------------------------------------------------------------------
create function public.refresh_legacy_prices(p_finish uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  dv uuid;
begin
  select id into dv from public.product_variants where finish_id = p_finish and is_default;
  if dv is null then return; end if;

  update public.finishes f set rrp_per_m2_pence = (
    select i.amount_pence from public.price_list_items i join public.price_lists l on l.id = i.price_list_id
    where l.kind = 'rrp' and l.active and i.variant_id = dv and i.price_unit = 'm2' and i.min_quantity = 1
      and i.valid_from is null and i.valid_to is null
    limit 1
  ) where f.id = p_finish;

  delete from public.prices where finish_id = p_finish;
  insert into public.prices (finish_id, tier_id, price_per_m2_pence)
  select p_finish, l.tier_id, i.amount_pence
  from public.price_list_items i join public.price_lists l on l.id = i.price_list_id
  where l.tier_id is not null and l.active and i.variant_id = dv and i.price_unit = 'm2' and i.min_quantity = 1
    and i.valid_from is null and i.valid_to is null;

  delete from public.price_overrides where finish_id = p_finish;
  insert into public.price_overrides (finish_id, profile_id, price_per_m2_pence)
  select p_finish, l.profile_id, i.amount_pence
  from public.price_list_items i join public.price_lists l on l.id = i.price_list_id
  where l.kind = 'account' and l.active and i.variant_id = dv and i.price_unit = 'm2' and i.min_quantity = 1
    and i.valid_from is null and i.valid_to is null;
end;
$$;
revoke execute on function public.refresh_legacy_prices(uuid) from public, anon, authenticated;

create function public.on_price_item_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  f uuid;
begin
  -- The backfill copies legacy rows in; it rebuilds the copies once at the end.
  if current_setting('duratek.backfilling', true) = 'on' then return null; end if;
  for f in
    select distinct v.finish_id from public.product_variants v
    where v.id in (new.variant_id, old.variant_id)
  loop
    perform public.refresh_legacy_prices(f);
  end loop;
  return null;
end;
$$;
create trigger price_list_items_legacy after insert or update or delete on public.price_list_items
  for each row execute function public.on_price_item_change();

create function public.on_price_list_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  f uuid;
begin
  if current_setting('duratek.backfilling', true) = 'on' then return null; end if;
  for f in
    select distinct v.finish_id from public.price_list_items i join public.product_variants v on v.id = i.variant_id
    where i.price_list_id = coalesce(new.id, old.id)
  loop
    perform public.refresh_legacy_prices(f);
  end loop;
  return null;
end;
$$;
create trigger price_lists_legacy after update on public.price_lists
  for each row execute function public.on_price_list_change();

-- Writes go to price lists only.
revoke insert, update, delete on public.prices, public.price_overrides from authenticated;
revoke update on public.finishes from authenticated;
grant update (name, slug, style, colour_family, description, specs, sort_order, published, is_demo, collection_id, product_type)
  on public.finishes to authenticated;

-- ===========================================================================
-- Saved products and projects
-- ===========================================================================
create table public.saved_products (
  profile_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  finish_id uuid not null references public.finishes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, finish_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  customer_name text check (customer_name is null or length(customer_name) <= 200),
  site_postcode text check (site_postcode is null or site_postcode ~ '^[A-Z]{1,2}[0-9][A-Z0-9]? [0-9][A-Z]{2}$'),
  notes text not null default '' check (length(notes) <= 4000),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_profile_idx on public.projects (profile_id, created_at desc);
create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();

create table public.project_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  finish_id uuid references public.finishes (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  room_name text check (room_name is null or length(room_name) <= 120),
  area_m2 numeric(10, 2) check (area_m2 is null or area_m2 > 0),
  note text not null default '' check (length(note) <= 1000),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index project_items_project_idx on public.project_items (project_id, sort_order);

alter table public.quotes add column project_id uuid references public.projects (id) on delete set null;
create index quotes_project_idx on public.quotes (project_id);

-- Stockist accounts may be linked to their public listing.
alter table public.stockists add column profile_id uuid unique references public.profiles (id) on delete set null;

-- ===========================================================================
-- Audit log. Append-only: no role may change or delete a record.
-- ===========================================================================
create table public.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  actor_role text,
  action text not null,
  table_name text not null,
  record_id text,
  changed_fields text[],
  old_data jsonb,
  new_data jsonb
);
create index audit_log_occurred_idx on public.audit_log (occurred_at desc);
create index audit_log_record_idx on public.audit_log (table_name, record_id, occurred_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, occurred_at desc);

create function public.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  watch text[] := tg_argv;  -- optional: only these columns matter
  changed text[];
  rid text;
begin
  if tg_op = 'UPDATE' then
    select array_agg(k order by k) into changed
    from jsonb_object_keys(n) k
    where (o -> k) is distinct from (n -> k) and k not in ('updated_at');
    if changed is null then return null; end if;
    if array_length(watch, 1) > 0 and not (changed && watch) then return null; end if;
  end if;
  rid := coalesce(n ->> 'id', o ->> 'id', n ->> 'profile_id', o ->> 'profile_id', n ->> 'key', o ->> 'key');
  -- Never copy secrets or bulky data into the log.
  o := o - 'blur_data_url';
  n := n - 'blur_data_url';
  insert into public.audit_log (actor_id, actor_role, action, table_name, record_id, changed_fields, old_data, new_data)
  values ((select auth.uid()), coalesce((select auth.role()), current_user), lower(tg_op), tg_table_name, rid, changed, o, n);
  return null;
end;
$$;

create function public.audit_log_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'audit records cannot be changed or deleted';
end;
$$;
create trigger audit_log_no_update before update or delete on public.audit_log
  for each row execute function public.audit_log_immutable();
create trigger audit_log_no_truncate before truncate on public.audit_log
  for each statement execute function public.audit_log_immutable();

create trigger audit_profiles after update on public.profiles
  for each row execute function public.audit_row('status', 'tier_id', 'role', 'is_admin', 'trade_type', 'business_id', 'status_reason');
create trigger audit_admin_permissions after insert or delete on public.admin_permissions
  for each row execute function public.audit_row();
create trigger audit_price_tiers after insert or update or delete on public.price_tiers
  for each row execute function public.audit_row();
create trigger audit_price_lists after insert or update or delete on public.price_lists
  for each row execute function public.audit_row();
create trigger audit_price_list_items after insert or update or delete on public.price_list_items
  for each row execute function public.audit_row();
create trigger audit_finishes after insert or update or delete on public.finishes
  for each row execute function public.audit_row('name', 'slug', 'style', 'colour_family', 'description', 'specs', 'published', 'collection_id', 'product_type', 'sort_order');
create trigger audit_product_variants after insert or update or delete on public.product_variants
  for each row execute function public.audit_row();
create trigger audit_collections after insert or update or delete on public.collections
  for each row execute function public.audit_row();
create trigger audit_finish_images after insert or update or delete on public.finish_images
  for each row execute function public.audit_row();
create trigger audit_documents after insert or update or delete on public.documents
  for each row execute function public.audit_row();
create trigger audit_stockists after insert or update or delete on public.stockists
  for each row execute function public.audit_row();
create trigger audit_online_retailers after insert or update or delete on public.online_retailers
  for each row execute function public.audit_row();
create trigger audit_system_settings after insert or update or delete on public.system_settings
  for each row execute function public.audit_row();
create trigger audit_businesses after update on public.businesses
  for each row execute function public.audit_row();
create trigger audit_sample_requests after update or delete on public.sample_requests
  for each row execute function public.audit_row('status', 'sent_at');

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.system_settings enable row level security;
alter table public.businesses enable row level security;
alter table public.admin_permissions enable row level security;
alter table public.trade_applications enable row level security;
alter table public.collections enable row level security;
alter table public.product_variants enable row level security;
alter table public.price_lists enable row level security;
alter table public.price_list_items enable row level security;
alter table public.saved_products enable row level security;
alter table public.projects enable row level security;
alter table public.project_items enable row level security;
alter table public.audit_log enable row level security;

revoke all on public.businesses, public.admin_permissions, public.trade_applications, public.price_lists,
  public.price_list_items, public.saved_products, public.projects, public.project_items, public.audit_log from anon;
revoke insert, update, delete, truncate on public.audit_log from authenticated;
revoke truncate on all tables in schema public from anon, authenticated;

-- Settings: public ones for everyone; all for administrators; written by settings managers.
create policy "read public settings" on public.system_settings for select to anon, authenticated using (is_public);
create policy "admin read settings" on public.system_settings for select to authenticated using ((select public.is_admin()));
create policy "settings managers write" on public.system_settings for all to authenticated
  using ((select public.has_permission('manage_settings'))) with check ((select public.has_permission('manage_settings')));

-- Businesses and applications: the account holder reads their own; account managers manage.
create policy "read own business" on public.businesses for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.business_id = businesses.id));
create policy "account managers manage businesses" on public.businesses for all to authenticated
  using ((select public.has_permission('manage_accounts'))) with check ((select public.has_permission('manage_accounts')));
create policy "read own application" on public.trade_applications for select to authenticated
  using (profile_id = (select auth.uid()));
create policy "account managers manage applications" on public.trade_applications for all to authenticated
  using ((select public.has_permission('manage_accounts'))) with check ((select public.has_permission('manage_accounts')));

-- Permissions: an administrator reads their own; super administrators manage (guard trigger checks too).
create policy "read own permissions" on public.admin_permissions for select to authenticated
  using (profile_id = (select auth.uid()));
create policy "super admin manage permissions" on public.admin_permissions for all to authenticated
  using ((select public.is_super_admin())) with check ((select public.is_super_admin()));

-- Catalogue.
create policy "public read published collections" on public.collections for select to anon, authenticated using (published);
create policy "product managers manage collections" on public.collections for all to authenticated
  using ((select public.has_permission('manage_products'))) with check ((select public.has_permission('manage_products')));
create policy "public read variants of published finishes" on public.product_variants for select to anon, authenticated
  using (active and exists (select 1 from public.finishes f where f.id = finish_id and f.published));
create policy "product managers manage variants" on public.product_variants for all to authenticated
  using ((select public.has_permission('manage_products'))) with check ((select public.has_permission('manage_products')));

-- Price lists and items: pricing managers only. Everyone else gets prices
-- only through the resolver, which decides what they may see.
create policy "pricing managers manage price lists" on public.price_lists for all to authenticated
  using ((select public.has_permission('manage_pricing'))) with check ((select public.has_permission('manage_pricing')));
create policy "account managers read account price lists" on public.price_lists for select to authenticated
  using (kind = 'account' and (select public.has_permission('manage_accounts')));
create policy "pricing managers manage price items" on public.price_list_items for all to authenticated
  using ((select public.has_permission('manage_pricing'))) with check ((select public.has_permission('manage_pricing')));

-- Saved products: any signed-in account, own rows.
create policy "manage own saved products" on public.saved_products for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

-- Projects: approved trade, own rows.
create policy "trade manage own projects" on public.projects for all to authenticated
  using (profile_id = (select auth.uid()) and (select public.is_approved_trade()))
  with check (profile_id = (select auth.uid()) and (select public.is_approved_trade()));
create policy "trade manage own project items" on public.project_items for all to authenticated
  using ((select public.is_approved_trade()) and exists (select 1 from public.projects p where p.id = project_id and p.profile_id = (select auth.uid())))
  with check ((select public.is_approved_trade()) and exists (select 1 from public.projects p where p.id = project_id and p.profile_id = (select auth.uid())));

-- A quote can only point at the trader's own project.
drop policy "trade manage own quotes" on public.quotes;
create policy "trade manage own quotes" on public.quotes for all to authenticated
  using (profile_id = (select auth.uid()) and (select public.is_approved_trade()))
  with check (
    profile_id = (select auth.uid()) and (select public.is_approved_trade())
    and (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.profile_id = (select auth.uid())))
  );

-- Audit log: read by those allowed; nobody writes except the audit trigger.
create policy "auditors read audit log" on public.audit_log for select to authenticated
  using ((select public.has_permission('view_audit')));

-- Stockist accounts read their own listing.
create policy "stockist read own listing" on public.stockists for select to authenticated
  using (profile_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Existing policies: from "any administrator" to the specific permission.
-- ---------------------------------------------------------------------------
drop policy "admin manage tiers" on public.price_tiers;
create policy "pricing managers manage tiers" on public.price_tiers for all to authenticated
  using ((select public.has_permission('manage_pricing'))) with check ((select public.has_permission('manage_pricing')));
create policy "account managers read tiers" on public.price_tiers for select to authenticated
  using ((select public.has_permission('manage_accounts')));

drop policy "admin read profiles" on public.profiles;
drop policy "admin manage profiles" on public.profiles;
drop policy "update own profile" on public.profiles;
create policy "account managers manage profiles" on public.profiles for all to authenticated
  using ((select public.has_permission('manage_accounts'))) with check ((select public.has_permission('manage_accounts')));
create policy "update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
grant update (role, business_id, status_reason) on public.profiles to authenticated;

drop policy "admin manage finishes" on public.finishes;
create policy "product managers manage finishes" on public.finishes for all to authenticated
  using ((select public.has_permission('manage_products'))) with check ((select public.has_permission('manage_products')));
drop policy "admin manage finish images" on public.finish_images;
create policy "product managers manage finish images" on public.finish_images for all to authenticated
  using ((select public.has_permission('manage_products'))) with check ((select public.has_permission('manage_products')));
drop policy "admin manage inspiration" on public.inspiration;
create policy "product managers manage inspiration" on public.inspiration for all to authenticated
  using ((select public.has_permission('manage_products'))) with check ((select public.has_permission('manage_products')));

drop policy "admin manage prices" on public.prices;
create policy "pricing managers read prices" on public.prices for select to authenticated
  using ((select public.has_permission('manage_pricing')));
drop policy "admin manage overrides" on public.price_overrides;
create policy "pricing managers read overrides" on public.price_overrides for select to authenticated
  using ((select public.has_permission('manage_pricing')) or (select public.has_permission('manage_accounts')));

drop policy "admin manage documents" on public.documents;
create policy "document managers manage documents" on public.documents for all to authenticated
  using ((select public.has_permission('manage_documents'))) with check ((select public.has_permission('manage_documents')));

drop policy "admin manage sample requests" on public.sample_requests;
create policy "sample managers manage sample requests" on public.sample_requests for all to authenticated
  using ((select public.has_permission('manage_samples'))) with check ((select public.has_permission('manage_samples')));

drop policy "admin manage stockists" on public.stockists;
create policy "stockist managers manage stockists" on public.stockists for all to authenticated
  using ((select public.has_permission('manage_stockists'))) with check ((select public.has_permission('manage_stockists')));
drop policy "admin manage retailers" on public.online_retailers;
create policy "stockist managers manage retailers" on public.online_retailers for all to authenticated
  using ((select public.has_permission('manage_stockists'))) with check ((select public.has_permission('manage_stockists')));

drop policy "admin read shortlists" on public.shortlists;
create policy "account managers read shortlists" on public.shortlists for select to authenticated
  using ((select public.has_permission('manage_accounts')));

drop policy "admin write finish images" on storage.objects;
create policy "product managers write finish images" on storage.objects for all to authenticated
  using (bucket_id = 'finish-images' and (select public.has_permission('manage_products')))
  with check (bucket_id = 'finish-images' and (select public.has_permission('manage_products')));
drop policy "admin manage documents files" on storage.objects;
create policy "document managers manage documents files" on storage.objects for all to authenticated
  using (bucket_id = 'documents' and (select public.has_permission('manage_documents')))
  with check (bucket_id = 'documents' and (select public.has_permission('manage_documents')));

-- Owner figures: for those who may view reports.
create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_permission('view_reports') then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'accounts', (
      select jsonb_build_object(
        'pending', count(*) filter (where status = 'pending'),
        'approved', count(*) filter (where status = 'approved'),
        'rejected', count(*) filter (where status = 'rejected'),
        'suspended', count(*) filter (where status = 'suspended'),
        'new_30d', count(*) filter (where created_at > now() - interval '30 days')
      ) from public.profiles where role in ('trade', 'stockist')
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

-- ===========================================================================
-- Backfill: bring existing data into the new structure. Idempotent, so the
-- migration runs it for data already in the database and the demo seed runs
-- it again after loading. Only adds what is missing; never changes or
-- removes anything.
-- ===========================================================================
create function public.backfill_foundation() returns void
language plpgsql security definer set search_path = '' as $$
declare
  p record;
  b uuid;
  f uuid;
  before_count integer;
  after_count integer;
begin
  -- Legacy price rows are the source here: don't let the sync rewrite them mid-copy.
  perform set_config('duratek.backfilling', 'on', true);
  select (select count(*) from public.prices) + (select count(*) from public.price_overrides) into before_count;

  -- A business and an application for every trade account without one.
  for p in select * from public.profiles where not is_admin and business_id is null loop
    insert into public.businesses (name, business_type)
    values (coalesce(nullif(trim(p.company_name), ''), nullif(trim(p.contact_name), ''), 'Unnamed business'), p.trade_type)
    returning id into b;
    update public.profiles set business_id = b where id = p.id;
  end loop;
  insert into public.trade_applications (profile_id, business_id, submitted_at, reviewed_at)
  select pr.id, pr.business_id, pr.created_at, case when pr.status <> 'pending' then pr.updated_at end
  from public.profiles pr
  where not pr.is_admin and not exists (select 1 from public.trade_applications a where a.profile_id = pr.id);

  -- Collections from the plank formats in use.
  insert into public.collections (name, slug, sort_order, published, is_demo)
  select x.name, x.slug, x.sort_order, true, bool_or(x.is_demo)
  from (
    select case when f.specs ->> 'format' = 'Straight plank' then 'Standard plank' else 'Extra-long plank' end as name,
           case when f.specs ->> 'format' = 'Straight plank' then 'standard-plank' else 'extra-long-plank' end as slug,
           case when f.specs ->> 'format' = 'Straight plank' then 1 else 2 end as sort_order,
           f.is_demo
    from public.finishes f where f.specs ? 'format'
  ) x
  group by x.name, x.slug, x.sort_order
  on conflict do nothing;
  update public.finishes f set collection_id = c.id
  from public.collections c
  where f.collection_id is null and f.specs ? 'format'
    and c.slug = case f.specs ->> 'format' when 'Straight plank' then 'standard-plank' else 'extra-long-plank' end;

  -- One default variant per finish, sold by the pack, from its specification.
  insert into public.product_variants (finish_id, sku, name, unit_of_sale, pack_coverage_m2, length_mm, width_mm, thickness_mm, is_default, is_demo)
  select f.id, 'DT-' || upper(left(f.slug, 36)), coalesce(f.specs ->> 'format', 'Standard'), 'pack',
         (f.specs ->> 'pack_coverage_m2')::numeric,
         (f.specs ->> 'plank_length_mm')::numeric::integer,
         (f.specs ->> 'plank_width_mm')::numeric::integer,
         (f.specs ->> 'thickness_mm')::numeric,
         true, f.is_demo
  from public.finishes f
  where f.specs ? 'pack_coverage_m2'
    and not exists (select 1 from public.product_variants v where v.finish_id = f.id);

  -- A trade list for every tier, and an account list for every account with negotiated prices.
  insert into public.price_lists (code, name, kind, tier_id, prices_include_vat, is_demo)
  select 'tier-' || left(replace(t.id::text, '-', ''), 12), t.name, 'trade', t.id, false, t.is_demo
  from public.price_tiers t where not exists (select 1 from public.price_lists l where l.tier_id = t.id);
  insert into public.price_lists (code, name, kind, profile_id, prices_include_vat)
  select distinct 'account-' || left(replace(o.profile_id::text, '-', ''), 12), 'Account prices', 'account'::public.price_list_kind, o.profile_id, false
  from public.price_overrides o where not exists (select 1 from public.price_lists l where l.profile_id = o.profile_id);

  -- Prices, per m², on each finish's default variant, where not already listed.
  insert into public.price_list_items (price_list_id, variant_id, amount_pence, price_unit)
  select l.id, v.id, f.rrp_per_m2_pence, 'm2'
  from public.finishes f
  join public.product_variants v on v.finish_id = f.id and v.is_default
  cross join public.price_lists l
  where l.kind = 'rrp' and f.rrp_per_m2_pence > 0
    and not exists (select 1 from public.price_list_items i where i.price_list_id = l.id and i.variant_id = v.id);
  insert into public.price_list_items (price_list_id, variant_id, amount_pence, price_unit)
  select l.id, v.id, pr.price_per_m2_pence, 'm2'
  from public.prices pr
  join public.price_lists l on l.tier_id = pr.tier_id
  join public.product_variants v on v.finish_id = pr.finish_id and v.is_default
  where pr.price_per_m2_pence > 0
    and not exists (select 1 from public.price_list_items i where i.price_list_id = l.id and i.variant_id = v.id);
  insert into public.price_list_items (price_list_id, variant_id, amount_pence, price_unit)
  select l.id, v.id, o.price_per_m2_pence, 'm2'
  from public.price_overrides o
  join public.price_lists l on l.profile_id = o.profile_id
  join public.product_variants v on v.finish_id = o.finish_id and v.is_default
  where o.price_per_m2_pence > 0
    and not exists (select 1 from public.price_list_items i where i.price_list_id = l.id and i.variant_id = v.id);

  -- Rebuild the legacy copies from the lists, and prove nothing was lost.
  perform set_config('duratek.backfilling', 'off', true);
  for f in select distinct v.finish_id from public.product_variants v loop
    perform public.refresh_legacy_prices(f);
  end loop;
  select (select count(*) from public.prices) + (select count(*) from public.price_overrides) into after_count;
  if after_count < before_count then
    raise exception 'backfill would lose % legacy price rows; nothing was changed', before_count - after_count;
  end if;
end;
$$;
revoke execute on function public.backfill_foundation() from public, anon, authenticated;

select public.backfill_foundation();
