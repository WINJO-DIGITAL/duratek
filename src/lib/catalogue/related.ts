import type { Finish } from "./types";

/**
 * Finishes to suggest alongside one: the same colour family first, then the
 * rest, each ordered by how close they are in measured tone.
 */
export function relatedFinishes(all: Finish[], finish: Finish, n = 4): Finish[] {
  const distance = (f: Finish) =>
    finish.tone !== undefined && f.tone !== undefined ? Math.abs(f.tone - finish.tone) : Number.POSITIVE_INFINITY;
  return all
    .filter((f) => f.id !== finish.id)
    .map((f, i) => ({ f, i, same: f.colourFamily === finish.colourFamily ? 0 : 1, d: distance(f) }))
    .sort((a, b) => a.same - b.same || a.d - b.d || a.i - b.i)
    .slice(0, n)
    .map((x) => x.f);
}
