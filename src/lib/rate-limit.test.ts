import { describe, expect, it } from "vitest";
import { createFailureLimiter, createLimiter } from "./rate-limit";

describe("createFailureLimiter", () => {
  it("blocks after the allowed number of failures, and only then", () => {
    const l = createFailureLimiter({ max: 3, windowMs: 1000 });
    for (let i = 0; i < 3; i++) {
      expect(l.blocked("a", i)).toBe(false);
      l.fail("a", i);
    }
    expect(l.blocked("a", 3)).toBe(true);
  });
  it("is never used up by checks alone, so successful logins cost nothing", () => {
    const l = createFailureLimiter({ max: 2, windowMs: 1000 });
    for (let i = 0; i < 100; i++) expect(l.blocked("office", i)).toBe(false);
  });
  it("forgets failures after the window", () => {
    const l = createFailureLimiter({ max: 1, windowMs: 1000 });
    l.fail("a", 0);
    expect(l.blocked("a", 999)).toBe(true);
    expect(l.blocked("a", 1000)).toBe(false);
  });
  it("keeps addresses apart", () => {
    const l = createFailureLimiter({ max: 1, windowMs: 1000 });
    l.fail("a", 0);
    expect(l.blocked("b", 1)).toBe(false);
  });
});

describe("createLimiter", () => {
  it("allows up to the limit in a window, then refuses", () => {
    const allow = createLimiter({ max: 2, windowMs: 1000 });
    expect(allow("k", 0)).toBe(true);
    expect(allow("k", 1)).toBe(true);
    expect(allow("k", 2)).toBe(false);
    expect(allow("k", 1001)).toBe(true);
  });
});
