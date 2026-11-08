import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { publicSupabase } from "@/lib/supabase/public";
import { toFinish, toImage, type FinishRow } from "./mappers";
import { isRetired, isSecondaryRoom } from "./curation";
import { measureTone } from "./tone";
import type { Finish, InspirationItem, OnlineRetailer } from "./types";

export * from "./types";
export { byTone, grainImage, imagesOfKind, leadImage, specRows } from "./mappers";

/** Cache tags. Admin mutations call updateTag() with these. */
export const TAGS = {
  finishes: "finishes",
  inspiration: "inspiration",
  retailers: "online-retailers",
} as const;

const FINISH_SELECT =
  "id, name, slug, style, colour_family, description, specs, is_demo, product_variants (id, is_default, active), finish_images (url, alt, kind, width, height, blur_data_url, sort_order)";

export async function getFinishes(): Promise<Finish[]> {
  "use cache";
  // Minutes, not hours: a dated price change or promotion starts on time.
  // Admin edits refresh it at once through the finishes tag.
  cacheLife("minutes");
  cacheTag(TAGS.finishes);
  const { data, error } = await publicSupabase()
    .from("finishes")
    .select(FINISH_SELECT)
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`Failed to load finishes: ${error.message}`);
  const finishes = (data as FinishRow[]).map(toFinish);

  // Public prices come from the price resolver as a visitor: the RRP, or a
  // public promotion below it. Never a trade price (the resolver decides).
  const { data: prices, error: priceError } = await publicSupabase().rpc("catalogue_prices");
  if (priceError) throw new Error(`Failed to load prices: ${priceError.message}`);
  for (const f of finishes) {
    const p = prices?.find((x) => x.finish_id === f.id && x.price_unit === "m2");
    if (!p) continue;
    f.rrpPence = p.rrp_amount_pence ?? (p.source === "rrp" ? p.amount_pence : undefined);
    if (p.is_promotion && p.prices_include_vat && (f.rrpPence === undefined || p.amount_pence < f.rrpPence)) f.offerPence = p.amount_pence;
  }
  await Promise.all(
    finishes.map(async (f) => {
      f.tone = await measureTone(f.images.find((i) => i.kind === "swatch")?.blurDataURL);
    }),
  );
  return finishes;
}

export async function getFinish(slug: string): Promise<Finish | null> {
  const finishes = await getFinishes();
  return finishes.find((f) => f.slug === slug) ?? null;
}

export async function getInspiration(): Promise<InspirationItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.inspiration);
  const { data, error } = await publicSupabase()
    .from("inspiration")
    .select("id, title, mood, image_path, alt, width, height, blur_data_url, finish_ids")
    .order("sort_order");
  if (error) throw new Error(`Failed to load inspiration: ${error.message}`);
  // Same curation as finish photography: no retired files, and no
  // bathrooms or playrooms where the floor is not the subject.
  return data
    .map((r) => ({
    id: r.id,
    title: r.title,
    mood: r.mood,
    finishIds: r.finish_ids,
    image: toImage({
      url: r.image_path,
      alt: r.alt || r.title,
      kind: "room",
      width: r.width,
      height: r.height,
      blur_data_url: r.blur_data_url,
      sort_order: 0,
    }),
    }))
    .filter((item) => !isRetired(item.image) && !isSecondaryRoom({ ...item.image, alt: `${item.image.alt} ${item.title}` }));
}

export async function getOnlineRetailers(): Promise<OnlineRetailer[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.retailers);
  const { data, error } = await publicSupabase()
    .from("online_retailers")
    .select("id, name, url")
    .order("sort_order");
  if (error) throw new Error(`Failed to load online retailers: ${error.message}`);
  return data;
}
