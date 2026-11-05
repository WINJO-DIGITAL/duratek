import { describe, expect, it } from "vitest";
import { gesture, keepPosition, step, SWIPE_PX } from "./explorer";

describe("finish explorer", () => {
  it("steps and wraps round both ends", () => {
    expect(step(0, 1, 11)).toBe(1);
    expect(step(10, 1, 11)).toBe(0);
    expect(step(0, -1, 11)).toBe(10);
    expect(step(0, 1, 0)).toBe(0);
  });

  it("tells a swipe from a tap and from a scroll", () => {
    expect(gesture(-SWIPE_PX - 1, 5)).toBe("next");
    expect(gesture(SWIPE_PX + 1, -5)).toBe("previous");
    expect(gesture(3, 2)).toBe("tap");
    expect(gesture(20, 200)).toBeNull(); // vertical scroll
    expect(gesture(30, 0)).toBeNull(); // too short for a swipe, too long for a tap
  });

  it("keeps the current finish when it survives a filter", () => {
    const list = [{ slug: "a" }, { slug: "b" }, { slug: "c" }];
    expect(keepPosition(list, "b")).toBe(1);
    expect(keepPosition(list, "z")).toBe(0);
    expect(keepPosition([], "a")).toBe(0);
  });
});
