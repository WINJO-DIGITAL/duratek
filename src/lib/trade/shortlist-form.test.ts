import { describe, expect, it } from "vitest";
import { parseShortlist } from "./shortlist-form";

const A = "1d2ba501-f6ca-5a31-a44b-3d209f14f5f5";
const B = "6607308f-c648-5d98-aa64-34a93d5f4fc4";

describe("shortlist form", () => {
  it("parses and de-duplicates finishes", () => {
    const f = new FormData();
    f.set("name", " Smith kitchen ");
    f.append("finish_id", A);
    f.append("finish_id", B);
    f.append("finish_id", A);
    expect(parseShortlist(f)).toEqual({ ok: true, data: { name: "Smith kitchen", finish_ids: [A, B] } });
  });

  it("needs a name and a finish, and rejects bad ids", () => {
    const f = new FormData();
    f.append("finish_id", "not-an-id");
    const r = parseShortlist(f);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["finish_ids", "name"]);
  });
});
