/** Money is stored as integer pence; shown as pounds. "£33.33" */
export function formatPence(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

/** "33.33" for a form field; empty for no value. */
export function penceToInput(pence: number | null | undefined): string {
  return pence == null ? "" : (pence / 100).toFixed(2);
}

/**
 * Pounds typed in a form to whole pence. Accepts "33", "33.3", "£33.33" and
 * "1,234.50". Returns null for blank, undefined for something that isn't a price.
 */
export function inputToPence(raw: string): number | null | undefined {
  const t = raw.trim().replace(/^£/, "").replace(/,/g, "").trim();
  if (t === "") return null;
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(t)) return undefined;
  return Math.round(Number(t) * 100);
}
