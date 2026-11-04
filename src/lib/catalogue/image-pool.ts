import type { CatalogueImage, Finish, ImageKind } from "./types";

export interface PooledImage {
  image: CatalogueImage;
  finish: Finish;
}

/**
 * Round-robin pool of images of one kind across finishes (first image of each
 * finish, then the second of each, ...). Lets editorial sections pull varied
 * photography from the catalogue without hard-coding particular photos.
 */
export function imagePool(finishes: Finish[], kind: ImageKind): PooledImage[] {
  const perFinish = finishes.map((f) => f.images.filter((i) => i.kind === kind).map((image) => ({ image, finish: f })));
  const depth = Math.max(0, ...perFinish.map((l) => l.length));
  const out: PooledImage[] = [];
  for (let d = 0; d < depth; d++) for (const list of perFinish) if (list[d]) out.push(list[d]);
  return out;
}

/** Take images from a pool in order, never repeating one. */
export function takeFrom(pool: PooledImage[]) {
  let i = 0;
  return (): PooledImage | undefined => pool[i++];
}
