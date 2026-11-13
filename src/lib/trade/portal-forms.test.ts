import { describe, expect, it } from "vitest";
import { parseCustomer, parseProject, parseRoom } from "./portal-forms";

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe("customer", () => {
  it("normalises and keeps optional fields empty", () => {
    const r = parseCustomer(fd({ name: " Mrs Smith ", email: "Smith@Home.local", phone: "", address: "1 High St", postcode: "la94aa", notes: "" }));
    expect(r.ok && r.data).toEqual({ name: "Mrs Smith", email: "smith@home.local", phone: null, address: "1 High St", postcode: "LA9 4AA", notes: "" });
  });
  it("rejects bad details", () => {
    const r = parseCustomer(fd({ name: "", email: "x", postcode: "123", phone: "call me", address: "", notes: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["email", "name", "phone", "postcode"]);
  });
});

describe("project", () => {
  it("needs a name; customer optional", () => {
    expect(parseProject(fd({ name: "Smith house", customer_id: "", site_postcode: "", notes: "" })).ok).toBe(true);
    expect(parseProject(fd({ name: "", customer_id: "nope", site_postcode: "", notes: "" })).ok).toBe(false);
  });
});

describe("room", () => {
  it("reads metres in the ways people type them", () => {
    const r = (l: string, w: string) => parseRoom(fd({ room_name: "Kitchen", length_m: l, width_m: w, wastage_pct: "10", finish_id: "" }));
    expect(r("4.2", "3,6").ok && r("4.2", "3,6")).toMatchObject({ data: { length_m: 4.2, width_m: 3.6 } });
    expect(r("420cm", "3600mm")).toMatchObject({ data: { length_m: 4.2, width_m: 3.6 } });
    expect(r("4.2m", "3.6 m")).toMatchObject({ data: { length_m: 4.2, width_m: 3.6 } });
  });
  it("refuses impossible rooms and missing sizes", () => {
    for (const [l, w] of [["0", "3"], ["-4", "3"], ["4", ""], ["abc", "3"], ["2000", "3"]]) {
      expect(parseRoom(fd({ room_name: "Kitchen", length_m: l, width_m: w, wastage_pct: "10", finish_id: "" })).ok, `${l} × ${w}`).toBe(false);
    }
    expect(parseRoom(fd({ room_name: "Kitchen", length_m: "4", width_m: "3", wastage_pct: "60", finish_id: "" })).ok).toBe(false);
  });
});
