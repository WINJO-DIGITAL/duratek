import { describe, expect, it } from "vitest";
import { matches, readFilters } from "./filter";

const keswick = { id: "1", name: "Keswick Oak", style: "plank", colourFamily: "natural" };
const honister = { id: "2", name: "Honister Slate Grey", style: "plank", colourFamily: "grey" };

describe("range filters", () => {
  it("reads filters from search params", () => {
    expect(readFilters(new URLSearchParams("style=plank&colour=grey&q=%20oak%20"))).toEqual({
      style: "plank",
      colour: "grey",
      q: "oak",
    });
    expect(readFilters(new URLSearchParams(""))).toEqual({ style: null, colour: null, q: "" });
  });

  it("matches on style, colour and every search word", () => {
    const f = { style: null, colour: null, q: "" };
    expect(matches(keswick, f)).toBe(true);
    expect(matches(keswick, { ...f, colour: "grey" })).toBe(false);
    expect(matches(honister, { ...f, colour: "grey" })).toBe(true);
    expect(matches(keswick, { ...f, style: "herringbone" })).toBe(false);
    expect(matches(keswick, { ...f, q: "OAK kes" })).toBe(true);
    expect(matches(honister, { ...f, q: "oak" })).toBe(false);
  });
});
