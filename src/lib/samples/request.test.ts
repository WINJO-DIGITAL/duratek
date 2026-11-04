import { describe, expect, it } from "vitest";
import { readSampleForm, sampleRequestSchema } from "./request";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

function form(overrides: Record<string, string | string[]> = {}) {
  const f = new FormData();
  const base: Record<string, string | string[]> = {
    name: "Alex Smith",
    email: " Alex@Example.COM ",
    phone: "",
    address_line1: "1 High Street",
    address_line2: "",
    town: "Leeds",
    postcode: "ls11ur",
    finish_id: [id(1), id(2)],
    ...overrides,
  };
  for (const [k, v] of Object.entries(base)) (Array.isArray(v) ? v : [v]).forEach((x) => f.append(k, x));
  return f;
}

describe("sample request validation", () => {
  it("accepts a valid request and normalises it", () => {
    const r = sampleRequestSchema.safeParse(readSampleForm(form()));
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.email).toBe("alex@example.com");
    expect(r.data.postcode).toBe("LS1 1UR");
    expect(r.data.phone).toBeNull();
    expect(r.data.address_line2).toBeNull();
    expect(r.data.marketing_opt_in).toBe(false);
  });

  it("is opted in to marketing only when the box is ticked", () => {
    const r = sampleRequestSchema.safeParse(readSampleForm(form({ marketing_opt_in: "on" })));
    expect(r.success && r.data.marketing_opt_in).toBe(true);
  });

  it("rejects a bad postcode, email and phone with field messages", () => {
    const r = sampleRequestSchema.safeParse(readSampleForm(form({ postcode: "12345", email: "nope", phone: "abc" })));
    expect(r.success).toBe(false);
    if (r.success) return;
    const fields = r.error.issues.map((i) => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["postcode", "email", "phone"]));
  });

  it("enforces the sample limit, unique finishes and at least one", () => {
    const tooMany = sampleRequestSchema.safeParse(readSampleForm(form({ finish_id: [id(1), id(2), id(3), id(4)] })));
    const dupes = sampleRequestSchema.safeParse(readSampleForm(form({ finish_id: [id(1), id(1)] })));
    const none = sampleRequestSchema.safeParse(readSampleForm(form({ finish_id: [] })));
    expect(tooMany.success || dupes.success || none.success).toBe(false);
  });

  it("requires name, first address line and town", () => {
    const r = sampleRequestSchema.safeParse(readSampleForm(form({ name: " ", address_line1: "", town: "" })));
    expect(r.success).toBe(false);
  });
});
