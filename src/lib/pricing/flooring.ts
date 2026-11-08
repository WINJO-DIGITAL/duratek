/**
 * Flooring quantities. Packs are always rounded up: you can't buy part of a
 * box. Areas are in m², rounded to 2 decimal places (1 cm² is noise).
 */

export interface Room {
  lengthM: number;
  widthM: number;
}

const to2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function roomArea(room: Room): number {
  if (!(room.lengthM > 0) || !(room.widthM > 0)) return 0;
  return to2(room.lengthM * room.widthM);
}

export function totalArea(rooms: Room[]): number {
  return to2(rooms.reduce((sum, r) => sum + roomArea(r), 0));
}

export interface PackPlan {
  /** Measured floor area. */
  areaM2: number;
  wastagePct: number;
  /** Area to buy for, with wastage. */
  areaWithWastageM2: number;
  packs: number;
  /** What those packs actually cover. */
  suppliedM2: number;
  /** Spare beyond the area with wastage. */
  spareM2: number;
}

/** Packs needed to cover an area with a wastage allowance (cuts, pattern, spares). */
export function planPacks(areaM2: number, wastagePct: number, packCoverageM2: number): PackPlan | null {
  if (!(areaM2 > 0) || !(packCoverageM2 > 0) || !(wastagePct >= 0) || wastagePct > 50) return null;
  const withWastage = to2(areaM2 * (1 + wastagePct / 100));
  // Compare in hundredths so 4.42 / 2.21 is exactly 2, not 2.0000000001.
  const packs = Math.ceil(Math.round(withWastage * 100) / Math.round(packCoverageM2 * 100) - 1e-9);
  const supplied = to2(packs * packCoverageM2);
  return {
    areaM2: to2(areaM2),
    wastagePct,
    areaWithWastageM2: withWastage,
    packs,
    suppliedM2: supplied,
    spareM2: to2(supplied - withWastage),
  };
}

/** Per-pack price from a per-m² price, to the penny. */
export function perPackPence(packCoverageM2: number, pricePerM2Pence: number): number {
  return Math.round(packCoverageM2 * pricePerM2Pence + Number.EPSILON);
}

/**
 * Price of whole packs at a per-m² price. Packs are sold whole, so the pack
 * price is rounded once and multiplied: the calculator and a quote line for
 * the same packs always agree to the penny.
 */
export function packsPrice(packs: number, packCoverageM2: number, pricePerM2Pence: number): number {
  return packs * perPackPence(packCoverageM2, pricePerM2Pence);
}

/** Common wastage allowances, in percent. */
export const WASTAGE_OPTIONS = [5, 7, 10, 12, 15] as const;
export const DEFAULT_WASTAGE_PCT = 10;
