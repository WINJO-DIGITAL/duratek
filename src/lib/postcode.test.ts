import { describe, expect, it } from "vitest";
import { normalisePostcode } from "./postcode";

describe("normalisePostcode", () => {
  it("accepts UK formats and normalises spacing and case", () => {
    expect(normalisePostcode("sw1a1aa")).toBe("SW1A 1AA");
    expect(normalisePostcode(" M1  1AE ")).toBe("M1 1AE");
    expect(normalisePostcode("b33 8th")).toBe("B33 8TH");
    expect(normalisePostcode("CR2 6XH")).toBe("CR2 6XH");
    expect(normalisePostcode("DN55 1PT")).toBe("DN55 1PT");
  });
  it("rejects anything that is not a UK postcode", () => {
    for (const bad of ["", "12345", "SW1A", "ABC 123", "SW1A 1AAA", "1AA SW1"]) {
      expect(normalisePostcode(bad)).toBeNull();
    }
  });
});
