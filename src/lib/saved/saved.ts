import { parseSelection, type SampleItem } from "@/lib/samples/selection";

/** Saved finishes: a homeowner's own list, kept on their device. */
export type SavedItem = SampleItem;

/** More than the whole range today; a bound so stored data can't grow without limit. */
export const SAVED_LIMIT = 24;

/** The most finishes compared side by side. */
export const COMPARE_LIMIT = 3;

export function parseSaved(raw: unknown): SavedItem[] {
  return parseSelection(raw, SAVED_LIMIT);
}

/** Adds or removes a finish; newest first, bounded. */
export function toggleSaved(current: SavedItem[], item: SavedItem): SavedItem[] {
  if (current.some((s) => s.id === item.id)) return current.filter((s) => s.id !== item.id);
  return [item, ...current].slice(0, SAVED_LIMIT);
}

/** /compare?f=a,b,c */
export function compareHref(slugs: string[]): string {
  return `/compare?f=${slugs.slice(0, COMPARE_LIMIT).map(encodeURIComponent).join(",")}`;
}

/** Slugs from ?f=, de-duplicated, at most COMPARE_LIMIT, only known slugs. */
export function readCompare(param: string | string[] | undefined, known: ReadonlySet<string>): string[] {
  const raw = Array.isArray(param) ? param.join(",") : (param ?? "");
  const out: string[] = [];
  for (const s of raw.split(",").map((x) => x.trim().toLowerCase())) {
    if (s && known.has(s) && !out.includes(s)) out.push(s);
    if (out.length >= COMPARE_LIMIT) break;
  }
  return out;
}
