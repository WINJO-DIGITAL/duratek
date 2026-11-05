import { inputToPence } from "@/lib/money";

export interface PriceEdits {
  /** RRP per finish: pence, or null to clear. */
  rrp: { finishId: string; pence: number | null }[];
  /** Trade price per finish and tier: pence, or null to remove. */
  tier: { finishId: string; tierId: string; pence: number | null }[];
  /** Field names that were not a valid price. */
  invalid: string[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reads the admin prices form: fields named "rrp:<finish>" and
 * "price:<finish>:<tier>", values in pounds. Blank clears a price. Anything
 * that isn't a price is reported, so nothing is saved half-way.
 */
export function parsePriceForm(entries: Iterable<[string, unknown]>): PriceEdits {
  const out: PriceEdits = { rrp: [], tier: [], invalid: [] };
  for (const [name, raw] of entries) {
    if (typeof raw !== "string") continue;
    const parts = name.split(":");
    const isRrp = parts[0] === "rrp" && parts.length === 2;
    const isTier = parts[0] === "price" && parts.length === 3;
    if (!isRrp && !isTier) continue;
    if (!parts.slice(1).every((p) => UUID.test(p))) continue;
    const pence = inputToPence(raw);
    if (pence === undefined) {
      out.invalid.push(name);
      continue;
    }
    if (isRrp) out.rrp.push({ finishId: parts[1], pence });
    else out.tier.push({ finishId: parts[1], tierId: parts[2], pence });
  }
  return out;
}
