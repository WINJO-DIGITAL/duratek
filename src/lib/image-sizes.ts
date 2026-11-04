/**
 * Doubles the slot widths in a `sizes` attribute, leaving media conditions
 * alone: "(min-width: 1024px) 58vw, 100vw" → "(min-width: 1024px) 116vw, 200vw".
 * Used where an image is magnified and must stay sharp.
 */
export function doubleSizes(sizes: string): string {
  return sizes
    .split(",")
    .map((part) => part.replace(/(\d+(?:\.\d+)?)(vw|px)\s*$/, (_, n: string, unit: string) => `${Number(n) * 2}${unit}`))
    .join(",");
}
