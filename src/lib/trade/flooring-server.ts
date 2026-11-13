import "server-only";
import type { Finish } from "@/lib/catalogue";
import { planPacks } from "@/lib/pricing";
import { userSupabase } from "@/lib/supabase/server";
import { buildFlooringLine, type FlooringLineResult } from "./flooring-line";
import { getPriceForQuantity } from "./prices";

/**
 * A priced flooring line for a measured area. The cost is the trader's own
 * price for that number of packs, from the resolver (account, tier, volume
 * breaks, promotions), and the variant is read fresh, never from a cache.
 */
export async function priceFlooring(input: {
  finish: Finish;
  areaM2: number;
  wastagePct: number;
  sellPerM2Pence: number | null;
  defaultMarkupBp: number;
}): Promise<FlooringLineResult> {
  const { finish } = input;
  const coverage = finish.specs.pack_coverage_m2;
  const plan = coverage ? planPacks(input.areaM2, input.wastagePct, coverage) : null;
  const db = await userSupabase();
  const { data: variant } = await db.from("product_variants").select("id").eq("finish_id", finish.id).eq("is_default", true).eq("active", true).maybeSingle();
  const price = plan && variant ? await getPriceForQuantity(variant.id, plan.packs) : null;
  return buildFlooringLine({
    finishName: finish.name,
    packCoverageM2: coverage,
    cost: price && (price.unit === "m2" || price.unit === "pack") ? { pence: price.netPence, unit: price.unit } : undefined,
    sellPerM2Pence: input.sellPerM2Pence,
    defaultMarkupBp: input.defaultMarkupBp,
    areaM2: input.areaM2,
    wastagePct: input.wastagePct,
  });
}
