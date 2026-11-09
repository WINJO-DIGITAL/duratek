import { describe, expect, it } from "vitest";
import { parseFlooringLine, parseOtherLine, parsePreferences, parseQuoteHeader } from "./quote-forms";

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe("quote header", () => {
  it("accepts a minimal quote and normalises optional fields", () => {
    const r = parseQuoteHeader(fd({ customer_name: "  Mrs Smith ", site_postcode: "la94aa" }));
    expect(r.ok && r.data).toMatchObject({
      customer_name: "Mrs Smith",
      customer_email: null,
      customer_phone: null,
      site_postcode: "LA9 4AA",
      valid_until: null,
      vat_rate_bp: 2000,
    });
  });

  it("reports each bad field", () => {
    const r = parseQuoteHeader(fd({ customer_name: "", customer_email: "nope", site_postcode: "12345", vat_rate_bp: "1500", valid_until: "soon" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["customer_email", "customer_name", "site_postcode", "valid_until", "vat_rate_bp"]);
  });
});

describe("quote lines", () => {
  it("parses a flooring line with default wastage and no sell price", () => {
    const r = parseFlooringLine(fd({ finish_id: "1d2ba501-f6ca-5a31-a44b-3d209f14f5f5", area_m2: "18.5" }));
    expect(r.ok && r.data).toEqual({ finish_id: "1d2ba501-f6ca-5a31-a44b-3d209f14f5f5", area_m2: 18.5, wastage_pct: 10, sell_per_m2_pence: null });
  });

  it("rejects a bad flooring line", () => {
    const r = parseFlooringLine(fd({ finish_id: "x", area_m2: "0", wastage_pct: "60", sell_per_m2: "abc" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["area_m2", "finish_id", "sell_per_m2_pence", "wastage_pct"]);
  });

  it("parses an accessory line; cost may be blank", () => {
    const r = parseOtherLine(fd({ kind: "accessory", description: "Door bar", quantity: "2", unit: "item", unit_sell: "£12.50" }));
    expect(r.ok && r.data).toEqual({ kind: "accessory", description: "Door bar", quantity: 2, unit: "item", unit_cost_pence: 0, unit_sell_pence: 1250 });
  });

  it("requires a sell price and a known kind", () => {
    const r = parseOtherLine(fd({ kind: "flooring", description: "x", quantity: "1", unit: "item", unit_sell: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["kind", "unit_sell_pence"]);
  });
});

describe("preferences", () => {
  it("parses preferences", () => {
    const r = parsePreferences(fd({ default_markup: "35", default_wastage: "7", vat_registered: "on", quote_footer: " Thanks " }));
    expect(r.ok && r.data).toEqual({ default_markup_bp: 3500, default_wastage_pct: 7, vat_registered: true, quote_footer: "Thanks", labour_per_m2_pence: null });
    const withRate = parsePreferences(fd({ default_markup: "35", default_wastage: "7", labour_per_m2: "15.50" }));
    expect(withRate.ok && withRate.data.labour_per_m2_pence).toBe(1550);
  });

  it("rejects out-of-range values", () => {
    const r = parsePreferences(fd({ default_markup: "-1", default_wastage: "70" }));
    expect(r.ok).toBe(false);
  });
});
