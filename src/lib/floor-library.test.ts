import { describe, expect, it } from "vitest";
import { boardAt, pressIntent } from "./floor-library";

describe("floor library scrub", () => {
  it("maps a position to the board under it, in equal slices", () => {
    // 11 boards across 330px from x=20: 30px each.
    expect(boardAt(20, 20, 330, 11)).toBe(0);
    expect(boardAt(49, 20, 330, 11)).toBe(0);
    expect(boardAt(50, 20, 330, 11)).toBe(1);
    expect(boardAt(349, 20, 330, 11)).toBe(10);
  });

  it("clamps outside the strip and handles empty input", () => {
    expect(boardAt(-100, 20, 330, 11)).toBe(0);
    expect(boardAt(999, 20, 330, 11)).toBe(10);
    expect(boardAt(50, 20, 0, 11)).toBe(0);
    expect(boardAt(50, 20, 330, 0)).toBe(0);
  });

  it("tells a sideways scrub from a vertical scroll, once it has moved", () => {
    expect(pressIntent(3, 4)).toBeNull();
    expect(pressIntent(12, 3)).toBe("scrub");
    expect(pressIntent(-12, 5)).toBe("scrub");
    expect(pressIntent(4, 20)).toBe("scroll");
    expect(pressIntent(10, 10)).toBe("scroll");
  });
});
