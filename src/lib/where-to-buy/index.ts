import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { publicSupabase } from "@/lib/supabase/public";
import type { LatLng } from "./distance";

export { formatMiles, milesBetween, nearest } from "./distance";

export type StockistType = "showroom" | "retailer" | "fitter";

export interface Stockist {
  id: string;
  name: string;
  type: StockistType;
  address: string;
  postcode: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
}

export const STOCKIST_TYPE_LABELS: Record<StockistType, string> = {
  showroom: "Showroom",
  retailer: "Retailer",
  fitter: "Fitter",
};

export const STOCKISTS_TAG = "stockists";

/** Published stockists only (RLS also enforces this for the anon client). */
export async function getStockists(): Promise<Stockist[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(STOCKISTS_TAG);
  const { data, error } = await publicSupabase()
    .from("stockists")
    .select("id, name, type, address, postcode, lat, lng, phone, website")
    .eq("published", true)
    .order("name");
  if (error) throw new Error(`Failed to load stockists: ${error.message}`);
  return data;
}

export type GeocodeResult = { ok: true; point: LatLng } | { ok: false; reason: "not-found" | "unavailable" };

/**
 * UK postcode to coordinates via postcodes.io (free, no key). Cached per
 * postcode for a week: postcodes do not move. `postcode` must already be
 * normalised (see normalisePostcode).
 */
export async function geocodePostcode(postcode: string): Promise<GeocodeResult> {
  "use cache";
  cacheLife("weeks");
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 404) return { ok: false, reason: "not-found" };
    if (!res.ok) return { ok: false, reason: "unavailable" };
    const body = (await res.json()) as { result?: { latitude: number | null; longitude: number | null } };
    const lat = body.result?.latitude;
    const lng = body.result?.longitude;
    if (lat == null || lng == null) return { ok: false, reason: "not-found" };
    return { ok: true, point: { lat, lng } };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
