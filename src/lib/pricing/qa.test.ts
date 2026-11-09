/**
 * Independent verification of the pricing arithmetic.
 *
 * The reference below is written separately from the implementation, in exact
 * integer arithmetic (BigInt), so it cannot share a floating point mistake
 * with the code it checks. Every property is compared across a grid of
 * boundary values and a few thousand seeded random cases.
 */
import { describe, expect, it } from "vitest";
import { inputToPence } from "@/lib/money";
import {
  customerTotals,
  jobTotals,
  marginBp,
  markupBp,
  packsPrice,
  perPackPence,
  planPacks,
  roomArea,
  sellFromMargin,
  sellFromMarkup,
  totalArea,
  unitProfit,
  vatOn,
} from "./index";

// ---------------------------------------------------------------- reference
/** n / d rounded half up, for non-negative n and positive d. */
const divRound = (n: bigint, d: bigint) => (BigInt(2) * n + d) / (BigInt(2) * d);
const divCeil = (n: bigint, d: bigint) => (n + d - BigInt(1)) / d;
const big = (n: number) => BigInt(n);

/** Lengths and coverages are decimal numbers with at most `dp` places; scale to integers. */
const scaled = (x: number, dp: number) => BigInt(Math.round(x * 10 ** dp));

const refArea = (lengthM: number, widthM: number) => divRound(scaled(lengthM, 3) * scaled(widthM, 3), BigInt(10_000)); // hundredths of m²
const refPacks = (areaHundredths: bigint, wastageTenths: bigint, coverageThousandths: bigint) => {
  const withWastage = divRound(areaHundredths * (BigInt(1000) + wastageTenths), BigInt(1000)); // hundredths
  return { withWastage, packs: divCeil(withWastage * BigInt(10), coverageThousandths) };
};
const refPerPack = (coverageThousandths: bigint, pricePence: bigint) => divRound(coverageThousandths * pricePence, BigInt(1000));

// Seeded generator so a failure can be reproduced.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
const ri = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

// ---------------------------------------------------------------- packs
describe("planPacks against an exact reference", () => {
  it("matches over boundary values", () => {
    const areas = [0.01, 0.99, 1, 2.21, 2.2, 4.42, 4.43, 9.99, 10, 22, 26.3, 99.99, 500];
    const coverages = [0.5, 1, 2.2, 2.205, 2.206, 2.21, 2.214, 2.215, 2.994, 3, 3.333, 3.3];
    const wastes = [0, 5, 7.5, 10, 12, 15, 25, 50];
    const bad: string[] = [];
    for (const a of areas) for (const c of coverages) for (const w of wastes) {
      const got = planPacks(a, w, c);
      const ref = refPacks(scaled(a, 2), scaled(w, 1), scaled(c, 3));
      if (!got || big(got.packs) !== ref.packs) bad.push(`area ${a} wastage ${w}% coverage ${c}: got ${got?.packs}, exact ${ref.packs}`);
    }
    expect(bad).toEqual([]);
  });

  it("matches over 5,000 random cases, including 3-decimal coverages", () => {
    const r = rng(20261109);
    const bad: string[] = [];
    for (let i = 0; i < 5000; i++) {
      const area = ri(r, 1, 100_000) / 100;
      const cov = ri(r, 500, 9000) / 1000;
      const w = ri(r, 0, 500) / 10;
      const got = planPacks(area, w, cov);
      const ref = refPacks(scaled(area, 2), scaled(w, 1), scaled(cov, 3));
      if (!got || big(got.packs) !== ref.packs) bad.push(`area ${area} wastage ${w}% coverage ${cov}: got ${got?.packs}, exact ${ref.packs}`);
      if (bad.length > 8) break;
    }
    expect(bad).toEqual([]);
  });

  it("never supplies less than the area needs (the customer is never short a pack)", () => {
    const r = rng(7);
    for (let i = 0; i < 5000; i++) {
      const area = ri(r, 1, 50_000) / 100;
      const cov = ri(r, 800, 6000) / 1000;
      const w = ri(r, 0, 50);
      const p = planPacks(area, w, cov)!;
      // exact: packs * coverage (thousandths) >= withWastage (hundredths * 10)
      expect(big(p.packs) * scaled(cov, 3) >= scaled(p.areaWithWastageM2, 2) * BigInt(10)).toBe(true);
      // and one pack fewer would not be enough
      expect(big(p.packs - 1) * scaled(cov, 3) < scaled(p.areaWithWastageM2, 2) * BigInt(10)).toBe(true);
    }
  });

  it("is exact when the area divides evenly into packs", () => {
    expect(planPacks(4.42, 0, 2.21)!.packs).toBe(2);
    expect(planPacks(22.1, 0, 2.21)!.packs).toBe(10);
    expect(planPacks(2.21, 0, 2.21)!.packs).toBe(1);
    expect(planPacks(2.22, 0, 2.21)!.packs).toBe(2);
  });

  it("refuses impossible input instead of guessing", () => {
    for (const [a, w, c] of [[0, 10, 2.21], [-1, 10, 2.21], [10, -1, 2.21], [10, 50.01, 2.21], [10, 10, 0], [10, 10, -2], [NaN, 10, 2.21], [10, NaN, 2.21], [10, 10, NaN], [Infinity, 10, 2.21]] as const) {
      expect(planPacks(a, w, c)).toBeNull();
    }
  });

  it("accepts the wastage limits 0% and 50%", () => {
    expect(planPacks(10, 0, 2.21)!.areaWithWastageM2).toBe(10);
    expect(planPacks(10, 50, 2.21)!.areaWithWastageM2).toBe(15);
  });
});

