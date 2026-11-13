import { EDITORIAL, pickByFileName } from "./curation";
import type { Finish } from "./types";
import { imagePool, type PooledImage } from "./image-pool";

export type HeroPage = keyof typeof EDITORIAL.pages;

/** The photograph for a page's opening frame, from the curated list (room scenes or close-ups). */
export function pageHero(finishes: Finish[], page: HeroPage): PooledImage | undefined {
  const pool = [...imagePool(finishes, "room"), ...imagePool(finishes, "closeup")];
  return pickByFileName(pool, [EDITORIAL.pages[page]]);
}
