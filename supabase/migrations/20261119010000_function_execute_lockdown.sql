-- Security hardening: who may call which SECURITY DEFINER function through the API.
-- Revokes only. No data, tables or function bodies change. Safe to re-run.
--
-- Background: Supabase's security advisor listed 13 SECURITY DEFINER functions the
-- public (anon) role can call and 30 the signed-in (authenticated) role can call.
-- Every call in the app was checked (src/**: all .rpc() calls run on the server
-- through publicSupabase() = anon, userSupabase() = the signed-in user, or
-- adminSupabase() = service_role).

-- 1. Trigger functions. They run automatically when rows change and can never be
--    called usefully through the API. PostgreSQL checks EXECUTE on a trigger function
--    only when the trigger is created, not each time it fires, so the triggers keep
--    working after this revoke.
revoke execute on function
  public.audit_row(),
  public.audit_row_min(),
  public.create_tier_price_list(),
  public.handle_new_user(),
  public.on_price_item_change(),
  public.on_price_list_change(),
  public.record_application_review(),
  public.sync_variant_specs()
from public, anon, authenticated;

-- 2. price_for(): the app only calls it for a signed-in trade account
--    (src/lib/trade/prices.ts getPriceForQuantity via userSupabase(), used by the
--    trade quote/project actions). Signed-out visitors get list prices from
--    catalogue_prices() instead, so anon does not need it.
revoke execute on function public.price_for(uuid, numeric, timestamptz) from public, anon;

-- 3. price_for_account(): not called anywhere in the app. It already refuses anyone
--    without manage_pricing / manage_accounts, but nobody needs it through the API.
--    The database owner (postgres) and the service role keep access.
revoke execute on function public.price_for_account(uuid, uuid, numeric, timestamptz) from public, anon, authenticated;

-- Deliberately unchanged (needed by the app, and safe):
--   anon + authenticated: catalogue_prices() (public catalogue prices),
--     get_shared_quote(text), get_shared_shortlist(text), respond_to_quote(text, text)
--     (share links; each requires a long unguessable token).
--   authenticated only, each checks permission inside the function before doing anything:
--     admin_analytics, admin_dashboard_stats, admin_overview (view_reports),
--     price_history (manage_pricing), set_sample_availability (manage_samples),
--     export_person_data, erase_person_data, purge_expired_personal_data
--       (privacy_allowed(): manage_settings or service_role),
--     delete_trade_account (privacy_allowed() or the account's own user; never admins).
--   authenticated helpers used by row-level security and the session:
--     has_permission, is_admin, is_super_admin, is_approved_trade, current_tier_id,
--     privacy_allowed, my_permissions.
