/** Site-wide configuration. Business rules live here, not in components. */
export const SAMPLE_LIMIT = 3;

export const PRIMARY_NAV = [
  { href: "/range", label: "Range" },
  { href: "/inspiration", label: "Inspiration" },
  { href: "/where-to-buy", label: "Where to buy" },
  { href: "/samples", label: "Samples" },
] as const;

export const TRADE_NAV = { href: "/trade", label: "Trade" } as const;

export const WARRANTY_DISCLAIMER =
  "WARRANTY DISCLAIMER: Residential Lifetime = 25 years. Commercial Warranty Applicable to Light & Medium Traffic Areas. Not Applicable to Heavy Traffic Areas. Complete warranty info can be found on the info pages.";

/** Display labels for colour family ids stored on finishes. */
export const COLOUR_FAMILY_LABELS: Record<string, string> = {
  natural: "Natural oak",
  warm: "Warm oak",
  greige: "Greige",
  grey: "Grey",
};

export const STYLE_LABELS = {
  plank: "Straight plank",
  herringbone: "Herringbone",
} as const;

export function colourFamilyLabel(id: string): string {
  return COLOUR_FAMILY_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}
