import { curateImages } from "./curation";
import type { CatalogueImage, Finish, FinishSpecs, ImageKind } from "./types";

/** Fallback size used when an image row has no stored dimensions. */
const DEFAULT_SIZE = { width: 1600, height: 1200 };

const STORAGE_BUCKET = "finish-images";

/**
 * Image rows hold either an absolute URL (demo photography on the Kwik Floors
 * CDN) or a path inside the public finish-images bucket.
 */
export function resolveImageUrl(urlOrPath: string, supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL): string {
  if (/^https?:\/\//.test(urlOrPath)) return urlOrPath;
  if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  const clean = urlOrPath.replace(/^\/+/, "");
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${clean}`;
}

export interface ImageRow {
  url: string;
  alt: string;
  kind: ImageKind;
  width: number | null;
  height: number | null;
  blur_data_url: string | null;
  sort_order: number;
}

export interface FinishRow {
  id: string;
  name: string;
  slug: string;
  style: "plank" | "herringbone";
  colour_family: string;
  description: string;
  specs: unknown;
  is_demo: boolean;
  rrp_per_m2_pence?: number | null;
  finish_images: ImageRow[] | null;
}

const KIND_ORDER: Record<ImageKind, number> = { room: 0, closeup: 1, swatch: 2 };

export function toImage(row: ImageRow): CatalogueImage {
  return {
    src: resolveImageUrl(row.url),
    alt: row.alt,
    width: row.width ?? DEFAULT_SIZE.width,
    height: row.height ?? DEFAULT_SIZE.height,
    blurDataURL: row.blur_data_url ?? undefined,
    kind: row.kind,
  };
}

function toSpecs(value: unknown): FinishSpecs {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as FinishSpecs) : {};
}

export function toFinish(row: FinishRow): Finish {
  const images = curateImages(
    [...(row.finish_images ?? [])]
      .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.sort_order - b.sort_order)
      .map(toImage),
  );
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    style: row.style,
    colourFamily: row.colour_family,
    description: row.description,
    specs: toSpecs(row.specs),
    isDemo: row.is_demo,
    rrpPence: row.rrp_per_m2_pence ?? undefined,
    images,
  };
}

export function imagesOfKind(finish: Finish, kind: ImageKind): CatalogueImage[] {
  return finish.images.filter((i) => i.kind === kind);
}

/** Best image to represent a finish: room scene, else close-up, else swatch. */
export function leadImage(finish: Finish): CatalogueImage | undefined {
  return finish.images[0];
}

/**
 * The grain image: the plank swatch (a clean, evenly lit product scan), else
 * a close-up. The demo close-ups are site snapshots, so they rank second.
 */
export function grainImage(finish: Finish): CatalogueImage | undefined {
  return imagesOfKind(finish, "swatch")[0] ?? imagesOfKind(finish, "closeup")[0];
}

/** Human-readable spec rows, in display order. Only includes known values. */
export function specRows(specs: FinishSpecs): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (specs.format) rows.push({ label: "Format", value: specs.format });
  if (specs.plank_width_mm && specs.plank_length_mm)
    rows.push({ label: "Plank size", value: `${specs.plank_width_mm} × ${specs.plank_length_mm} mm` });
  if (specs.thickness_mm) rows.push({ label: "Thickness", value: `${specs.thickness_mm} mm` });
  if (specs.wear_layer_mm) rows.push({ label: "Wear layer", value: `${specs.wear_layer_mm.toFixed(2)} mm` });
  if (specs.pack_coverage_m2) rows.push({ label: "Pack coverage", value: `${specs.pack_coverage_m2} m² per box` });
  if (specs.edge) rows.push({ label: "Edge", value: specs.edge });
  if (specs.core) rows.push({ label: "Core", value: specs.core });
  if (specs.surface) rows.push({ label: "Surface", value: specs.surface });
  if (specs.underlay) rows.push({ label: "Underlay", value: specs.underlay });
  if (specs.click_system) rows.push({ label: "Fitting", value: specs.click_system });
  return rows;
}

/** Light to dark by measured tone; finishes without a measurement keep catalogue order at the end. */
export function byTone(finishes: Finish[]): Finish[] {
  const measured = finishes.filter((f) => f.tone !== undefined).sort((a, b) => b.tone! - a.tone!);
  return [...measured, ...finishes.filter((f) => f.tone === undefined)];
}
