import { describe, expect, it } from "vitest";
import { doubleSizes } from "./image-sizes";

describe("doubleSizes", () => {
  it("doubles slot widths but not media conditions", () => {
    expect(doubleSizes("(min-width: 1024px) 58vw, 100vw")).toBe("(min-width: 1024px) 116vw, 200vw");
    expect(doubleSizes("640px")).toBe("1280px");
    expect(doubleSizes("(min-width: 768px) 33.5vw, 50vw")).toBe("(min-width: 768px) 67vw, 100vw");
  });
});
