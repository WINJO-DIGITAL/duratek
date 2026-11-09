import { describe, expect, it } from "vitest";
import { dispatchEmail } from "./dispatch-email";

const base = { name: "Jane", finishes: ["Keswick Oak", "Grizedale <Aged> Oak"], carrier: null, trackingRef: null, note: null };

describe("dispatchEmail", () => {
  it("lists the samples and promises no delivery date", () => {
    const m = dispatchEmail(base);
    expect(m.text).toContain("- Keswick Oak");
    expect(m.text).not.toMatch(/arrive|delivery date|tomorrow|working days/i);
  });
  it("includes carrier and tracking only when recorded", () => {
    expect(dispatchEmail(base).text).not.toContain("Tracking");
    const m = dispatchEmail({ ...base, carrier: "Royal Mail", trackingRef: "AB123" });
    expect(m.text).toContain("Sent with Royal Mail.");
    expect(m.text).toContain("Tracking reference: AB123.");
  });
  it("escapes anything typed by the admin or customer in the HTML", () => {
    const m = dispatchEmail({ ...base, name: "<b>x</b>", note: "<script>1</script>" });
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain("&lt;Aged&gt;");
  });
});
