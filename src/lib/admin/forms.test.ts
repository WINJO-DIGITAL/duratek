import { describe, expect, it } from "vitest";
import { mergeSpecs, parseFinish, parseRetailer, parseStockist, slugify } from "./forms";

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe("stockist form", () => {
  it("normalises postcode and website", () => {
    const r = parseStockist(fd({ name: "Kendal Flooring", type: "showroom", address: "1 High St, Kendal", postcode: "la94aa", website: "kendalflooring.co.uk", published: "on" }));
    expect(r.ok && r.data).toEqual({
      name: "Kendal Flooring",
      type: "showroom",
      address: "1 High St, Kendal",
      postcode: "LA9 4AA",
      phone: null,
      website: "https://kendalflooring.co.uk/",
      published: true,
    });
  });

  it("refuses non-https and script URLs", () => {
    for (const website of ["http://x.co.uk", "javascript:alert(1)", "not a url"]) {
      const r = parseStockist(fd({ name: "x", type: "fitter", address: "a", postcode: "LA9 4AA", website }));
      expect(r.ok).toBe(false);
    }
  });
});

describe("retailer form", () => {
  it("needs a URL", () => {
    expect(parseRetailer(fd({ name: "Kwik Floors", url: "" })).ok).toBe(false);
    const r = parseRetailer(fd({ name: "Kwik Floors", url: "https://www.kwikfloors.co.uk/pages/Duratekflooring", published: "on" }));
    expect(r.ok && r.data.url).toBe("https://www.kwikfloors.co.uk/pages/Duratekflooring");
  });
});

describe("finish form", () => {
  const base = { name: "Keswick Oak", slug: "keswick-oak", style: "plank", colour_family: "natural", description: "", rrp: "33.33", pack_coverage_m2: "2.21", thickness_mm: "5" };

  it("parses a finish with specs and RRP", () => {
    const r = parseFinish(fd(base));
    expect(r.ok && r.data).toMatchObject({ slug: "keswick-oak", rrp_per_m2_pence: 3333, pack_coverage_m2: 2.21, thickness_mm: 5, plank_width_mm: undefined });
  });

  it("rejects bad slugs and numbers", () => {
    const r = parseFinish(fd({ ...base, slug: "Keswick Oak!", pack_coverage_m2: "-1", rrp: "abc" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["pack_coverage_m2", "rrp_per_m2_pence", "slug"]);
  });

  it("keeps specs the form doesn't show and removes blanked ones", () => {
    const r = parseFinish(fd({ ...base, thickness_mm: "" }));
    if (!r.ok) throw new Error("parse failed");
    const merged = mergeSpecs({ core: "Rigid SPC, waterproof", thickness_mm: 5, pack_coverage_m2: 2 }, r.data);
    expect(merged).toEqual({ core: "Rigid SPC, waterproof", pack_coverage_m2: 2.21 });
  });

  it("slugifies names", () => {
    expect(slugify("Honister Slate Grey")).toBe("honister-slate-grey");
    expect(slugify("  Café — Oak ")).toBe("cafe-oak");
  });
});
