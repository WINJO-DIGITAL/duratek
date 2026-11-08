import { describe, expect, it } from "vitest";
import { dateStart, parseBasePriceForm, parseOverrideForm, parsePriceForm } from "./prices";

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

describe("account price form", () => {
  const A = "1d2ba501-f6ca-5a31-a44b-3d209f14f5f5";
  const B = "6607308f-c648-5d98-aa64-34a93d5f4fc4";
  it("sets, clears and reports bad values; ignores other fields", () => {
    const r = parseOverrideForm([
      [`override:${A}`, "19.50"],
      [`override:${B}`, ""],
      ["override:not-a-uuid", "1"],
      ["profile_id", A],
    ]);
    expect(r).toEqual({ set: [{ finishId: A, pence: 1950 }], clear: [B], invalid: [] });
    expect(parseOverrideForm([[`override:${A}`, "abc"]]).invalid).toEqual([`override:${A}`]);
  });
});

describe("base price grid", () => {
  it("sets, clears and refuses zero or junk", () => {
    const r = parseBasePriceForm([
      [`base:${F}:${T}`, "33.33"],
      [`base:${T}:${F}`, ""],
      [`base:${F}:${F}`, "0"],
      [`base:${T}:${T}`, "abc"],
      ["base:nope:nope", "1"],
    ]);
    expect(r.set).toEqual([{ listId: F, variantId: T, pence: 3333 }]);
    expect(r.clear).toEqual([{ listId: T, variantId: F }]);
    expect(r.invalid).toEqual([`base:${F}:${F}`, `base:${T}:${T}`]);
  });
});

describe("dates", () => {
  it("starts the day in London time, in winter and summer", () => {
    expect(dateStart("2027-01-15")).toBe("2027-01-15T00:00:00.000Z");
    expect(dateStart("2027-07-15")).toBe("2027-07-14T23:00:00.000Z");
    expect(dateStart("")).toBeNull();
    expect(dateStart("15/07/2027")).toBeUndefined();
  });
});
