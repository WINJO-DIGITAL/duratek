export type FinishStyle = "plank" | "herringbone";
export type ImageKind = "swatch" | "room" | "closeup";

export interface CatalogueImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  blurDataURL?: string;
  kind: ImageKind;
}

export interface FinishSpecs {
  thickness_mm?: number;
  plank_width_mm?: number;
  plank_length_mm?: number;
  pack_coverage_m2?: number;
  edge?: string;
  format?: string;
  wear_layer_mm?: number;
  core?: string;
  surface?: string;
  underlay?: string;
  click_system?: string;
}

export interface Finish {
  id: string;
  name: string;
  slug: string;
  style: FinishStyle;
  colourFamily: string;
  description: string;
  specs: FinishSpecs;
  isDemo: boolean;
  images: CatalogueImage[];
  /** Measured lightness of the swatch, 0 dark .. 1 light; undefined if unmeasured. */
  tone?: number;
}

export interface InspirationItem {
  id: string;
  title: string;
  mood: string;
  image: CatalogueImage;
  finishIds: string[];
}

export interface OnlineRetailer {
  id: string;
  name: string;
  url: string;
}
