import { describe, expect, it } from "vitest";
import { relatedFinishes } from "./related";
import type { Finish } from "./types";

const f = (id: string, colourFamily: string, tone?: number): Finish => ({
  id,
  name: id,
  slug: id,
  style: "plank",
  colourFamily,
  description: "",
  specs: {},
  isDemo: true,
  images: [],
  tone,
});

describe("relatedFinishes", () => {
  it("puts the same colour family first, nearest in tone, and excludes the finish itself", () => {
    const me = f("me", "natural", 0.5);
    const all = [me, f("grey", "grey", 0.5), f("far", "natural", 0.9), f("near", "natural", 0.45), f("warm", "warm", 0.6)];
    expect(relatedFinishes(all, me, 4).map((x) => x.id)).toEqual(["near", "far", "grey", "warm"]);
    expect(relatedFinishes(all, me, 2)).toHaveLength(2);
  });
});
