import { describe, expect, it } from "vitest";
import { curateImages, isSecondaryRoom } from "./curation";
import type { CatalogueImage } from "./types";

const img = (file: string, alt: string, kind: CatalogueImage["kind"] = "room"): CatalogueImage => ({
  src: `https://cdn.shopify.com/s/files/1/1032/3902/4989/files/${file}?v=1`,
  alt,
  kind,
  width: 1,
  height: 1,
});

describe("curateImages", () => {
  it("drops retired files and puts bathrooms after floor-led rooms", () => {
    const out = curateImages([
      img("a.jpg", "Oak in a bathroom"),
      img("Keswick_Oak_Kids.png", "Keswick Oak in a children's playroom"),
      img("b.jpg", "Oak in a kitchen"),
      img("s.jpg", "Swatch", "swatch"),
    ]);
    expect(out.map((i) => i.src.split("?")[0].split("/").pop())).toEqual(["b.jpg", "s.jpg", "a.jpg"]);
  });
  it("only treats room scenes as secondary", () => {
    expect(isSecondaryRoom(img("x.jpg", "bathroom", "closeup"))).toBe(false);
    expect(isSecondaryRoom(img("x.jpg", "Oak in a shower room"))).toBe(true);
  });
});
