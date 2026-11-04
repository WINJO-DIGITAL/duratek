import { describe, expect, it } from "vitest";
import { addSample, parseSelection, removeSample } from "./selection";

const a = { id: "a", slug: "a", name: "A" };
const b = { id: "b", slug: "b", name: "B" };
const c = { id: "c", slug: "c", name: "C" };
const d = { id: "d", slug: "d", name: "D" };

describe("sample selection", () => {
  it("adds until the limit, then refuses with 'full'", () => {
    let items = [a, b];
    let r = addSample(items, c, 3);
    expect(r.result).toBe("added");
    items = r.next;
    r = addSample(items, d, 3);
    expect(r.result).toBe("full");
    expect(r.next).toBe(items);
  });

  it("does not add the same finish twice", () => {
    const r = addSample([a], a, 3);
    expect(r.result).toBe("already");
    expect(r.next).toHaveLength(1);
  });

  it("removes by id", () => {
    expect(removeSample([a, b], "a")).toEqual([b]);
  });

  it("parses stored data defensively", () => {
    expect(parseSelection("nonsense", 3)).toEqual([]);
    expect(parseSelection([a, { id: 1 }, a, b, c, d], 3)).toEqual([a, b, c]);
    expect(parseSelection([{ ...a, extra: "x" }], 3)).toEqual([a]);
  });
});
