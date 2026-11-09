import { marginBp, vatOn } from "./margin";

export type QuoteUnit = "pack" | "m2" | "item" | "hour" | "metre";
export type QuoteLineKind = "flooring" | "underlay" | "trim" | "adhesive" | "accessory" | "labour" | "delivery" | "expense" | "other";

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
  underlay: "Underlay",
  trim: "Trims",
  adhesive: "Adhesives",
  accessory: "Accessories",
  labour: "Labour",
  delivery: "Delivery",
  expense: "Other expenses",
  other: "Other",
};

/** How a line counts in a job costing. */
export type CostGroup = "materials" | "labour" | "additional";
export const KIND_GROUP: Record<QuoteLineKind, CostGroup> = {
  flooring: "materials",
  underlay: "materials",
  trim: "materials",
  adhesive: "materials",
  accessory: "materials",
  labour: "labour",
  delivery: "additional",
  expense: "additional",
  other: "additional",
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

export interface JobLine extends CostedLine {
  kind: QuoteLineKind;
  unitCostPence: number;
}

export interface JobTotals {
  materialCostPence: number;
  labourCostPence: number;
  /** Delivery, expenses and anything else. */
  additionalCostPence: number;
  /** Internal allowance for the unexpected: a share of the costs above. Never shown to the customer. */
  contingencyPence: number;
  /** Everything the job costs the trader, before VAT, including contingency. */
  totalJobCostPence: number;
  /** What the customer pays before VAT. */
  sellPence: number;
  vatPence: number;
  /** What the customer pays, with VAT. */
  totalPence: number;
  /** Selling price before VAT, less total job cost. Gross, not net: overheads and tax are not deducted. */
  grossProfitPence: number;
  /** Gross profit as a share of the selling price (basis points). */
  grossMarginBp: number | null;
  /** Gross profit as a share of the job cost (basis points). */
  markupBp: number | null;
}

/** A full job costing from quote lines. Rounding: each line once, contingency once, VAT once. */
export function jobTotals(lines: JobLine[], vatRateBp: number, contingencyBp = 0): JobTotals {
  const cost = (g: CostGroup) => lines.filter((l) => KIND_GROUP[l.kind] === g).reduce((s, l) => s + lineCost(l), 0);
  const materials = cost("materials");
  const labour = cost("labour");
  const additional = cost("additional");
  const contingency = Math.round(((materials + labour + additional) * contingencyBp) / 10000 + Number.EPSILON);
  const totalCost = materials + labour + additional + contingency;
  const c = customerTotals(lines, vatRateBp);
  const profit = c.subtotalPence - totalCost;
  return {
    materialCostPence: materials,
    labourCostPence: labour,
    additionalCostPence: additional,
    contingencyPence: contingency,
    totalJobCostPence: totalCost,
    sellPence: c.subtotalPence,
    vatPence: c.vatPence,
    totalPence: c.totalPence,
    grossProfitPence: profit,
    grossMarginBp: marginBp(totalCost, c.subtotalPence),
    markupBp: totalCost > 0 ? Math.round((profit * 10000) / totalCost + Number.EPSILON) : null,
  };
}

/** Per-unit profit on a product: buying and selling price, both before VAT. */
export function unitProfit(buyNetPence: number, sellNetPence: number) {
  const grossProfitPence = sellNetPence - buyNetPence;
  return {
    grossProfitPence,
    grossMarginBp: sellNetPence > 0 ? Math.round((grossProfitPence * 10000) / sellNetPence + Number.EPSILON) : null,
    markupBp: buyNetPence > 0 ? Math.round((grossProfitPence * 10000) / buyNetPence + Number.EPSILON) : null,
  };
}
