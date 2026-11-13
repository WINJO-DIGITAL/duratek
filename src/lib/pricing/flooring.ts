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

/**
 * A decimal typed by a person ("2.215") as a whole number of 10^-dp units.
 * toPrecision strips the binary noise first (2.005 * 100 is 200.49999999999997),
 * so a value that is exactly half rounds up as it reads.
 */
const scale = (x: number, dp: number) => Math.round(Number((x * 10 ** dp).toPrecision(15)));

/**
 * Packs needed to cover an area with a wastage allowance (cuts, pattern, spares).
 *
 * Done in whole numbers: area in hundredths of a m², wastage in hundredths of a
 * percent, coverage in thousandths of a m² (the precision the database stores).
 * Rounding coverage to hundredths, as an earlier version did, could order a
 * pack too few. Returns null for anything that is not a sensible, finite input.
 */
export function planPacks(areaM2: number, wastagePct: number, packCoverageM2: number): PackPlan | null {
  if (![areaM2, wastagePct, packCoverageM2].every(Number.isFinite)) return null;
  const area = scale(areaM2, 2); // hundredths of m²
  const waste = scale(wastagePct, 2); // hundredths of a percent
  const cover = scale(packCoverageM2, 3); // thousandths of m²
  if (area <= 0 || cover <= 0 || waste < 0 || waste > 5000) return null;
  const withWastage = Math.floor((2 * area * (10_000 + waste) + 10_000) / 20_000); // hundredths, half up
  const packs = Math.floor((withWastage * 10 + cover - 1) / cover); // ceiling
  const supplied = Math.floor((packs * cover + 5) / 10); // hundredths, half up
  return {
    areaM2: area / 100,
    wastagePct,
    areaWithWastageM2: withWastage / 100,
    packs,
    suppliedM2: supplied / 100,
    spareM2: (supplied - withWastage) / 100,
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
