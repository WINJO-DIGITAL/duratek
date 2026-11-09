/** Pure sample-selection rules, shared by the tray, buttons and tests. */
export interface SampleItem {
  id: string;
  slug: string;
  name: string;
  /** Free samples of this finish can't be sent just now. Display only: the server checks again. */
  unavailable?: boolean;
}

export type AddResult = "added" | "already" | "full";

export function parseSelection(raw: unknown, limit: number): SampleItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: SampleItem[] = [];
  for (const v of raw) {
    if (
      v &&
      typeof v === "object" &&
      typeof (v as SampleItem).id === "string" &&
      typeof (v as SampleItem).slug === "string" &&
      typeof (v as SampleItem).name === "string" &&
      !seen.has((v as SampleItem).id)
    ) {
      seen.add((v as SampleItem).id);
      out.push({ id: (v as SampleItem).id, slug: (v as SampleItem).slug, name: (v as SampleItem).name });
    }
    if (out.length >= limit) break;
  }
  return out;
}

export function addSample(
  current: SampleItem[],
  item: SampleItem,
  limit: number,
): { next: SampleItem[]; result: AddResult } {
  if (current.some((s) => s.id === item.id)) return { next: current, result: "already" };
  if (current.length >= limit) return { next: current, result: "full" };
  return { next: [...current, item], result: "added" };
}

export function removeSample(current: SampleItem[], id: string): SampleItem[] {
  return current.filter((s) => s.id !== id);
}
