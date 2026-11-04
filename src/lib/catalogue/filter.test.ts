import { describe, expect, it } from "vitest";
import { filtersToQuery, isFiltered, matches, NO_FILTERS, readFilters } from "./filter";

const keswick = { id: "1", name: "Keswick Oak", style: "plank", colourFamily: "natural", format: "standard" };
const honister = { id: "2", name: "Honister Slate Grey", style: "plank", colourFamily: "grey", format: "standard" };
const fellside = { id: "3", name: "Fellside Oak", style: "plank", colourFamily: "natural", format: "extra-long" };

describe("range filters", () => {
  it("reads filters from search params", () => {
    expect(readFilters(new URLSearchParams("style=plank&format=extra-long&colour=grey&q=%20oak%20"))).toEqual({
      style: "plank",
      format: "extra-long",
      colour: "grey",
      q: "oak",
    });
    expect(readFilters(new URLSearchParams(""))).toEqual(NO_FILTERS);
  });

  it("round-trips through the query string", () => {
    const f = { style: null, format: "standard", colour: "warm", q: "oak" };
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
});