// ---------------------------------------------------------------- areas
describe("room areas", () => {
  it("round half up to hundredths, like the reference", () => {
    const r = rng(42);
    const bad: string[] = [];
    for (let i = 0; i < 4000; i++) {
      const l = ri(r, 1, 20_000) / 1000;
      const w = ri(r, 1, 20_000) / 1000;
      if (BigInt(Math.round(roomArea({ lengthM: l, widthM: w }) * 100)) !== refArea(l, w)) bad.push(`${l} x ${w}: got ${roomArea({ lengthM: l, widthM: w })}`);
      if (bad.length > 6) break;
    }
    expect(bad).toEqual([]);
  });
  it("handles the classic float traps", () => {
    expect(roomArea({ lengthM: 2.005, widthM: 1 })).toBe(2.01); // 2.005 is a half
    expect(roomArea({ lengthM: 1.005, widthM: 1 })).toBe(1.01);
    expect(roomArea({ lengthM: 4.2, widthM: 1.5 })).toBe(6.3);
    expect(roomArea({ lengthM: 0.1, widthM: 0.2 })).toBe(0.02);
  });
  it("is zero for a missing or non-positive side", () => {
    expect(roomArea({ lengthM: 0, widthM: 4 })).toBe(0);
    expect(roomArea({ lengthM: -3, widthM: 4 })).toBe(0);
    expect(roomArea({ lengthM: NaN, widthM: 4 })).toBe(0);
  });
  it("adds rooms from the rounded room areas", () => {
    expect(totalArea([{ lengthM: 5, widthM: 4 }, { lengthM: 4.2, widthM: 1.5 }])).toBe(26.3);
    expect(totalArea([])).toBe(0);
  });
});

// ---------------------------------------------------------------- pack price
describe("pack prices", () => {
  it("per-pack price is coverage x price to the penny, half up, like the reference", () => {
    const r = rng(99);
    const bad: string[] = [];
    for (let i = 0; i < 6000; i++) {
      const cov = ri(r, 500, 9000) / 1000;
      const price = ri(r, 1, 20_000);
      if (big(perPackPence(cov, price)) !== refPerPack(scaled(cov, 3), big(price))) bad.push(`${cov} m² x ${price}p: got ${perPackPence(cov, price)}, exact ${refPerPack(scaled(cov, 3), big(price))}`);
      if (bad.length > 6) break;
    }
    expect(bad).toEqual([]);
  });
  it("whole packs are rounded once: n packs cost n times one pack", () => {
    expect(perPackPence(2.21, 2222)).toBe(4911);
    expect(packsPrice(10, 2.21, 2222)).toBe(49110);
    expect(packsPrice(0, 2.21, 2222)).toBe(0);
  });
});

