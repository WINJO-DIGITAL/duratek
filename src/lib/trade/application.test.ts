import { describe, expect, it } from "vitest";
import { readTradeForm, tradeApplicationSchema } from "./application";

const valid = {
  company_name: "Lakeland Floors Ltd",
  contact_name: "Sam Carter",
  email: " Sam@Example.co.uk ",
  phone: "01539 000000",
  trade_type: "fitter",
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
