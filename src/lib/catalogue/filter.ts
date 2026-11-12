/** Pure range filtering, shared by the range page and tests. */
export interface FilterableFinish {
  id: string;
  name: string;
  style: string;
  colourFamily: string;
  /** Plank format ("standard" | "extra-long"), if known. */
  format?: string;
  /** Extra words search should match, such as the colour family and format labels. */
  keywords?: string;
  /** Public RRP per m² in pence, when set. Used for the price bands. */
  rrpPence?: number;
  /** Light, mid or dark third of the range, from the measured swatch; absent when unmeasured. */
  toneGroup?: ToneGroupId;
}

/** Tone groups, light to dark. Each holds about a third of the range. */
export const TONE_GROUPS = [
  { id: "light", label: "Light" },
  { id: "mid", label: "Mid" },
  { id: "dark", label: "Dark" },
] as const;
export type ToneGroupId = (typeof TONE_GROUPS)[number]["id"];

/**
 * Splits measured finishes into light, mid and dark thirds by swatch tone, so
 * each group has a share of the range whatever its colours. Unmeasured finishes
 * are left out of the map.
 */
export function toneGroups(items: { id: string; tone?: number }[]): Map<string, ToneGroupId> {
  const measured = items.filter((i) => i.tone !== undefined).sort((a, b) => b.tone! - a.tone!);
  const n = measured.length;
  const groups = new Map<string, ToneGroupId>();
  measured.forEach((item, i) => {
    groups.set(item.id, i < Math.ceil(n / 3) ? "light" : i < Math.ceil((2 * n) / 3) ? "mid" : "dark");
  });
  return groups;
}

/** Price bands on the RRP per m², in pence, inclusive. Shown only where a finish falls in them. */
export const PRICE_BANDS = [
  { id: "under-30", label: "Under £30", min: 0, max: 2999 },
  { id: "30-to-40", label: "£30 to £40", min: 3000, max: 4000 },
  { id: "over-40", label: "Over £40", min: 4001, max: Number.POSITIVE_INFINITY },
] as const;
export type PriceBandId = (typeof PRICE_BANDS)[number]["id"];

export function priceBandOf(rrpPence: number | undefined): PriceBandId | undefined {
  if (rrpPence === undefined) return undefined;
  return PRICE_BANDS.find((b) => rrpPence >= b.min && rrpPence <= b.max)?.id;
}

export interface RangeFilters {
  style: string | null;
  format: string | null;
  colour: string | null;
  tone: ToneGroupId | null;
  price: PriceBandId | null;
  q: string;
}

export const NO_FILTERS: RangeFilters = { style: null, format: null, colour: null, tone: null, price: null, q: "" };

export function readFilters(params: { get(name: string): string | null }): RangeFilters {
  return {
    style: params.get("style") || null,
    format: params.get("format") || null,
    colour: params.get("colour") || null,
    tone: (TONE_GROUPS.find((t) => t.id === params.get("tone"))?.id as ToneGroupId | undefined) ?? null,
    price: (PRICE_BANDS.find((b) => b.id === params.get("price"))?.id as PriceBandId | undefined) ?? null,
    q: (params.get("q") ?? "").trim(),
  };
}

/** Search string for a set of filters, in a stable order; empty when none apply. */
export function filtersToQuery(filters: RangeFilters): string {
  const sp = new URLSearchParams();
  if (filters.style) sp.set("style", filters.style);
  if (filters.format) sp.set("format", filters.format);
  if (filters.colour) sp.set("colour", filters.colour);
  if (filters.tone) sp.set("tone", filters.tone);
  if (filters.price) sp.set("price", filters.price);
  if (filters.q) sp.set("q", filters.q);
  return sp.toString();
}

export function isFiltered(filters: RangeFilters): boolean {
  return Boolean(filters.style || filters.format || filters.colour || filters.tone || filters.price || filters.q);
}

export function matches(f: FilterableFinish, filters: RangeFilters): boolean {
  if (filters.style && f.style !== filters.style) return false;
  if (filters.format && f.format !== filters.format) return false;
  if (filters.colour && f.colourFamily !== filters.colour) return false;
  if (filters.tone && f.toneGroup !== filters.tone) return false;
  if (filters.price && priceBandOf(f.rrpPence) !== filters.price) return false;
  if (filters.q) {
    const words = filters.q.toLowerCase().replace(/-/g, " ").split(/\s+/).filter(Boolean);
    const hay = `${f.name} ${f.keywords ?? ""}`.toLowerCase().replace(/-/g, " ");
    if (!words.every((w) => hay.includes(w))) return false;
  }
  return true;
}

/** Distinct values in first-seen order. */
export function distinct<T>(values: T[]): T[] {
  return [...new Set(values)];
}
