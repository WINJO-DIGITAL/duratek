import { describe, expect, it } from "vitest";
import { enquirySchema, readEnquiryForm, STOCKIST_CONSENT_WORDING } from "./enquiry";

const base = {
  kind: "contact" as const,
  stockist_id: null,
  finish_id: null,
  name: "Jane Public",
  email: "Jane@Example.com ",
  phone: "",
  postcode: "",
  message: "Do you have a stockist in Kendal?",
  wants_contact: true,
  share_with_stockist: false,
};
const stockistId = "11111111-1111-4111-8111-111111111111";

describe("enquirySchema", () => {
  it("accepts a general enquiry and normalises the email", () => {
    const r = enquirySchema.parse(base);
    expect(r.email).toBe("jane@example.com");
    expect(r.phone).toBeNull();
    expect(r.postcode).toBeNull();
  });
  it("normalises a postcode and rejects a bad one", () => {
    expect(enquirySchema.parse({ ...base, postcode: "la9 4aa" }).postcode).toBe("LA9 4AA");
    expect(enquirySchema.safeParse({ ...base, postcode: "nowhere" }).success).toBe(false);
  });
  it("needs a name, a valid email and a message", () => {
    expect(enquirySchema.safeParse({ ...base, name: " " }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...base, email: "nope" }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...base, message: "" }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...base, message: "x".repeat(2001) }).success).toBe(false);
  });
  it("asks for consent before an enquiry is passed to a stockist", () => {
    const r = enquirySchema.safeParse({ ...base, kind: "stockist", stockist_id: stockistId });
    expect(r.success).toBe(false);
    expect(enquirySchema.safeParse({ ...base, kind: "stockist", stockist_id: stockistId, share_with_stockist: true }).success).toBe(true);
  });
  it("needs a stockist for a stockist enquiry", () => {
    expect(enquirySchema.safeParse({ ...base, kind: "stockist", share_with_stockist: true }).success).toBe(false);
  });
});

describe("readEnquiryForm", () => {
  it("derives the kind from what the form carries", () => {
    const f = new FormData();
    f.set("stockist_id", stockistId);
    expect(readEnquiryForm(f).kind).toBe("stockist");
    const g = new FormData();
    g.set("finish_id", stockistId);
    expect(readEnquiryForm(g).kind).toBe("product");
    expect(readEnquiryForm(new FormData()).kind).toBe("contact");
  });
  it("ignores an id that isn't a uuid", () => {
    const f = new FormData();
    f.set("stockist_id", "'; drop table");
    expect(readEnquiryForm(f).stockist_id).toBeNull();
  });
});

describe("consent wording", () => {
  it("names the stockist and what is shared", () => {
    expect(STOCKIST_CONSENT_WORDING("Verified Floors")).toContain("Verified Floors");
    expect(STOCKIST_CONSENT_WORDING("Verified Floors")).toContain("message");
  });
});
