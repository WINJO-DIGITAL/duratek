import "server-only";
import { userSupabase } from "@/lib/supabase/server";
import type { Account } from "@/lib/auth/session";

export interface TradePrice {
  pence: number;
  /** True when set for this account specifically, not from its tier. */
  isAccountPrice: boolean;
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
 * Trade prices for an approved account, read as that user so Row Level
 * Security applies: own tier and own overrides only. The caller must already
 * have checked canSeeTradePrices(); returns nothing for anyone else.
 */
export async function getTradePrices(account: Account): Promise<Map<string, TradePrice>> {
  if (account.status !== "approved") return new Map();
  const db = await userSupabase();
  const [tier, overrides] = await Promise.all([
    account.tierId
      ? db.from("prices").select("finish_id, price_per_m2_pence").eq("tier_id", account.tierId)
      : Promise.resolve({ data: [] as { finish_id: string; price_per_m2_pence: number }[] }),
    db.from("price_overrides").select("finish_id, price_per_m2_pence").eq("profile_id", account.userId),
  ]);
  return effectivePrices(tier.data ?? [], overrides.data ?? []);
}
