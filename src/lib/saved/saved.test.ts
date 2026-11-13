import { describe, expect, it } from "vitest";
import { compareHref, parseSaved, readCompare, SAVED_LIMIT, toggleSaved } from "./saved";

const item = (n: number) => ({ id: `id${n}`, slug: `s${n}`, name: `Finish ${n}` });

describe("saved finishes", () => {
  it("toggles, newest first, bounded", () => {
    let list = toggleSaved([], item(1));
    list = toggleSaved(list, item(2));
    expect(list.map((i) => i.id)).toEqual(["id2", "id1"]);
    expect(toggleSaved(list, item(1)).map((i) => i.id)).toEqual(["id2"]);
    let many = [] as ReturnType<typeof toggleSaved>;
    for (let n = 0; n < SAVED_LIMIT + 5; n++) many = toggleSaved(many, item(n));
    expect(many).toHaveLength(SAVED_LIMIT);
  });

  it("parses stored data defensively", () => {
    expect(parseSaved("nonsense")).toEqual([]);
    expect(parseSaved([item(1), { id: 3 }, item(1)])).toEqual([item(1)]);
  });
});

describe("compare links", () => {
  const known = new Set(["keswick-oak", "fellside-oak", "cartmel-oak", "honister-slate-grey"]);
  it("reads up to three known, distinct slugs", () => {
    expect(readCompare("keswick-oak,nope,Keswick-Oak,fellside-oak", known)).toEqual(["keswick-oak", "fellside-oak"]);
    expect(readCompare("keswick-oak,fellside-oak,cartmel-oak,honister-slate-grey", known)).toHaveLength(3);
    expect(readCompare(undefined, known)).toEqual([]);
    expect(readCompare(["keswick-oak", "cartmel-oak"], known)).toEqual(["keswick-oak", "cartmel-oak"]);
  });
  it("builds a link of at most three", () => {
    expect(compareHref(["a", "b", "c", "d"])).toBe("/compare?f=a,b,c");
  });
});
