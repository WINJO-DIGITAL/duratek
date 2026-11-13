import { describe, expect, it } from "vitest";
import { formatOptions, measureLine, plankFormat, plankSize } from "./format";

const standard = { plank_width_mm: 181, plank_length_mm: 1219, thickness_mm: 5 };
const long = { plank_width_mm: 228, plank_length_mm: 1492, thickness_mm: 7 };

describe("plank formats", () => {
  it("classifies by measured length", () => {
    expect(plankFormat(standard)).toBe("standard");
    expect(plankFormat(long)).toBe("extra-long");
    expect(plankFormat({})).toBeUndefined();
  });
  it("never files a herringbone board under a plank format, however long it is", () => {
    const herringbone = { plank_width_mm: 122, plank_length_mm: 610, thickness_mm: 6.5, format: "Herringbone" };
    expect(plankFormat(herringbone)).toBeUndefined();
    expect(formatOptions([{ specs: herringbone }])).toEqual([]);
  });

  it("formats sizes and the measurement line", () => {
    expect(plankSize(standard)).toBe("181 × 1219 mm");
    expect(plankSize({ plank_width_mm: 181 })).toBeUndefined();
    expect(measureLine(standard)).toBe("181 × 1219 mm · 5 mm");
    expect(measureLine({ thickness_mm: 5 })).toBe("5 mm");
    expect(measureLine({})).toBe("");
  });

  it("lists the formats present, standard first, with a shared size", () => {
    expect(formatOptions([{ specs: long }, { specs: standard }, { specs: standard }])).toEqual([
      { format: "standard", label: "Standard plank", size: "181 × 1219 mm" },
      { format: "extra-long", label: "Extra-long plank", size: "228 × 1492 mm" },
    ]);
    expect(formatOptions([{ specs: standard }])).toHaveLength(1);
    // Mixed sizes within a format: no single size to show.
    expect(formatOptions([{ specs: standard }, { specs: { ...standard, plank_width_mm: 190 } }])[0].size).toBeUndefined();
  });
});
