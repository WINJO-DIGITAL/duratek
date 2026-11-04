import "server-only";
import { getFinishes, imagesOfKind } from "./index";
import { distinct } from "./filter";
import type { CatalogueImage } from "./types";

export interface NavFinish {
  id: string;
  slug: string;
  name: string;
  image?: CatalogueImage;
}

export interface NavData {
  finishCount: number;
  featured: NavFinish[];
  colourFamilies: string[];
  styles: string[];
}

/** Small, cached slice of the catalogue for the header menus. */
export async function getNavData(featuredCount = 4): Promise<NavData> {
  const finishes = await getFinishes();
  return {
    finishCount: finishes.length,
    featured: finishes.slice(0, featuredCount).map((f) => ({
      id: f.id,
      slug: f.slug,
      name: f.name,
      image: imagesOfKind(f, "swatch")[0] ?? imagesOfKind(f, "closeup")[0],
    })),
    colourFamilies: distinct(finishes.map((f) => f.colourFamily)),
    styles: distinct(finishes.map((f) => f.style)),
  };
}
