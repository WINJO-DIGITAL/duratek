import { describe, expect, it } from "vitest";
import { filtersToQuery, isFiltered, matches, NO_FILTERS, parsePounds, readFilters, sortItems, toneGroups } from "./filter";

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
      priceMin: null,
      priceMax: null,
      q: "oak",
      sort: "light",
    });
    expect(readFilters(new URLSearchParams(""))).toEqual(NO_FILTERS);
  });

  it("round-trips through the query string", () => {
    const f = { style: null, format: "standard", colour: "warm", tone: "dark" as const, priceMin: 20, priceMax: 30, q: "oak", sort: "name" as const };
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

  it("filters by a typed or dragged price range on the RRP per m²", () => {
    const cheap = { ...keswick, rrpPence: 2500 };
    const mid = { ...fellside, rrpPence: 3715 };
    const unpriced = { ...honister };
    const between = (min: number | null, max: number | null) => ({ ...NO_FILTERS, priceMin: min, priceMax: max });
    expect(matches(cheap, between(20, 30))).toBe(true);
    expect(matches(mid, between(20, 30))).toBe(false);
    expect(matches(cheap, between(25, 25))).toBe(true);
    expect(matches(cheap, between(null, 30))).toBe(true);
    expect(matches(mid, between(30, null))).toBe(true);
    expect(matches(unpriced, between(20, 30))).toBe(false);
    expect(matches(unpriced, NO_FILTERS)).toBe(true);
    expect(readFilters(new URLSearchParams("from=20&to=30")).priceMin).toBe(20);
    expect(readFilters(new URLSearchParams("from=20&to=30")).priceMax).toBe(30);
    expect(readFilters(new URLSearchParams("from=nonsense")).priceMin).toBeNull();
    expect(isFiltered(between(null, 40))).toBe(true);
    expect(isFiltered(NO_FILTERS)).toBe(false);
    expect(filtersToQuery(between(20, 30))).toBe("from=20&to=30");
  });

  it("parses pounds from the URL, rejecting negatives and non-numbers", () => {
    expect(parsePounds("27.5")).toBe(27.5);
    expect(parsePounds("-3")).toBeNull();
    expect(parsePounds("abc")).toBeNull();
    expect(parsePounds(null)).toBeNull();
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

describe("sorting", () => {
  const a = { name: "Cartmel Oak", rrpPence: 2500 };
  const b = { name: "Hawkshead Oak", rrpPence: 3715 };
  const c = { name: "Ambleside Oak", rrpPence: 2500 };
  const d = { name: "Truffle Oak" };
  const list = [a, b, c, d]; // light to dark

  it("keeps light to dark by default and reverses it for dark to light", () => {
    expect(sortItems(list, "light")).toEqual(list);
    expect(sortItems(list, "dark").map((x) => x.name)).toEqual(["Truffle Oak", "Ambleside Oak", "Hawkshead Oak", "Cartmel Oak"]);
  });

  it("sorts by price with ties kept in light-to-dark order and unpriced last", () => {
    expect(sortItems(list, "price-asc").map((x) => x.name)).toEqual(["Cartmel Oak", "Ambleside Oak", "Hawkshead Oak", "Truffle Oak"]);
    expect(sortItems(list, "price-desc").map((x) => x.name)).toEqual(["Hawkshead Oak", "Cartmel Oak", "Ambleside Oak", "Truffle Oak"]);
  });

  it("sorts by name and does not change the input", () => {
    expect(sortItems(list, "name").map((x) => x.name)).toEqual(["Ambleside Oak", "Cartmel Oak", "Hawkshead Oak", "Truffle Oak"]);
    expect(list.map((x) => x.name)).toEqual(["Cartmel Oak", "Hawkshead Oak", "Ambleside Oak", "Truffle Oak"]);
  });

  it("keeps the sort in the URL only when it is not the default, and ignores unknown values", () => {
    expect(filtersToQuery({ ...NO_FILTERS, sort: "price-asc" })).toBe("sort=price-asc");
    expect(filtersToQuery({ ...NO_FILTERS, sort: "light" })).toBe("");
    expect(readFilters(new URLSearchParams("sort=name")).sort).toBe("name");
    expect(readFilters(new URLSearchParams("sort=nonsense")).sort).toBe("light");
    expect(isFiltered({ ...NO_FILTERS, sort: "dark" })).toBe(false);
  });
});
