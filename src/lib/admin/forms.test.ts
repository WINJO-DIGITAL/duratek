import { describe, expect, it } from "vitest";
import { mergeSpecs, parseFinish, parseRetailer, parseStockist, slugify, variantFromFinish } from "./forms";

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe("stockist form", () => {
  const base = { name: "Kendal Flooring", type: "showroom", address: "1 High St, Kendal", postcode: "la94aa", website: "kendalflooring.co.uk" };

  it("normalises postcode and website, and defaults the private fields to empty", () => {
    const r = parseStockist(fd({ ...base, published: "on", verified: "on" }));
    expect(r.ok && r.data).toMatchObject({
      name: "Kendal Flooring",
      postcode: "LA9 4AA",
      phone: null,
      website: "https://kendalflooring.co.uk/",
      email: null,
      published: true,
      verified: true,
      finish_ids: [],
      price_list_id: null,
      lead_email: null,
    });
  });

  it("refuses non-https and script URLs", () => {
    for (const website of ["http://x.co.uk", "javascript:alert(1)", "not a url"]) {
      const r = parseStockist(fd({ name: "x", type: "fitter", address: "a", postcode: "LA9 4AA", website }));
      expect(r.ok).toBe(false);
    }
  });

  it("will not publish a stockist that hasn't been verified", () => {
    const r = parseStockist(fd({ ...base, published: "on" }));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors.published).toMatch(/Verified/);
    expect(parseStockist(fd({ ...base, verified: "on" })).ok).toBe(true); // verified but hidden is fine
    expect(parseStockist(fd(base)).ok).toBe(true); // a draft needs no verification
  });

  it("checks the email addresses and the terms dates", () => {
    expect(parseStockist(fd({ ...base, email: "nope" })).ok).toBe(false);
    expect(parseStockist(fd({ ...base, lead_email: "Leads@Shop.CO.UK" })).ok).toBe(true);
    expect(parseStockist(fd({ ...base, terms_valid_from: "2026-12-01", terms_valid_to: "2026-11-01" })).ok).toBe(false);
    expect(parseStockist(fd({ ...base, terms_valid_from: "2026-11-01", terms_valid_to: "2026-12-01" })).ok).toBe(true);
  });

  it("collects the range carried and ignores things that aren't ids", () => {
    const f = fd(base);
    f.append("finish_ids", "11111111-1111-4111-8111-111111111111");
    expect(parseStockist(f).ok).toBe(true);
    f.append("finish_ids", "not-a-uuid");
    expect(parseStockist(f).ok).toBe(false);
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
  const base = { name: "Keswick Oak", slug: "keswick-oak", style: "plank", colour_family: "natural", description: "", sku: "", pack_coverage_m2: "2.21", thickness_mm: "5" };

  it("parses a finish with specs, and makes a stock code from the web address", () => {
    const r = parseFinish(fd(base));
    expect(r.ok && r.data).toMatchObject({ slug: "keswick-oak", pack_coverage_m2: 2.21, thickness_mm: 5, plank_width_mm: undefined });
    if (r.ok) expect(variantFromFinish(r.data)).toMatchObject({ sku: "DT-KESWICK-OAK", pack_coverage_m2: 2.21, thickness_mm: 5, width_mm: null });
  });

  it("rejects bad slugs, stock codes and numbers", () => {
    const r = parseFinish(fd({ ...base, slug: "Keswick Oak!", pack_coverage_m2: "-1", sku: "bad code!" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["pack_coverage_m2", "sku", "slug"]);
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

import { parseVariant } from "./forms";

describe("variant form", () => {
  const base = { sku: "dt-keswick-xl", name: "Extra-long pack", unit_of_sale: "pack", pack_coverage_m2: "2.21", vat_percent: "20", active: "on" };
  it("accepts a pack with its coverage and normalises the stock code", () => {
    const r = parseVariant(fd(base));
    expect(r.ok && r.data).toMatchObject({ sku: "DT-KESWICK-XL", pack_coverage_m2: 2.21, vat_percent: 20, active: true });
  });
  it("needs the pack coverage for a pack", () => {
    const r = parseVariant(fd({ ...base, pack_coverage_m2: "" }));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors.pack_coverage_m2).toMatch(/covers/);
  });
  it("needs none for an item", () => {
    expect(parseVariant(fd({ ...base, unit_of_sale: "item", pack_coverage_m2: "" })).ok).toBe(true);
  });
  it("refuses a bad stock code, a negative measurement and a fractional unit count", () => {
    expect(parseVariant(fd({ ...base, sku: "x" })).ok).toBe(false);
    expect(parseVariant(fd({ ...base, thickness_mm: "-5" })).ok).toBe(false);
    expect(parseVariant(fd({ ...base, units_per_pack: "2.5" })).ok).toBe(false);
  });
  it("defaults VAT to 20%", () => {
    const f = fd(base);
    f.delete("vat_percent");
    const r = parseVariant(f);
    expect(r.ok && r.data.vat_percent).toBe(20);
  });
});
