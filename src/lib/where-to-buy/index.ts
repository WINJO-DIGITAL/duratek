import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { isMissingSchema } from "@/lib/catalogue/errors";
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
  /** Shown publicly only if the owner chose to publish an address. */
  email: string | null;
  openingHours: string | null;
  description: string | null;
  /** Finishes this stockist says it carries. Not live stock: always "check with the stockist". */
  finishIds: string[];
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
    .select("id, name, type, address, postcode, lat, lng, phone, website, email, opening_hours, description, stockist_products (finish_id)")
    .eq("published", true)
    .order("name");
  if (!error) {
    return data.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      address: s.address,
      postcode: s.postcode,
      lat: s.lat,
      lng: s.lng,
      phone: s.phone,
      website: s.website,
      email: s.email,
      openingHours: s.opening_hours,
      description: s.description,
      finishIds: s.stockist_products.map((p) => p.finish_id),
    }));
  }
  // Deploy safety net: before the admin migration runs, these columns and the range table don't exist yet.
  if (!isMissingSchema(error)) throw new Error(`Failed to load stockists: ${error.message}`);
  const legacy = await publicSupabase()
    .from("stockists")
    .select("id, name, type, address, postcode, lat, lng, phone, website")
    .eq("published", true)
    .order("name");
  if (legacy.error) throw new Error(`Failed to load stockists: ${legacy.error.message}`);
  return legacy.data.map((s) => ({ ...s, email: null, openingHours: null, description: null, finishIds: [] }));
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
