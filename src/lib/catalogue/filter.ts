/** Pure range filtering, shared by the range page and tests. */
export interface FilterableFinish {
  id: string;
  name: string;
  style: string;
  colourFamily: string;
}

export interface RangeFilters {
  style: string | null;
  colour: string | null;
  q: string;
}

export function readFilters(params: { get(name: string): string | null }): RangeFilters {
  return {
    style: params.get("style") || null,
    colour: params.get("colour") || null,
    q: (params.get("q") ?? "").trim(),
  };
}

export function matches(f: FilterableFinish, filters: RangeFilters): boolean {
  if (filters.style && f.style !== filters.style) return false;
  if (filters.colour && f.colourFamily !== filters.colour) return false;
  if (filters.q) {
    const words = filters.q.toLowerCase().split(/\s+/).filter(Boolean);
    const hay = f.name.toLowerCase();
    if (!words.every((w) => hay.includes(w))) return false;
  }
  return true;
}

/** Distinct values in first-seen order. */
export function distinct<T>(values: T[]): T[] {
  return [...new Set(values)];
}
