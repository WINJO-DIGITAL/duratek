import { describe, expect, it } from "vitest";
import { compareRows } from "./compare";
import type { Finish } from "./types";

const base = { core: "Rigid SPC, waterproof", wear_layer_mm: 0.55, format: "Straight plank" };
const f = (id: string, colourFamily: string, specs: Finish["specs"]): Finish => ({
  id,
  name: id,
  slug: id,
  style: "plank",
  colourFamily,
  description: "",
  specs: { ...base, ...specs },
  isDemo: true,
  images: [],
});

describe("compareRows", () => {
  const keswick = f("keswick", "natural", { plank_width_mm: 181, plank_length_mm: 1219, thickness_mm: 5 });
  const fellside = f("fellside", "natural", { plank_width_mm: 228, plank_length_mm: 1492, thickness_mm: 7 });

  it("splits what differs from what is shared", () => {
    const { different, shared } = compareRows([keswick, fellside]);
    expect(different.map((r) => r.label)).toEqual(["Plank format", "Plank size", "Thickness"]);
    expect(different[1].values).toEqual(["181 × 1219 mm", "228 × 1492 mm"]);
    expect(different[1].measured).toBe(true);
    expect(shared.map((r) => r.label)).toEqual(["Colour", "Wear layer", "Core"]);
  });

  it("compares the public RRP when there is one", () => {
    const { different } = compareRows([{ ...keswick, rrpPence: 3333 }, { ...fellside, rrpPence: 3999 }]);
    expect(different.find((r) => r.label === "RRP per m²")?.values).toEqual(["£33.33", "£39.99"]);
  });

  it("treats a single finish as all shared", () => {
    expect(compareRows([keswick]).different).toEqual([]);
  });
});
