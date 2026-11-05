/** Pure rules for the finish explorer, shared by the component and tests. */

export type ExplorerView = "room" | "grain";

/** Next or previous position, wrapping round the ends. */
export function step(index: number, delta: number, length: number): number {
  if (length <= 0) return 0;
  return (((index + delta) % length) + length) % length;
}

/** Minimum horizontal travel (px) for a swipe; below it a press is a tap. */
export const SWIPE_PX = 50;
const TAP_PX = 10;

/**
 * What a press-and-release on the stage means: a horizontal swipe moves to
 * the next or previous finish, a still press switches the view, anything
 * else (a vertical scroll, a wobble) does nothing.
 */
export function gesture(dx: number, dy: number): "next" | "previous" | "tap" | null {
  if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) return dx < 0 ? "next" : "previous";
  if (Math.abs(dx) < TAP_PX && Math.abs(dy) < TAP_PX) return "tap";
  return null;
}

/**
 * After the filters change: stay on the same finish if it still matches,
 * otherwise go to the first match.
 */
export function keepPosition<T extends { slug: string }>(visible: T[], currentSlug: string | null): number {
  const i = visible.findIndex((v) => v.slug === currentSlug);
  return i >= 0 ? i : 0;
}
