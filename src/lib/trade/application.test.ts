import { describe, expect, it } from "vitest";
import { readTradeForm, tradeApplicationSchema } from "./application";

const valid = {
  company_name: "Lakeland Floors Ltd",
  contact_name: "Sam Carter",
  email: " Sam@Example.co.uk ",
  phone: "01539 000000",
  trade_type: "fitter",
  address_line1: "1 Stricklandgate",
  address_line2: "",
  town: "Kendal",
  postcode: "LA9 4AA",
  company_number: "",
  vat_number: "",
  website: "",
  additional_info: "",
  password: "a-long-passphrase",
};

describe("trade application", () => {
  it("accepts a complete application and normalises the email", () => {
    const r = tradeApplicationSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.success && r.data.email).toBe("sam@example.co.uk");
  });

  it("rejects missing, invalid and unsafe values", () => {
    const issues = (v: object) =>
      tradeApplicationSchema.safeParse({ ...valid, ...v }).error?.issues.map((i) => String(i.path[0])) ?? [];
    expect(issues({ company_name: "  " })).toEqual(["company_name"]);
    expect(issues({ email: "not-an-email" })).toEqual(["email"]);
    expect(issues({ phone: "call me" })).toEqual(["phone"]);
    expect(issues({ trade_type: "admin" })).toEqual(["trade_type"]);
    expect(issues({ password: "short" })).toEqual(["password"]);
  });

  it("reads only the expected fields from the form", () => {
    const form = new FormData();
    Object.entries(valid).forEach(([k, v]) => form.set(k, v));
    form.set("status", "approved");
    form.set("is_admin", "true");
    expect(Object.keys(readTradeForm(form)).sort()).toEqual(Object.keys(valid).sort());
  });
});

describe("business details", () => {
  const base = {
    company_name: "Fell Floors", contact_name: "Fran", email: "fran@fell.co.uk", phone: "01539 000000", trade_type: "fitter",
    address_line1: "1 High St", address_line2: "", town: "Kendal", postcode: "la94aa",
    company_number: "", vat_number: "", website: "", additional_info: "", password: "a-long-password",
  };
  it("normalises postcode, VAT, company number and website", () => {
    const r = tradeApplicationSchema.parse({ ...base, company_number: "sc 123456", vat_number: "123 4567 89", website: "fellfloors.co.uk" });
    expect([r.postcode, r.company_number, r.vat_number, r.website]).toEqual(["LA9 4AA", "SC123456", "GB123456789", "https://fellfloors.co.uk"]);
  });
  it("keeps optional fields empty", () => {
    const r = tradeApplicationSchema.parse(base);
    expect([r.company_number, r.vat_number, r.website]).toEqual(["", "", ""]);
  });
  it("rejects bad business details", () => {
    const r = tradeApplicationSchema.safeParse({ ...base, postcode: "12345", company_number: "ABC", vat_number: "FR123", address_line1: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(new Set(r.error.issues.map((i) => i.path[0]))).toEqual(new Set(["postcode", "company_number", "vat_number", "address_line1"]));
  });
});
