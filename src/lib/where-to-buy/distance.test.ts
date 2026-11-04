import { describe, expect, it } from "vitest";
import { formatMiles, milesBetween, nearest } from "./distance";

const london = { lat: 51.50101, lng: -0.141563 }; // SW1A 1AA
const manchester = { lat: 53.4808, lng: -2.2426 };

describe("milesBetween", () => {
  it("is about 163 miles from London to Manchester", () => {
    expect(milesBetween(london, manchester)).toBeGreaterThan(155);
    expect(milesBetween(london, manchester)).toBeLessThan(170);
  });
  it("is zero for the same point", () => {
    expect(milesBetween(london, london)).toBe(0);
  });
});

describe("nearest", () => {
  const places = [
    { name: "Manchester", ...manchester },
    { name: "No coordinates", lat: null, lng: null },
    { name: "Near", lat: 51.51, lng: -0.13 },
  ];
  it("sorts by distance, drops places without coordinates or beyond the radius", () => {
    const out = nearest(london, places, { maxMiles: 50, limit: 10 });
    expect(out.map((p) => p.name)).toEqual(["Near"]);
    expect(nearest(london, places, { maxMiles: 500, limit: 10 }).map((p) => p.name)).toEqual(["Near", "Manchester"]);
  });
  it("respects the limit", () => {
    expect(nearest(london, places, { maxMiles: 500, limit: 1 })).toHaveLength(1);
  });
});

describe("formatMiles", () => {
  it("uses one decimal under ten miles and whole miles above", () => {
    expect(formatMiles(0.44)).toBe("0.4 miles");
    expect(formatMiles(1)).toBe("1 mile");
    expect(formatMiles(12.6)).toBe("13 miles");
  });
});
