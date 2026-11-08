import { perPackPence, planPacks, sellFromMarkup, type PackPlan } from "@/lib/pricing";

export interface FlooringLineInput {
  finishName: string;
  packCoverageM2: number | undefined;
  /** The trader's own price per m² (account price, else tier). Undefined if none set. */
  costPerM2Pence: number | undefined;
  /** Sell price per m² typed by the trader, if any. */
  sellPerM2Pence: number | null;
  defaultMarkupBp: number;
  areaM2: number;
  wastagePct: number;
}

export type FlooringLineResult =
  | {
      ok: true;
      plan: PackPlan;
      row: {
        kind: "flooring";
        description: string;
        quantity: number;
        unit: "pack";
        unit_cost_pence: number;
        unit_sell_pence: number;
        area_m2: number;
        wastage_pct: number;
      };
    }
  | { ok: false; error: "no-coverage" | "no-price" | "bad-area" };

/**
 * A flooring line priced per pack. Packs come from the measured area plus
 * wastage, rounded up. Cost is the trader's own price; sell is what they
 * typed, else their default markup on cost.
 */
export function buildFlooringLine(i: FlooringLineInput): FlooringLineResult {
  if (!i.packCoverageM2) return { ok: false, error: "no-coverage" };
  const plan = planPacks(i.areaM2, i.wastagePct, i.packCoverageM2);
  if (!plan) return { ok: false, error: "bad-area" };
  const sellPerM2 = i.sellPerM2Pence ?? (i.costPerM2Pence !== undefined ? sellFromMarkup(i.costPerM2Pence, i.defaultMarkupBp) : undefined);
  if (sellPerM2 === undefined) return { ok: false, error: "no-price" };
  return {
    ok: true,
    plan,
    row: {
      kind: "flooring",
      description: `${i.finishName}, ${plan.packs} ${plan.packs === 1 ? "pack" : "packs"} of ${i.packCoverageM2} m² (${plan.suppliedM2} m²)`,
      quantity: plan.packs,
      unit: "pack",
      unit_cost_pence: perPackPence(i.packCoverageM2, i.costPerM2Pence ?? 0),
      unit_sell_pence: perPackPence(i.packCoverageM2, sellPerM2),
      area_m2: plan.areaM2,
      wastage_pct: plan.wastagePct,
    },
  };
}
