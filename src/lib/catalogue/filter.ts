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
  /** Public RRP per m² in pence, when set. Used for the price filter. */
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

/** The price slider's domain, in pounds per m² (RRP). Typed values outside it are clamped to it. */
export const PRICE_DOMAIN = { min: 10, max: 50 } as const;

/** A price filter in pounds per m² (RRP): a finish is in range when its RRP falls between the two, inclusive. */
export interface PriceRange {
  min: number | null;
  max: number | null;
}

/** A pound amount from the URL or a form: a non-negative number, or null. */
export function parsePounds(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** How the range can be ordered. The catalogue arrives light to dark, which is the default. */
export const SORTS = [
  { id: "light", label: "Light to dark" },
  { id: "dark", label: "Dark to light" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "name", label: "Name: A to Z" },
] as const;
export type SortId = (typeof SORTS)[number]["id"];
export const DEFAULT_SORT: SortId = "light";

/**
 * Orders finishes. Items arrive light to dark. Price sorts keep that order
 * between equal prices, and finishes without an RRP go last.
 */
export function sortItems<T extends { name: string; rrpPence?: number }>(items: T[], sort: SortId): T[] {
  switch (sort) {
    case "dark":
      return [...items].reverse();
    case "name":
      return [...items].sort((a, b) => a.name.localeCompare(b.name));
    case "price-asc":
    case "price-desc": {
      const dir = sort === "price-asc" ? 1 : -1;
      return items
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
          const pa = a.item.rrpPence;
          const pb = b.item.rrpPence;
          if (pa === undefined && pb === undefined) return a.index - b.index;
          if (pa === undefined) return 1;
          if (pb === undefined) return -1;
          return (pa - pb) * dir || a.index - b.index;
        })
        .map((x) => x.item);
    }
    default:
      return items;
  }
}

export interface RangeFilters {
  style: string | null;
  format: string | null;
  colour: string | null;
  tone: ToneGroupId | null;
  priceMin: number | null;
  priceMax: number | null;
  q: string;
  sort: SortId;
}

export const NO_FILTERS: RangeFilters = {
  style: null,
  format: null,
  colour: null,
  tone: null,
  priceMin: null,
  priceMax: null,
  q: "",
  sort: DEFAULT_SORT,
};

export function readFilters(params: { get(name: string): string | null }): RangeFilters {
  return {
    style: params.get("style") || null,
    format: params.get("format") || null,
    colour: params.get("colour") || null,
    tone: (TONE_GROUPS.find((t) => t.id === params.get("tone"))?.id as ToneGroupId | undefined) ?? null,
    priceMin: parsePounds(params.get("from")),
    priceMax: parsePounds(params.get("to")),
    q: (params.get("q") ?? "").trim(),
    sort: (SORTS.find((s) => s.id === params.get("sort"))?.id as SortId | undefined) ?? DEFAULT_SORT,
  };
}

/** Search string for a set of filters, in a stable order; empty when none apply. */
export function filtersToQuery(filters: RangeFilters): string {
  const sp = new URLSearchParams();
  if (filters.style) sp.set("style", filters.style);
  if (filters.format) sp.set("format", filters.format);
  if (filters.colour) sp.set("colour", filters.colour);
  if (filters.tone) sp.set("tone", filters.tone);
  if (filters.priceMin !== null) sp.set("from", String(filters.priceMin));
  if (filters.priceMax !== null) sp.set("to", String(filters.priceMax));
  if (filters.q) sp.set("q", filters.q);
  if (filters.sort !== DEFAULT_SORT) sp.set("sort", filters.sort);
  return sp.toString();
}

export function isFiltered(filters: RangeFilters): boolean {
  return Boolean(
    filters.style || filters.format || filters.colour || filters.tone || filters.priceMin !== null || filters.priceMax !== null || filters.q,
  );
}

export function matches(f: FilterableFinish, filters: RangeFilters): boolean {
  if (filters.style && f.style !== filters.style) return false;
  if (filters.format && f.format !== filters.format) return false;
  if (filters.colour && f.colourFamily !== filters.colour) return false;
  if (filters.tone && f.toneGroup !== filters.tone) return false;
  if (filters.priceMin !== null || filters.priceMax !== null) {
    if (f.rrpPence === undefined) return false;
    const pounds = f.rrpPence / 100;
    if (filters.priceMin !== null && pounds < filters.priceMin) return false;
    if (filters.priceMax !== null && pounds > filters.priceMax) return false;
  }
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
