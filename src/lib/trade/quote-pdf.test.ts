import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import type { CustomerQuote } from "./customer-quote";
import { quotePdf } from "./quote-pdf";

/** The text drawn on the pages (pdf-lib writes Flate-compressed streams of hex strings). */
function pdfText(bytes: Uint8Array): string {
  const raw = Buffer.from(bytes).toString("latin1");
  let out = "";
  const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  for (let m; (m = re.exec(raw)); ) {
    try {
      out += inflateSync(Buffer.from(m[1], "latin1")).toString("latin1");
    } catch {}
  }
  return out.replace(/<([0-9A-Fa-f]+)>/g, (_, h: string) => Buffer.from(h, "hex").toString("latin1"));
}

const quote: CustomerQuote = {
  reference: "Q-0007",
  status: "sent",
  customer_name: "Mrs Smith",
  site_address: "1 High Street, Kendal",
  site_postcode: "LA9 4AA",
  notes: "Furniture moved by the customer.",
  valid_until: "2026-12-09",
  vat_rate_bp: 2000,
  issued_at: "2026-11-09T10:00:00Z",
  responded_at: null,
  trader: { company_name: "Lakeland Floors", contact_name: "Sam Fitter", phone: "01539 000000", email: "sam@lakeland.local", website: "https://lakeland.local", address: "2 Market Place", brand_colour: "#2B5D3A" },
  footer: "Payment within 14 days.",
  lines: [
    { kind: "flooring", finish_id: null, room_name: "Kitchen", description: "Keswick Oak, 10 packs of 2.21 m² (22.1 m²)", quantity: 10, unit: "pack", unit_sell_pence: 6875 },
    { kind: "labour", finish_id: null, room_name: "Kitchen", description: "Fitting", quantity: 20, unit: "m2", unit_sell_pence: 1500 },
    { kind: "delivery", finish_id: null, room_name: null, description: "Delivery", quantity: 1, unit: "item", unit_sell_pence: 3500 },
  ],
};

describe("quote PDF", () => {
  it("is a PDF with the trader's details, rooms, lines and totals", async () => {
    const bytes = await quotePdf(quote);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    const t = pdfText(bytes);
    for (const s of ["Lakeland Floors", "Q-0007", "Mrs Smith", "Kitchen", "General", "Keswick Oak", "£687.50", "£300.00", "£35.00", "£1,022.50", "£204.50", "£1,227.00", "Payment within 14 days.", "Valid until 9 December 2026"]) {
      expect(t, s).toContain(s);
    }
  });

  it("copes with characters the PDF font can't draw", async () => {
    const bytes = await quotePdf({ ...quote, notes: "Fitting ✓ on Monday 👍" });
    expect(pdfText(bytes)).toContain("Fitting ? on Monday ?");
  });

  it("runs onto more pages for a long quote, numbering them", async () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ ...quote.lines[1], description: `Line ${i + 1}` }));
    const t = pdfText(await quotePdf({ ...quote, lines: many }));
    expect(t).toMatch(/Page 2 of [2-9]/);
  });
});
