/**
 * Benefits for presenting a finish, from the approved product facts only
 * (CLAUDE.md "Product facts"). Never add claims that aren't there.
 */
export const PRODUCT_BENEFITS = [
  { title: "Waterproof", body: "Rigid SPC core, waterproof." },
  { title: "Scratch-resistant", body: "Scratch Shield surface finish and a 0.55mm protective wear layer." },
  { title: "Integrated underlay", body: "Integrated underlay for comfort and sound reduction." },
  { title: "Click-lock fitting", body: "Unilin click-lock, laid as a floating floor." },
] as const;

/** Suitability, from the warranty facts. Shown with the warranty disclaimer. */
export const SUITABILITY = "Homes (residential lifetime warranty, 25 years); commercial light and medium traffic areas (10 years). Not for heavy-traffic commercial areas.";

/** For comparison tables; always shown with the warranty disclaimer. */
export const SUITABILITY_SHORT = "Homes; commercial light and medium traffic";