// ---------------------------------------------------------------- margin, markup, VAT
describe("margin, markup and VAT against an exact reference", () => {
  it("sell price from a markup (half up)", () => {
    const r = rng(5);
    for (let i = 0; i < 4000; i++) {
      const cost = ri(r, 1, 500_000);
      const mk = ri(r, 0, 20_000);
      expect(big(sellFromMarkup(cost, mk))).toBe(divRound(big(cost) * (BigInt(10_000) + big(mk)), BigInt(10_000)));
    }
  });
  it("markup and margin of a profit are exact and distinct", () => {
    const r = rng(6);
    for (let i = 0; i < 4000; i++) {
      const cost = ri(r, 1, 300_000);
      const sell = cost + ri(r, 0, 300_000);
      expect(big(markupBp(cost, sell)!)).toBe(divRound((big(sell) - big(cost)) * BigInt(10_000), big(cost)));
      expect(big(marginBp(cost, sell)!)).toBe(divRound((big(sell) - big(cost)) * BigInt(10_000), big(sell)));
    }
    // 22.22 bought, 32.00 sold: profit 9.78, margin 30.56%, markup 44.01%
    expect(marginBp(2222, 3200)).toBe(3056);
    expect(markupBp(2222, 3200)).toBe(4401);
    // margin is never above 100%, markup can be
    expect(marginBp(100, 10_000)).toBeLessThan(10_000);
    expect(markupBp(100, 10_000)).toBe(990_000);
  });
  it("the required formulas hold: profit = sell - cost, margin = profit / sell, markup = profit / cost", () => {
    const u = unitProfit(2222, 3200);
    expect(u).toEqual({ grossProfitPence: 978, grossMarginBp: 3056, markupBp: 4401 });
    expect(unitProfit(5000, 4000)).toEqual({ grossProfitPence: -1000, grossMarginBp: -2500, markupBp: -2000 }); // a loss
  });
  it("has no margin or markup when the base is zero, instead of dividing by zero", () => {
    expect(marginBp(100, 0)).toBeNull();
    expect(markupBp(0, 100)).toBeNull();
    expect(unitProfit(0, 100).markupBp).toBeNull();
    expect(unitProfit(100, 0).grossMarginBp).toBeNull();
  });
  it("a margin of 100% or more is impossible; below it, selling at that margin returns that margin", () => {
    expect(sellFromMargin(1000, 10_000)).toBeNull();
    expect(sellFromMargin(1000, 12_000)).toBeNull();
    const r = rng(8);
    for (let i = 0; i < 3000; i++) {
      const cost = ri(r, 1000, 500_000);
      const m = ri(r, 0, 9000);
      // exact: cost / (1 - margin), half up
      expect(big(sellFromMargin(cost, m)!)).toBe(divRound(big(cost) * BigInt(10_000), BigInt(10_000) - big(m)));
    }
    // and the margin of that price is that margin to within the penny it was rounded by
    for (const [cost, m] of [[1000, 3000], [4911, 3000], [250_000, 2500], [1, 5000]] as const) {
      const sell = sellFromMargin(cost, m)!;
      const penny = Math.ceil(5000 / sell) + 1; // one penny of sell price moves margin by 10,000/sell bp
      expect(Math.abs(marginBp(cost, sell)! - m)).toBeLessThanOrEqual(penny);
    }
  });
  it("VAT is exact, half up, and 20% of 100.00 is 20.00", () => {
    const r = rng(9);
    for (let i = 0; i < 4000; i++) {
      const net = ri(r, 0, 5_000_000);
      const rate = [0, 500, 2000, 1750][ri(r, 0, 3)];
      expect(big(vatOn(net, rate))).toBe(divRound(big(net) * big(rate), BigInt(10_000)));
    }
    expect(vatOn(10_000, 2000)).toBe(2000);
    expect(vatOn(5, 2000)).toBe(1); // 1p exactly
    expect(vatOn(2, 2500)).toBe(1); // 0.5p rounds up
    expect(vatOn(0, 2000)).toBe(0);
  });
  it("VAT is taken once on the subtotal, so a quote's total is the same however its lines are split", () => {
    const lines = Array.from({ length: 7 }, () => ({ quantity: 1, unitSellPence: 333 }));
    const t = customerTotals(lines, 2000);
    expect(t.subtotalPence).toBe(2331);
    expect(t.vatPence).toBe(vatOn(2331, 2000));
    expect(t.totalPence).toBe(t.subtotalPence + t.vatPence);
  });
});

