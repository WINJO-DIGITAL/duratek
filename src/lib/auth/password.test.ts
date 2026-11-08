import { describe, expect, it } from "vitest";
import { emailSchema, newPasswordSchema } from "./password";

describe("new password", () => {
  it("needs 10+ characters and a matching confirmation", () => {
    expect(newPasswordSchema.safeParse({ password: "short", confirm: "short" }).success).toBe(false);
    expect(newPasswordSchema.safeParse({ password: "long-enough-1", confirm: "long-enough-2" }).success).toBe(false);
    expect(newPasswordSchema.safeParse({ password: "long-enough-1", confirm: "long-enough-1" }).success).toBe(true);
    expect(newPasswordSchema.safeParse({ password: "x".repeat(73), confirm: "x".repeat(73) }).success).toBe(false);
  });
  it("normalises email", () => {
    expect(emailSchema.parse("  Sam@Example.CO.UK ")).toBe("sam@example.co.uk");
    expect(emailSchema.safeParse("nope").success).toBe(false);
  });
});
