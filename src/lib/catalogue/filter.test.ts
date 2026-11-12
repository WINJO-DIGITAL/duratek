import { describe, expect, it } from "vitest";
import { filtersToQuery, isFiltered, matches, NO_FILTERS, priceBandOf, readFilters, toneGroups } from "./filter";

const keswick = { id: "1", name: "Keswick Oak", style: "plank", colourFamily: "natural", format: "standard" };
const honister = { id: "2", name: "Honister Slate Grey", style: "plank", colourFamily: "grey", format: "standard" };
const fellside = { id: "3", name: "Fellside Oak", style: "plank", colourFamily: "natural", format: "extra-long" };

describe("range filters", () => {
  it("reads filters from search params", () => {
    expect(readFilters(new URLSearchParams("tone=light")).tone).toBe("light");
    expect(readFilters(new URLSearchParams("tone=nonsense")).tone).toBeNull();
    expect(readFilters(new URLSearchParams("style=plank&format=extra-long&colour=grey&q=%20oak%20"))).toEqual({
      style: "plank",
      format: "extra-long",
      colour: "grey",
      tone: null,
      price: null,
      q: "oak",
    });
    expect(readFilters(new URLSearchParams(""))).toEqual(NO_FILTERS);
  });

  it("round-trips through the query string", () => {
    const f = { style: null, format: "standard", colour: "warm", tone: "dark" as const, price: "under-30" as const, q: "oak" };
    expect(readFilters(new URLSearchParams(filtersToQuery(f)))).toEqual(f);
    expect(filtersToQuery(NO_FILTERS)).toBe("");
    expect(isFiltered(NO_FILTERS)).toBe(false);
    expect(isFiltered({ ...NO_FILTERS, format: "standard" })).toBe(true);
  });

  it("matches on style, format, colour and every search word", () => {
    const f = NO_FILTERS;
    expect(matches(keswick, f)).toBe(true);
    expect(matches(keswick, { ...f, colour: "grey" })).toBe(false);
    expect(matches(honister, { ...f, colour: "grey" })).toBe(true);
    expect(matches(keswick, { ...f, style: "herringbone" })).toBe(false);
    expect(matches(fellside, { ...f, format: "extra-long" })).toBe(true);
    expect(matches(keswick, { ...f, format: "extra-long" })).toBe(false);
    expect(matches(keswick, { ...f, format: "standard", colour: "natural" })).toBe(true);
    expect(matches(keswick, { ...f, q: "OAK kes" })).toBe(true);
    expect(matches(honister, { ...f, q: "oak" })).toBe(false);
  });

  it("searches the extra keywords, ignoring hyphens", () => {
    const f = NO_FILTERS;
    const long = { ...fellside, keywords: "Natural oak Extra-long plank" };
    expect(matches(long, { ...f, q: "extra long" })).toBe(true);
    expect(matches(long, { ...f, q: "extra-long natural" })).toBe(true);
    expect(matches(long, { ...f, q: "grey" })).toBe(false);
  });

  it("filters by price band on the RRP per m²", () => {
    const cheap = { ...keswick, rrpPence: 2500 };
    const mid = { ...fellside, rrpPence: 3715 };
    const unpriced = { ...honister };
    expect(priceBandOf(2500)).toBe("under-30");
    expect(priceBandOf(3715)).toBe("30-to-40");
    expect(priceBandOf(4500)).toBe("over-40");
    expect(priceBandOf(undefined)).toBeUndefined();
    expect(matches(cheap, { ...NO_FILTERS, price: "under-30" })).toBe(true);
    expect(matches(mid, { ...NO_FILTERS, price: "under-30" })).toBe(false);
    expect(matches(unpriced, { ...NO_FILTERS, price: "under-30" })).toBe(false);
    expect(matches(unpriced, NO_FILTERS)).toBe(true);
    expect(readFilters(new URLSearchParams("price=30-to-40")).price).toBe("30-to-40");
    expect(readFilters(new URLSearchParams("price=nonsense")).price).toBeNull();
    expect(isFiltered({ ...NO_FILTERS, price: "over-40" })).toBe(true);
  });
});

describe("tone groups", () => {
  it("splits measured finishes into light, mid and dark thirds, and leaves unmeasured ones out", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ id: `f${n}`, tone: n / 10 }));
    const groups = toneGroups([...items, { id: "none" }]);
    const count = (g: string) => [...groups.values()].filter((v) => v === g).length;
    expect(count("light")).toBe(3);
    expect(count("mid")).toBe(3);
    expect(count("dark")).toBe(3);
    expect(groups.get("f9")).toBe("light");
    expect(groups.get("f1")).toBe("dark");
    expect(groups.has("none")).toBe(false);
  });

  it("filters finishes by their tone group", () => {
    const f = { id: "a", name: "A", style: "plank", colourFamily: "grey", toneGroup: "dark" as const };
    expect(matches(f, { ...NO_FILTERS, tone: "dark" })).toBe(true);
    expect(matches(f, { ...NO_FILTERS, tone: "light" })).toBe(false);
  });
});
