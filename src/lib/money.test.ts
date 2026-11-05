import { describe, expect, it } from "vitest";
import { formatPence, inputToPence, penceToInput } from "./money";

describe("money", () => {
  it("formats pence as pounds", () => {
    expect(formatPence(3333)).toBe("£33.33");
    expect(formatPence(5)).toBe("£0.05");
    expect(formatPence(123450)).toBe("£1,234.50");
  });
  it("round-trips through a form field", () => {
    expect(penceToInput(3333)).toBe("33.33");
    expect(penceToInput(null)).toBe("");
    expect(inputToPence("33.33")).toBe(3333);
    expect(inputToPence("£1,234.5")).toBe(123450);
    expect(inputToPence("33")).toBe(3300);
  });
  it("treats blank as no price and junk as invalid", () => {
    expect(inputToPence("  ")).toBeNull();
    expect(inputToPence("abc")).toBeUndefined();
    expect(inputToPence("-5")).toBeUndefined();
    expect(inputToPence("12.345")).toBeUndefined();
  });
  it("avoids floating point drift", () => {
    expect(inputToPence("19.99")).toBe(1999);
    expect(inputToPence("0.07")).toBe(7);
  });
});
