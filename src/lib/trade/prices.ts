import "server-only";
import { userSupabase } from "@/lib/supabase/server";
import type { Account } from "@/lib/auth/session";
import { isMissingFunction } from "@/lib/catalogue/errors";

export interface TradePrice {
  /** Per m², before VAT. */
  pence: number;
  /** True when set for this account specifically, not from its tier. */
  isAccountPrice: boolean;
  isPromotion?: boolean;
}

/** Account price where there is one, else the tier price. Pure, so it can be tested. */
export function effectivePrices(
  tier: { finish_id: string; price_per_m2_pence: number }[],
  overrides: { finish_id: string; price_per_m2_pence: number }[],
): Map<string, TradePrice> {
  const out = new Map<string, TradePrice>();
  for (const t of tier) out.set(t.finish_id, { pence: t.price_per_m2_pence, isAccountPrice: false });
  for (const o of overrides) out.set(o.finish_id, { pence: o.price_per_m2_pence, isAccountPrice: true });
  return out;
}

/**
 * Trade prices for an approved account, from the price resolver run as that
 * user: account price, stockist or tier list, standard trade, and any trade
 * promotion below them. Quantity 1, per m², before VAT. The caller must
 * already have checked canSeeTradePrices(); anyone else gets nothing.
 */
export async function getTradePrices(account: Account): Promise<Map<string, TradePrice>> {
  if (account.status !== "approved") return new Map();
  const db = await userSupabase();
  const { data, error } = await db.rpc("catalogue_prices");
  if (error && isMissingFunction(error)) return legacyTradePrices(account);
  if (error) throw new Error(`Failed to load trade prices: ${error.message}`);
  const out = new Map<string, TradePrice>();
  for (const p of data ?? []) {
    if (p.source === "rrp" || p.price_unit !== "m2") continue; // no trade price: show none
    out.set(p.finish_id, { pence: p.net_pence, isAccountPrice: p.source === "account", isPromotion: p.is_promotion });
  }
  return out;
}

/**
 * The price for buying a quantity of one variant, for quotes. Decided on the
 * server from the signed-in account; volume breaks and promotions apply.
 */
export async function getPriceForQuantity(variantId: string, quantity: number) {
  const db = await userSupabase();
  const { data, error } = await db.rpc("price_for", { p_variant: variantId, p_quantity: quantity });
  if (error) throw new Error(`Failed to price: ${error.message}`);
  const p = data?.[0];
  if (!p || p.source === "rrp") return null;
  return { netPence: p.net_pence, unit: p.price_unit, vatRateBp: p.vat_rate_bp, source: p.source, isPromotion: p.is_promotion };
}

/** Deploy safety net: the pre-migration tables, read as the user (RLS: own tier, own overrides). */
async function legacyTradePrices(account: Account): Promise<Map<string, TradePrice>> {
  const db = await userSupabase();
  const [tier, overrides] = await Promise.all([
    account.tierId
      ? db.from("prices").select("finish_id, price_per_m2_pence").eq("tier_id", account.tierId)
      : Promise.resolve({ data: [] as { finish_id: string; price_per_m2_pence: number }[] }),
    db.from("price_overrides").select("finish_id, price_per_m2_pence").eq("profile_id", account.userId),
  ]);
  return effectivePrices(tier.data ?? [], overrides.data ?? []);
}