// ---------------------------------------------------------------- money input
describe("money typed into forms", () => {
  it("accepts pounds and pence and nothing else", () => {
    expect(inputToPence("22.22")).toBe(2222);
    expect(inputToPence("£22.22")).toBe(2222);
    expect(inputToPence("22")).toBe(2200);
    expect(inputToPence("0.01")).toBe(1);
    expect(inputToPence("0.1")).toBe(10);
    expect(inputToPence("1,234.50")).toBe(123450);
  });
  it("refuses too many decimals, negatives, text and exponents", () => {
    for (const bad of ["22.225", "-5", "abc", "1e3", "22..2", "Infinity", "NaN", "0x10"]) expect(inputToPence(bad)).toBeUndefined();
  });
  it("treats blank as no price", () => {
    expect(inputToPence("")).toBeNull();
    expect(inputToPence("   ")).toBeNull();
  });
  it("does not lose pennies on classic float traps", () => {
    expect(inputToPence("1.15")).toBe(115);
    expect(inputToPence("0.29")).toBe(29);
    expect(inputToPence("4.35")).toBe(435);
    expect(inputToPence("8.2")).toBe(820);
  });
});

// ---------------------------------------------------------------- job totals
describe("job costing", () => {
  const line = (kind: "flooring" | "labour" | "trim" | "delivery", quantity: number, cost: number, sell: number) => ({ kind, quantity, unitCostPence: cost, unitSellPence: sell });
  it("adds materials, labour and other costs, then contingency once, then VAT once", () => {
    const t = jobTotals([line("flooring", 10, 4911, 6384), line("labour", 20, 0, 1500), line("trim", 2, 800, 1500), line("delivery", 1, 2500, 3500)], 2000, 500);
    expect(t.materialCostPence).toBe(49110 + 1600);
    expect(t.additionalCostPence).toBe(2500);
    expect(t.contingencyPence).toBe(Math.round(((49110 + 1600 + 2500) * 500) / 10000));
    expect(t.totalJobCostPence).toBe(49110 + 1600 + 2500 + t.contingencyPence);
    expect(t.sellPence).toBe(63840 + 30000 + 3000 + 3500);
    expect(t.vatPence).toBe(vatOn(t.sellPence, 2000));
    expect(t.grossProfitPence).toBe(t.sellPence - t.totalJobCostPence);
    expect(t.grossMarginBp).toBe(marginBp(t.totalJobCostPence, t.sellPence));
    expect(t.markupBp).toBe(Math.round((t.grossProfitPence * 10_000) / t.totalJobCostPence));
  });
  it("an empty job is all zero, with no margin or markup", () => {
    const t = jobTotals([], 2000, 0);
    expect(t.sellPence).toBe(0);
    expect(t.grossMarginBp).toBeNull();
    expect(t.markupBp).toBeNull();
  });
  it("shows a loss as negative, not as a profit", () => {
    const t = jobTotals([line("flooring", 1, 10_000, 8000)], 2000, 0);
    expect(t.grossProfitPence).toBe(-2000);
    expect(t.grossMarginBp!).toBeLessThan(0);
  });
});
