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

/**
 * Reads the account prices form: fields named "override:<finish>", values in
 * pounds. Blank removes the account price (the tier price applies again).
 */
export function parseOverrideForm(entries: Iterable<[string, unknown]>): {
  set: { finishId: string; pence: number }[];
  clear: string[];
  invalid: string[];
} {
  const out = { set: [] as { finishId: string; pence: number }[], clear: [] as string[], invalid: [] as string[] };
  for (const [name, raw] of entries) {
    if (typeof raw !== "string") continue;
    const [kind, finishId, ...rest] = name.split(":");
    if (kind !== "override" || rest.length || !UUID.test(finishId ?? "")) continue;
    const pence = inputToPence(raw);
    if (pence === undefined) out.invalid.push(name);
    else if (pence === null) out.clear.push(finishId);
    else out.set.push({ finishId, pence });
  }
  return out;
}

/**
 * Reads the base price grid: fields named "base:<list>:<variant>", pounds per
 * m². Blank clears that list's base price (undated, from 1 m²). Anything that
 * isn't a price is reported, so nothing is saved half-way.
 */
export function parseBasePriceForm(entries: Iterable<[string, unknown]>) {
  const out = {
    set: [] as { listId: string; variantId: string; pence: number }[],
    clear: [] as { listId: string; variantId: string }[],
    invalid: [] as string[],
  };
  for (const [name, raw] of entries) {
    if (typeof raw !== "string") continue;
    const parts = name.split(":");
    if (parts[0] !== "base" || parts.length !== 3 || !UUID.test(parts[1]) || !UUID.test(parts[2])) continue;
    const pence = inputToPence(raw);
    if (pence === undefined || pence === 0) out.invalid.push(name);
    else if (pence === null) out.clear.push({ listId: parts[1], variantId: parts[2] });
    else out.set.push({ listId: parts[1], variantId: parts[2], pence });
  }
  return out;
}

export const PRICE_UNITS = [
  { value: "m2", label: "per m²" },
  { value: "pack", label: "per pack" },
  { value: "item", label: "per item" },
  { value: "linear_metre", label: "per metre" },
] as const;
export type PriceUnit = (typeof PRICE_UNITS)[number]["value"];

/** A UK date (YYYY-MM-DD from a date field) to the start of that day, London time; blank is null; bad is undefined. */
export function dateStart(raw: string): string | null | undefined {
  const t = raw.trim();
  if (t === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t) || Number.isNaN(Date.parse(`${t}T00:00:00Z`))) return undefined;
  // London is UTC+0 in winter and UTC+1 in summer: let Intl work it out.
  const probe = new Date(`${t}T12:00:00Z`);
  const offset = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", timeZoneName: "shortOffset" })
    .formatToParts(probe)
    .find((p) => p.type === "timeZoneName")?.value;
  const hours = offset && offset !== "GMT" ? Number(offset.replace("GMT", "")) : 0;
  return new Date(Date.parse(`${t}T00:00:00Z`) - hours * 3600_000).toISOString();
}
