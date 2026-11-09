import { describe, expect, it } from "vitest";
import { exportFilename, privacyRequestSchema } from "./privacy";

describe("privacyRequestSchema", () => {
  it("accepts a request and lower-cases the email", () => {
    const r = privacyRequestSchema.parse({ email: " Jane@Example.com", kind: "erase", details: "" });
    expect(r).toEqual({ email: "jane@example.com", kind: "erase", details: null });
  });
  it("refuses a bad email, an unknown kind and a very long message", () => {
    expect(privacyRequestSchema.safeParse({ email: "x", kind: "erase", details: "" }).success).toBe(false);
    expect(privacyRequestSchema.safeParse({ email: "a@b.co", kind: "sell", details: "" }).success).toBe(false);
    expect(privacyRequestSchema.safeParse({ email: "a@b.co", kind: "access", details: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("exportFilename", () => {
  it("is safe to use as a download name", () => {
    expect(exportFilename("Jane.Smith+x@Example.com", new Date("2026-11-11T10:00:00Z"))).toBe("duratek-data-jane-smith-x-example-com-2026-11-11.json");
    expect(exportFilename("../../etc/passwd", new Date("2026-11-11T00:00:00Z"))).not.toContain("/");
  });
});
