import { describe, expect, it } from "vitest";
import { jobTotals, unitProfit, type JobLine } from ".";

describe("unit profit (the brief's formulas)", () => {
  it("gross profit, gross margin and markup", () => {
    // Buy 22.22, sell 31.11 per m², both ex VAT.
    const p = unitProfit(2222, 3111);
    expect(p.grossProfitPence).toBe(889); // 31.11 - 22.22
    expect(p.grossMarginBp).toBe(2858); // 8.89 / 31.11 = 28.58%
    expect(p.markupBp).toBe(4001); // 8.89 / 22.22 = 40.01%
  });
  it("margin is always below markup for a profit, and both are negative for a loss", () => {
    const p = unitProfit(1000, 1500);
    expect(p.grossMarginBp).toBe(3333);
    expect(p.markupBp).toBe(5000);
    const loss = unitProfit(1500, 1000);
    expect(loss.grossProfitPence).toBe(-500);
    expect(loss.grossMarginBp).toBe(-5000);
    expect(loss.markupBp).toBe(-3333);
  });
  it("no sale or no cost gives no ratio, not a divide-by-zero", () => {
    expect(unitProfit(1000, 0).grossMarginBp).toBeNull();
    expect(unitProfit(0, 1000).markupBp).toBeNull();
  });
});

describe("job totals", () => {
  const lines: JobLine[] = [
    { kind: "flooring", quantity: 10, unitCostPence: 4911, unitSellPence: 6875 },
    { kind: "trim", quantity: 4, unitCostPence: 800, unitSellPence: 1500 },
    { kind: "adhesive", quantity: 1, unitCostPence: 1200, unitSellPence: 1800 },
    { kind: "labour", quantity: 22, unitCostPence: 0, unitSellPence: 1500 },
    { kind: "delivery", quantity: 1, unitCostPence: 2500, unitSellPence: 3500 },
  ];

  it("groups costs into materials, labour and additional", () => {
    const t = jobTotals(lines, 2000, 0);
    expect(t.materialCostPence).toBe(49110 + 3200 + 1200);
    expect(t.labourCostPence).toBe(0);
    expect(t.additionalCostPence).toBe(2500);
    expect(t.totalJobCostPence).toBe(56010);
  });

  it("sell, VAT, gross profit, margin and markup", () => {
    const t = jobTotals(lines, 2000, 0);
    expect(t.sellPence).toBe(68750 + 6000 + 1800 + 33000 + 3500);
    expect(t.vatPence).toBe(Math.round(t.sellPence * 0.2));
    expect(t.grossProfitPence).toBe(t.sellPence - 56010);
    expect(t.grossMarginBp).toBe(Math.round((t.grossProfitPence * 10000) / t.sellPence));
    expect(t.markupBp).toBe(Math.round((t.grossProfitPence * 10000) / 56010));
  });

  it("contingency is a cost allowance: it raises job cost and lowers gross profit, not the price", () => {
    const without = jobTotals(lines, 2000, 0);
    const with5 = jobTotals(lines, 2000, 500);
    expect(with5.contingencyPence).toBe(Math.round(56010 * 0.05));
    expect(with5.totalJobCostPence).toBe(56010 + with5.contingencyPence);
    expect(with5.sellPence).toBe(without.sellPence);
    expect(with5.grossProfitPence).toBe(without.grossProfitPence - with5.contingencyPence);
  });

  it("an empty job", () => {
    const t = jobTotals([], 2000, 1000);
    expect([t.totalJobCostPence, t.sellPence, t.grossProfitPence, t.grossMarginBp, t.markupBp]).toEqual([0, 0, 0, null, null]);
  });
});
