import { describe, expect, it } from "vitest";
import { buildFlooringLine } from "./flooring-line";

const base = {
  finishName: "Keswick Oak",
  packCoverageM2: 2.21,
  costPerM2Pence: 2222,
  sellPerM2Pence: null,
  defaultMarkupBp: 3000,
  areaM2: 20,
  wastagePct: 10,
};

describe("flooring line", () => {
  it("prices whole packs at the trader's cost plus default markup", () => {
    const r = buildFlooringLine(base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.row.quantity).toBe(10);
    expect(r.row.unit_cost_pence).toBe(4911); // 2.21 x 22.22
    expect(r.row.unit_sell_pence).toBe(Math.round(2.21 * 2889)); // 22.22 + 30% = 28.89 per m²
    expect(r.row.description).toBe("Keswick Oak, 10 packs of 2.21 m² (22.1 m²)");
    expect(r.row.area_m2).toBe(20);
  });

  it("uses the trader's own sell price when given", () => {
    const r = buildFlooringLine({ ...base, sellPerM2Pence: 3499 });
    expect(r.ok && r.row.unit_sell_pence).toBe(Math.round(2.21 * 3499));
  });

  it("allows a typed sell price when the trader has no trade price yet (cost 0)", () => {
    const r = buildFlooringLine({ ...base, costPerM2Pence: undefined, sellPerM2Pence: 3000 });
    expect(r.ok && r.row.unit_cost_pence).toBe(0);
  });

  it("needs a price from somewhere, and pack coverage", () => {
    expect(buildFlooringLine({ ...base, costPerM2Pence: undefined })).toEqual({ ok: false, error: "no-price" });
    expect(buildFlooringLine({ ...base, packCoverageM2: undefined })).toEqual({ ok: false, error: "no-coverage" });
    expect(buildFlooringLine({ ...base, areaM2: 0 })).toEqual({ ok: false, error: "bad-area" });
  });
});
