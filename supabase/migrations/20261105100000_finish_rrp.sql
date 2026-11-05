-- Recommended retail price (RRP), per square metre, in pence. Public: shown to
-- everyone on the finish page. Set by the business in admin; null until set,
-- and the site shows no price for a finish without one. Trade prices stay in
-- public.prices / public.price_overrides (private, RLS).
alter table public.finishes
  add column rrp_per_m2_pence integer check (rrp_per_m2_pence is null or rrp_per_m2_pence >= 0);

comment on column public.finishes.rrp_per_m2_pence is
  'Public RRP per m2 in pence, set by the business. Not a trade price.';
