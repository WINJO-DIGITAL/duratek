import type { FinishSpecs } from "./types";

/**
 * Plank formats. The range has two board sizes; a plank longer than this is
 * the extra-long format. Derived from the measured length, so a new finish
 * needs no extra field.
 */
export type PlankFormat = "standard" | "extra-long";

const EXTRA_LONG_FROM_MM = 1400;

export const FORMAT_LABELS: Record<PlankFormat, string> = {
  standard: "Standard plank",
  "extra-long": "Extra-long plank",
};

export function plankFormat(specs: FinishSpecs): PlankFormat | undefined {
  if (!specs.plank_length_mm) return undefined;
  return specs.plank_length_mm > EXTRA_LONG_FROM_MM ? "extra-long" : "standard";
}

/** "181 × 1219 mm", or undefined if either dimension is missing. */
export function plankSize(specs: FinishSpecs): string | undefined {
  if (!specs.plank_width_mm || !specs.plank_length_mm) return undefined;
  return `${specs.plank_width_mm} × ${specs.plank_length_mm} mm`;
}

/** Short measurement line for cards: "181 × 1219 mm · 5 mm". */
export function measureLine(specs: FinishSpecs): string {
  return [plankSize(specs), specs.thickness_mm ? `${specs.thickness_mm} mm` : undefined].filter(Boolean).join(" · ");
}

export interface FormatOption {
  format: PlankFormat;
  label: string;
  /** Dimensions shared by every finish in the format, e.g. "181 × 1219 mm". */
  size?: string;
}

/** Formats present in a list of finishes, standard first, each with its size. */
export function formatOptions(finishes: { specs: FinishSpecs }[]): FormatOption[] {
  return (["standard", "extra-long"] as const).flatMap((format) => {
    const inFormat = finishes.filter((f) => plankFormat(f.specs) === format);
    if (inFormat.length === 0) return [];
    const sizes = new Set(inFormat.map((f) => plankSize(f.specs)));
    return [{ format, label: FORMAT_LABELS[format], size: sizes.size === 1 ? [...sizes][0] : undefined }];
  });
}
