export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_MILES = 3958.8;

/** Great-circle distance in miles (haversine). */
export function milesBetween(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Places with coordinates, nearest first, within `maxMiles`, at most `limit`. */
export function nearest<T extends { lat: number | null; lng: number | null }>(
  origin: LatLng,
  places: T[],
  { maxMiles, limit }: { maxMiles: number; limit: number },
): (T & { miles: number })[] {
  return places
    .filter((p): p is T & LatLng => p.lat != null && p.lng != null)
    .map((p) => ({ ...p, miles: milesBetween(origin, p) }))
    .filter((p) => p.miles <= maxMiles)
    .sort((a, b) => a.miles - b.miles)
    .slice(0, limit);
}

/** "0.4 miles", "1 mile", "12 miles". */
export function formatMiles(miles: number): string {
  const rounded = miles < 10 ? Math.round(miles * 10) / 10 : Math.round(miles);
  return `${rounded} ${rounded === 1 ? "mile" : "miles"}`;
}
