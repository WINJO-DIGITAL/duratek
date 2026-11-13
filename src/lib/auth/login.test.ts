import { describe, expect, it } from "vitest";
import { loginSchema, safeNext } from "./login";

describe("login", () => {
  it("validates and normalises the email", () => {
    expect(loginSchema.safeParse({ email: " Sam@Example.com ", password: "x" }).data?.email).toBe("sam@example.com");
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
  it("only ever redirects to a path on this site", () => {
    expect(safeNext("/range/keswick-oak")).toBe("/range/keswick-oak");
    expect(safeNext("/trade/account?x=1")).toBe("/trade/account?x=1");
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", "/a\r\nb", undefined, 5]) {
      expect(safeNext(bad)).toBe("/trade/account");
    }
    expect(safeNext("nope", "/")).toBe("/");
  });
});
