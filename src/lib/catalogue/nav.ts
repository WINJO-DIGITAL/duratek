import "server-only";
import { colourFamilyLabel } from "@/lib/config";
import { FORMAT_LABELS, plankFormat } from "./format";
import { byTone, getFinishes, grainImage, imagesOfKind } from "./index";
import { distinct } from "./filter";
import type { CatalogueImage } from "./types";

export interface NavFinish {
  id: string;
  slug: string;
  name: string;
  image?: CatalogueImage;
}

/** Every finish, small enough to ship to the client for the tray, saved list and compare picker. */
export interface CatalogueEntry {
  id: string;
  slug: string;
  name: string;
  /** "Natural oak · Standard plank" */
  detail: string;
  swatch?: CatalogueImage;
}

export interface NavData {
  finishCount: number;
  /** All finishes, light to dark. */
  catalogue: CatalogueEntry[];
  featured: NavFinish[];
  colourFamilies: string[];
  styles: string[];
}

/** Small, cached slice of the catalogue for the header menus. */
export async function getNavData(featuredCount = 4): Promise<NavData> {
  const finishes = await getFinishes();
  return {
    finishCount: finishes.length,
    catalogue: byTone(finishes).map((f) => {
      const format = plankFormat(f.specs);
      return {
        id: f.id,
        slug: f.slug,
        name: f.name,
        detail: [colourFamilyLabel(f.colourFamily), format && FORMAT_LABELS[format]].filter(Boolean).join(" · "),
        swatch: grainImage(f),
      };
    }),
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
