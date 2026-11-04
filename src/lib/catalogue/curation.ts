import type { CatalogueImage } from "./types";

/**
 * Image curation until the commissioned shoot (approved direction, November
 * 2026). The demo photography is not editable in the production database
 * from here, so curation lives in code, keyed by file name. Move this to a
 * `published` flag on finish_images when owner admin exists.
 *
 * Retired: children's playrooms, computer-generated rooms, showers where the
 * floor is a sliver, and weak or cluttered shots.
 */
const RETIRED_FILES = new Set([
  "Keswick_Oak_Kids.png",
  "Keswick_Oak_Bathroom.png",
  "Keswick_Oak_2.jpg",
  "Fellside_Oak_XL_Luxury_Click_Vinyl_Flooring_Living_Area.jpg",
  "Honnister_Slate_Grey_kids.png",
  "Honnister_Slate_Grey.png",
  "29036_5-4.1920x1200.jpg",
  "29036-1_jpg.webp",
  "Ambleside_Oak_Luxury_Click_Vinyl_Flooring_5mm_close_up_bathroom_shower_room.png",
]);

/** Rooms where the floor is the subject come first; bathrooms and similar last. */
const SECONDARY_ROOM = /bathroom|shower|cloakroom|toilet|playroom/i;

function fileName(src: string): string {
  try {
    return decodeURIComponent(new URL(src).pathname.split("/").pop() ?? "");
  } catch {
    return src.split("?")[0].split("/").pop() ?? src;
  }
}

export function isRetired(image: CatalogueImage): boolean {
  return RETIRED_FILES.has(fileName(image.src));
}

/** True for room scenes kept only for product galleries, never editorial use. */
export function isSecondaryRoom(image: CatalogueImage): boolean {
  return image.kind === "room" && SECONDARY_ROOM.test(image.alt);
}

/** Drops retired images and moves secondary rooms after floor-led ones, keeping order otherwise. */
export function curateImages(images: CatalogueImage[]): CatalogueImage[] {
  const kept = images.filter((i) => !isRetired(i));
  return [...kept.filter((i) => !isSecondaryRoom(i)), ...kept.filter(isSecondaryRoom)];
}

/**
 * Editorial picks for the home page, by file name, in order of preference.
 * The floor must be the subject: camera low, boards running away from it.
 * Falls back to the first floor-led room scene if none is available.
 */
export const EDITORIAL = {
  hero: ["Hawkshead_Kitchen.png", "Cartmel_Oak_Lounge.png", "Keswick_Oak_Kitchen.png"],
  room: [
    "Windermere_Oak_XL_Luxury_Click_Vinyl_Flooring_7mm_hallway.png",
    "Coniston_Oak_Luxury_Click_Vinyl_Flooring_5mm_hallway.png",
    "Fellside_Oak_XL_Luxury_Click_Vinyl_Flooring_7mm_kitchen_2.png",
  ],
} as const;

/** The first preferred file present among the images, in preference order. */
export function pickByFileName<T extends { image: CatalogueImage }>(
  candidates: T[],
  preferences: readonly string[],
  exclude: ReadonlySet<string> = new Set(),
): T | undefined {
  const available = candidates.filter((c) => !exclude.has(c.image.src));
  for (const name of preferences) {
    const hit = available.find((c) => fileName(c.image.src) === name);
    if (hit) return hit;
  }
  return available[0];
}
