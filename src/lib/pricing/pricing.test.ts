import { describe, expect, it } from "vitest";
import {
  customerTotals,
  formatBp,
  formatQuantity,
  marginBp,
  markupBp,
  packsPrice,
  percentToBp,
  perPackPence,
  planPacks,
  roomArea,
  sellFromMargin,
  sellFromMarkup,
  totalArea,
  traderTotals,
  vatOn,
} from ".";

describe("margin and markup", () => {
  it("adds a markup to cost", () => {
    expect(sellFromMarkup(2000, 3000)).toBe(2600);
    expect(sellFromMarkup(2222, 2500)).toBe(2778); // 2777.5 rounds half up
    expect(sellFromMarkup(1000, 0)).toBe(1000);
  });

  it("finds the sell price that keeps a margin", () => {
    expect(sellFromMargin(2000, 2000)).toBe(2500); // 20% margin = 25% markup
    expect(sellFromMargin(1000, 5000)).toBe(2000);
    expect(sellFromMargin(1000, 10000)).toBeNull();
  });

  it("measures markup and margin, including a loss", () => {
    expect(markupBp(2000, 2600)).toBe(3000);
    expect(marginBp(2000, 2500)).toBe(2000);
    expect(marginBp(3000, 2500)).toBe(-2000);
    expect(markupBp(0, 100)).toBeNull();
    expect(marginBp(100, 0)).toBeNull();
  });

  it("markup and margin agree with each other", () => {
    const exact = sellFromMarkup(2500, 4000); // 3500, no rounding
    expect(markupBp(2500, exact)).toBe(4000);
    expect(marginBp(2500, exact)).toBe(2857); // 40% markup is 28.57% margin
    // Rounding to a whole penny can move the measured rate by up to 1 bp.
    const cost = 3333;
    const sell = sellFromMarkup(cost, 4000); // 4666.2 -> 4666
    expect(Math.abs(markupBp(cost, sell)! - 4000)).toBeLessThanOrEqual(1);
  });

  it("works out VAT", () => {
    expect(vatOn(10000, 2000)).toBe(2000);
    expect(vatOn(1234, 2000)).toBe(247); // 246.8
    expect(vatOn(1000, 0)).toBe(0);
  });

  it("formats and parses percentages", () => {
    expect(formatBp(3000)).toBe("30%");
    expect(formatBp(3250)).toBe("32.5%");
    expect(formatBp(2857)).toBe("28.57%");
    expect(formatBp(-400)).toBe("-4%");
    expect(formatBp(null)).toBe("—");
    expect(percentToBp("30")).toBe(3000);
    expect(percentToBp("32.5%")).toBe(3250);
    expect(percentToBp("")).toBeNull();
    expect(percentToBp("abc")).toBeUndefined();
    expect(percentToBp("-5")).toBeUndefined();
    expect(percentToBp("60", { max: 50 })).toBeUndefined();
  });
});

describe("flooring quantities", () => {
  it("measures rooms and ignores bad dimensions", () => {
    expect(roomArea({ lengthM: 4.2, widthM: 3.6 })).toBe(15.12);
    expect(roomArea({ lengthM: 0, widthM: 3 })).toBe(0);
    expect(roomArea({ lengthM: Number.NaN, widthM: 3 })).toBe(0);
    expect(totalArea([{ lengthM: 4.2, widthM: 3.6 }, { lengthM: 2, widthM: 1.5 }])).toBe(18.12);
  });

  it("rounds packs up, never down", () => {
    // Standard plank: 2.21 m² per pack.
    const plan = planPacks(20, 10, 2.21)!;
    expect(plan.areaWithWastageM2).toBe(22);
    expect(plan.packs).toBe(10); // 9.95 packs -> 10
    expect(plan.suppliedM2).toBe(22.1);
    expect(plan.spareM2).toBe(0.1);
  });

  it("does not add a pack for floating point noise on an exact fit", () => {
    expect(planPacks(4.42, 0, 2.21)!.packs).toBe(2);
    expect(planPacks(6.15, 0, 2.05)!.packs).toBe(3); // extra-long: 2.05 m² per pack
  });

  it("adds a pack for anything over an exact fit", () => {
    expect(planPacks(4.43, 0, 2.21)!.packs).toBe(3);
  });

  it("rejects impossible inputs", () => {
    expect(planPacks(0, 10, 2.21)).toBeNull();
    expect(planPacks(10, 10, 0)).toBeNull();
    expect(planPacks(10, -1, 2.21)).toBeNull();
    expect(planPacks(10, 80, 2.21)).toBeNull();
  });

  it("prices whole packs from a per-m² price", () => {
    expect(perPackPence(2.21, 2222)).toBe(4911); // 4910.62
    expect(packsPrice(10, 2.21, 2222)).toBe(49110); // whole packs: 10 x 49.11
  });

  it("regression: calculator and quote line agree for the same packs", () => {
    const plan = planPacks(20, 10, 2.21)!;
    expect(packsPrice(plan.packs, 2.21, 2222)).toBe(plan.packs * perPackPence(2.21, 2222));
  });
});

describe("quote totals", () => {
  const lines = [
    { quantity: 10, unitCostPence: 4911, unitSellPence: 6385 }, // flooring packs
    { quantity: 22, unitCostPence: 0, unitSellPence: 1200 }, // fitting per m²
    { quantity: 2.5, unitCostPence: 800, unitSellPence: 1299 }, // trims, metres
  ];

  it("totals what the customer pays, with VAT", () => {
    const t = customerTotals(lines, 2000);
    expect(t.subtotalPence).toBe(63850 + 26400 + 3248); // 3247.5 rounds up
    expect(t.vatPence).toBe(Math.round(t.subtotalPence * 0.2));
    expect(t.totalPence).toBe(t.subtotalPence + t.vatPence);
  });

  it("gives the trader cost, profit and margin before VAT", () => {
    const t = traderTotals(lines, 2000);
    expect(t.costPence).toBe(49110 + 0 + 2000);
    expect(t.profitPence).toBe(t.subtotalPence - t.costPence);
    expect(t.marginBp).toBe(marginBp(t.costPence, t.subtotalPence));
  });

  it("the customer copy (no costs) gives the same customer totals", () => {
    const customerCopy = lines.map(({ quantity, unitSellPence }) => ({ quantity, unitSellPence }));
    expect(customerTotals(customerCopy, 2000)).toEqual(customerTotals(lines, 2000));
  });

  it("handles an empty quote and a zero VAT rate", () => {
    expect(traderTotals([], 2000)).toEqual({ subtotalPence: 0, vatPence: 0, totalPence: 0, costPence: 0, profitPence: 0, marginBp: null });
    expect(customerTotals(lines, 0).vatPence).toBe(0);
  });

  it("describes quantities", () => {
    expect(formatQuantity(10, "pack")).toBe("10 packs");
    expect(formatQuantity(1, "pack")).toBe("1 pack");
    expect(formatQuantity(22.1, "m2")).toBe("22.1 m²");
    expect(formatQuantity(2.5, "metre")).toBe("2.5 metres");
  });
});
