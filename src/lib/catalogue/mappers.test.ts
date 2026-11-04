import { describe, expect, it } from "vitest";
import { imagePool } from "./image-pool";
import { grainImage, resolveImageUrl, specRows, toFinish, type FinishRow } from "./mappers";

const row = (over: Partial<FinishRow> = {}): FinishRow => ({
  id: "f1",
  name: "Keswick Oak",
  slug: "keswick-oak",
  style: "plank",
  colour_family: "natural",
  description: "",
  specs: { thickness_mm: 5, plank_width_mm: 181, plank_length_mm: 1219, wear_layer_mm: 0.55 },
  is_demo: true,
  finish_images: [
    { url: "https://cdn.example/s.jpg", alt: "swatch", kind: "swatch", width: 10, height: 10, blur_data_url: null, sort_order: 0 },
    { url: "https://cdn.example/r2.jpg", alt: "room 2", kind: "room", width: null, height: null, blur_data_url: null, sort_order: 1 },
    { url: "rooms/r1.jpg", alt: "room 1", kind: "room", width: 10, height: 10, blur_data_url: "data:x", sort_order: 0 },
  ],
  ...over,
});

describe("catalogue mappers", () => {
  it("resolves storage paths against the Supabase public bucket", () => {
    expect(resolveImageUrl("https://a.b/c.jpg", "https://x.supabase.co")).toBe("https://a.b/c.jpg");
    expect(resolveImageUrl("/rooms/r1.jpg", "https://x.supabase.co")).toBe(
      "https://x.supabase.co/storage/v1/object/public/finish-images/rooms/r1.jpg",
    );
  });

  it("orders images room, close-up, swatch and by sort order", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    const f = toFinish(row());
    expect(f.images.map((i) => i.alt)).toEqual(["room 1", "room 2", "swatch"]);
    expect(f.images[1].width).toBeGreaterThan(0); // default size when missing
    expect(grainImage(f)?.alt).toBe("swatch");
  });

  it("formats spec rows and skips unknown values", () => {
    const rows = specRows({ thickness_mm: 5, plank_width_mm: 181, plank_length_mm: 1219, wear_layer_mm: 0.55 });
    expect(rows).toEqual([
      { label: "Plank size", value: "181 × 1219 mm" },
      { label: "Thickness", value: "5 mm" },
      { label: "Wear layer", value: "0.55 mm" },
    ]);
  });

  it("interleaves the image pool across finishes", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    const f1 = toFinish(row());
    const f2 = toFinish(row({ id: "f2", finish_images: [{ url: "https://c/x.jpg", alt: "f2 room", kind: "room", width: 1, height: 1, blur_data_url: null, sort_order: 0 }] }));
    expect(imagePool([f1, f2], "room").map((p) => p.image.alt)).toEqual(["room 1", "f2 room", "room 2"]);
  });
});
