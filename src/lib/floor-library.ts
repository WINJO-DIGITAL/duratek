/** Pure rules for the floor library's scrub gesture, shared with tests. */

/**
 * The board under a pointer. Each board owns an equal slice of the strip,
 * whatever its current width, so the choice stays steady while the open
 * board widens under the finger.
 */
export function boardAt(x: number, left: number, width: number, count: number): number {
  if (count <= 0 || width <= 0) return 0;
  const i = Math.floor(((x - left) / width) * count);
  return Math.min(count - 1, Math.max(0, i));
}

/** Movement (px) before a press is read as a scrub or a scroll. */
export const INTENT_PX = 8;

/**
 * What a moving press is for: sideways movement scrubs across the boards,
 * up or down movement is the page scrolling. Undecided until it has moved.
 */
export function pressIntent(dx: number, dy: number): "scrub" | "scroll" | null {
  if (Math.abs(dx) < INTENT_PX && Math.abs(dy) < INTENT_PX) return null;
  return Math.abs(dx) > Math.abs(dy) ? "scrub" : "scroll";
}
