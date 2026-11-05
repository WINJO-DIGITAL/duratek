import { describe, expect, it } from "vitest";
import { parsePriceForm } from "./prices";

const F = "11111111-1111-4111-8111-111111111111";
const T = "22222222-2222-4222-8222-222222222222";

describe("parsePriceForm", () => {
  it("reads RRP and tier prices in pounds, blank clearing", () => {
    const r = parsePriceForm([
      [`rrp:${F}`, "33.33"],
      [`price:${F}:${T}`, "£22.50"],
      [`price:${F}:${"33333333-3333-4333-8333-333333333333"}`, ""],
    ]);
    expect(r.rrp).toEqual([{ finishId: F, pence: 3333 }]);
    expect(r.tier[0]).toEqual({ finishId: F, tierId: T, pence: 2250 });
    expect(r.tier[1].pence).toBeNull();
    expect(r.invalid).toEqual([]);
  });
  it("reports what isn't a price and ignores unrelated or malformed fields", () => {
    const r = parsePriceForm([
      [`rrp:${F}`, "lots"],
      [`price:${F}:${T}`, "-4"],
      ["rrp:not-a-uuid", "10"],
      ["name", "x"],
      [`rrp:${F}`, new Blob(["x"]) as unknown],
    ]);
    expect(r.invalid).toEqual([`rrp:${F}`, `price:${F}:${T}`]);
    expect(r.rrp).toEqual([]);
    expect(r.tier).toEqual([]);
  });
});
