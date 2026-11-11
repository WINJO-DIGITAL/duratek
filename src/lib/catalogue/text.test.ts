import { describe, expect, it } from "vitest";
import { splitLead } from "./text";

describe("splitLead", () => {
  it("takes the first sentence as the lead", () => {
    expect(splitLead("A light oak. It suits kitchens well.\n\nAnd hallways.")).toEqual({
      lead: "A light oak.",
      rest: "It suits kitchens well.\n\nAnd hallways.",
    });
  });
  it("has no rest for a single sentence", () => {
    expect(splitLead("Just one sentence.")).toEqual({ lead: "Just one sentence.", rest: "" });
  });
  it("copes with no full stop", () => {
    expect(splitLead("No full stop")).toEqual({ lead: "No full stop", rest: "" });
  });
  it("copes with empty text", () => {
    expect(splitLead("")).toEqual({ lead: "", rest: "" });
  });
});
