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
}

export interface RangeFilters {
  style: string | null;
  format: string | null;
  colour: string | null;
  q: string;
}

export const NO_FILTERS: RangeFilters = { style: null, format: null, colour: null, q: "" };

export function readFilters(params: { get(name: string): string | null }): RangeFilters {
  return {
    style: params.get("style") || null,
    format: params.get("format") || null,
    colour: params.get("colour") || null,
    q: (params.get("q") ?? "").trim(),
  };
}

/** Search string for a set of filters, in a stable order; empty when none apply. */
export function filtersToQuery(filters: RangeFilters): string {
  const sp = new URLSearchParams();
  if (filters.style) sp.set("style", filters.style);
  if (filters.format) sp.set("format", filters.format);
  if (filters.colour) sp.set("colour", filters.colour);
  if (filters.q) sp.set("q", filters.q);
  return sp.toString();
}

export function isFiltered(filters: RangeFilters): boolean {
  return Boolean(filters.style || filters.format || filters.colour || filters.q);
}

export function matches(f: FilterableFinish, filters: RangeFilters): boolean {
  if (filters.style && f.style !== filters.style) return false;
  if (filters.format && f.format !== filters.format) return false;
  if (filters.colour && f.colourFamily !== filters.colour) return false;
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
