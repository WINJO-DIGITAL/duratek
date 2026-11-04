import { describe, expect, it } from "vitest";
import { curateImages, isSecondaryRoom, pickByFileName } from "./curation";
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

describe("pickByFileName", () => {
  const img = (src: string) => ({ image: { src, alt: "", width: 1, height: 1, kind: "room" as const } });
  const a = img("https://cdn.example/files/A.png?v=1");
  const b = img("https://cdn.example/files/B.png?v=2");
  it("prefers the earliest listed file, skipping exclusions, else the first available", () => {
    expect(pickByFileName([a, b], ["B.png", "A.png"])).toBe(b);
    expect(pickByFileName([a, b], ["B.png", "A.png"], new Set([b.image.src]))).toBe(a);
    expect(pickByFileName([a, b], ["C.png"])).toBe(a);
    expect(pickByFileName([], ["C.png"])).toBeUndefined();
  });
});
