/**
 * Margin, markup and VAT on integer pence. Rates are basis points
 * (1% = 100 bp) so they stay integers too. Rounding is half up, once.
 *
 *   markup = profit / cost    (what a trader adds on)
 *   margin = profit / sell    (what a trader keeps)
 */

const BP = 10_000;

const round = (n: number) => Math.round(n + Number.EPSILON);

/** Sell price from cost plus a markup. */
export function sellFromMarkup(costPence: number, markupBp: number): number {
  return round((costPence * (BP + markupBp)) / BP);
}

/** Sell price that keeps a target margin. Null when the margin is 100% or more (impossible). */
export function sellFromMargin(costPence: number, marginBp: number): number | null {
  if (marginBp >= BP) return null;
  return round((costPence * BP) / (BP - marginBp));
}

/** Markup in basis points; null when there is no cost to mark up. */
export function markupBp(costPence: number, sellPence: number): number | null {
  if (costPence <= 0) return null;
  return round(((sellPence - costPence) * BP) / costPence);
}

/** Margin in basis points; null when nothing is sold. Negative for a loss. */
export function marginBp(costPence: number, sellPence: number): number | null {
  if (sellPence <= 0) return null;
  return round(((sellPence - costPence) * BP) / sellPence);
}

/** VAT on a net amount. */
export function vatOn(netPence: number, rateBp: number): number {
  return round((netPence * rateBp) / BP);
}

/** "30%", "32.5%", "-4%". */
export function formatBp(bp: number | null): string {
  if (bp === null) return "—";
  return `${(bp / 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}

/**
 * A percentage typed in a form ("30", "32.5", "30%") to basis points.
 * Null for blank; undefined for something that isn't a percentage in range.
 */
export function percentToBp(raw: string, { min = 0, max = 1000 } = {}): number | null | undefined {
  const t = raw.trim().replace(/%$/, "").trim();
  if (t === "") return null;
  if (!/^-?\d{1,4}(\.\d{1,2})?$/.test(t)) return undefined;
  const n = Number(t);
  if (n < min || n > max) return undefined;
  return round(n * 100);
}

export const UK_VAT_BP = 2000;
