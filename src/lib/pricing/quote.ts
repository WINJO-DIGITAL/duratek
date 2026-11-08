import { marginBp, vatOn } from "./margin";

export type QuoteUnit = "pack" | "m2" | "item" | "hour" | "metre";
export type QuoteLineKind = "flooring" | "accessory" | "labour" | "other";

export interface CostedLine {
  quantity: number;
  unitSellPence: number;
  /** Absent in the customer copy. */
  unitCostPence?: number;
}

export const UNIT_LABELS: Record<QuoteUnit, { one: string; many: string }> = {
  pack: { one: "pack", many: "packs" },
  m2: { one: "m²", many: "m²" },
  item: { one: "item", many: "items" },
  hour: { one: "hour", many: "hours" },
  metre: { one: "metre", many: "metres" },
};

export const KIND_LABELS: Record<QuoteLineKind, string> = {
  flooring: "Flooring",
  accessory: "Accessories",
  labour: "Labour",
  other: "Other",
};

export function formatQuantity(quantity: number, unit: QuoteUnit): string {
  const n = Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2).replace(/0$/, "");
  const label = UNIT_LABELS[unit];
  return unit === "m2" ? `${n} m²` : `${n} ${quantity === 1 ? label.one : label.many}`;
}

const lineAmount = (quantity: number, unitPence: number) => Math.round(quantity * unitPence + Number.EPSILON);

export function lineSell(line: CostedLine): number {
  return lineAmount(line.quantity, line.unitSellPence);
}

export function lineCost(line: CostedLine): number {
  return lineAmount(line.quantity, line.unitCostPence ?? 0);
}

export interface CustomerTotals {
  subtotalPence: number;
  vatPence: number;
  totalPence: number;
}

export interface TraderTotals extends CustomerTotals {
  costPence: number;
  profitPence: number;
  marginBp: number | null;
}

/** What the customer sees: sell prices, VAT and total. Works on the customer copy (no costs). */
export function customerTotals(lines: CostedLine[], vatRateBp: number): CustomerTotals {
  const subtotal = lines.reduce((s, l) => s + lineSell(l), 0);
  const vat = vatOn(subtotal, vatRateBp);
  return { subtotalPence: subtotal, vatPence: vat, totalPence: subtotal + vat };
}

/** What the trader sees: the customer totals plus their cost, profit and margin (all before VAT). */
export function traderTotals(lines: CostedLine[], vatRateBp: number): TraderTotals {
  const c = customerTotals(lines, vatRateBp);
  const cost = lines.reduce((s, l) => s + lineCost(l), 0);
  return { ...c, costPence: cost, profitPence: c.subtotalPence - cost, marginBp: marginBp(cost, c.subtotalPence) };
}
