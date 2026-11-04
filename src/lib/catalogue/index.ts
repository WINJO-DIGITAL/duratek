import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { publicSupabase } from "@/lib/supabase/public";
import { toFinish, toImage, type FinishRow } from "./mappers";
import type { Finish, InspirationItem, OnlineRetailer } from "./types";

export * from "./types";
export { grainImage, imagesOfKind, leadImage, specRows } from "./mappers";

/** Cache tags. Admin mutations call updateTag() with these. */
export const TAGS = {
  finishes: "finishes",
  inspiration: "inspiration",
  retailers: "online-retailers",
} as const;

const FINISH_SELECT =
  "id, name, slug, style, colour_family, description, specs, is_demo, finish_images (url, alt, kind, width, height, blur_data_url, sort_order)";

export async function getFinishes(): Promise<Finish[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.finishes);
  const { data, error } = await publicSupabase()
    .from("finishes")
    .select(FINISH_SELECT)
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`Failed to load finishes: ${error.message}`);
  return (data as FinishRow[]).map(toFinish);
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
  return data.map((r) => ({
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
  }));
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
