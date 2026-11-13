import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import { formatPence } from "@/lib/money";
import { customerTotals, formatBp, formatQuantity, lineSell } from "@/lib/pricing";
import { groupByRoom, type CustomerQuote } from "./customer-quote";

/**
 * A quotation PDF in the trader's own branding, from the customer copy only.
 * The input type has no cost fields, so a PDF can't carry buying prices.
 */

const A4 = { w: 595.28, h: 841.89 };
const M = 48; // margin
const NAVY = rgb(0x18 / 255, 0x36 / 255, 0x4c / 255);
const MUTED = rgb(0x5a / 255, 0x6b / 255, 0x78 / 255);
const LINE = rgb(0.9, 0.87, 0.82);

function hexToRgb(hex: string | null | undefined): RGB {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return NAVY;
  const n = parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Standard PDF fonts cover WinAnsi only: replace anything else rather than fail. */
function safe(font: PDFFont, text: string): string {
  let out = "";
  for (const ch of text.replace(/\s+/g, " ")) {
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      out += ch === " " || ch === " " ? " " : "?";
    }
  }
  return out;
}

function wrap(font: PDFFont, text: string, size: number, width: number): string[] {
  const words = safe(font, text).split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= width) line = next;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });

export async function quotePdf(q: CustomerQuote, logo?: { bytes: Uint8Array; type: "png" | "jpg" } | null): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Quotation ${q.reference}`);
  doc.setAuthor(q.trader.company_name);
  doc.setSubject(`Quotation for ${q.customer_name}`);
  doc.setProducer("Duratek trade quotations");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const brand = hexToRgb(q.trader.brand_colour);

  let image: PDFImage | null = null;
  if (logo) {
    try {
      image = logo.type === "png" ? await doc.embedPng(logo.bytes) : await doc.embedJpg(logo.bytes);
    } catch {
      image = null; // a broken logo never stops the quote
    }
  }

  let page: PDFPage = doc.addPage([A4.w, A4.h]);
  let y = A4.h - M;
  const right = A4.w - M;
  const text = (s: string, x: number, yy: number, size = 10, font = regular, color = NAVY) =>
    page.drawText(safe(font, s), { x, y: yy, size, font, color });
  const textRight = (s: string, xr: number, yy: number, size = 10, font = regular, color = NAVY) => {
    const t = safe(font, s);
    page.drawText(t, { x: xr - font.widthOfTextAtSize(t, size), y: yy, size, font, color });
  };
  const newPage = () => {
    page = doc.addPage([A4.w, A4.h]);
    y = A4.h - M;
    text(`${q.trader.company_name} · Quotation ${q.reference} (continued)`, M, y, 9, regular, MUTED);
    y -= 24;
  };
  const need = (h: number) => {
    if (y - h < M + 40) newPage();
  };

  // Brand rule
  page.drawRectangle({ x: 0, y: A4.h - 6, width: A4.w, height: 6, color: brand });

  // Header: logo or name, then contact details; quote details on the right.
  const top = y;
  if (image) {
    const scale = Math.min(150 / image.width, 56 / image.height, 1);
    const w = image.width * scale;
    const h = image.height * scale;
    page.drawImage(image, { x: M, y: top - h, width: w, height: h });
    y = top - h - 10;
    text(q.trader.company_name, M, y, 11, bold);
  } else {
    text(q.trader.company_name, M, top - 14, 18, bold);
    y = top - 22;
  }
  y -= 14;
  for (const line of [q.trader.contact_name, q.trader.address, [q.trader.phone, q.trader.email].filter(Boolean).join(" · "), q.trader.website?.replace(/^https:\/\//, "")]) {
    if (line) {
      text(line, M, y, 9, regular, MUTED);
      y -= 12;
    }
  }
  textRight("QUOTATION", right, top - 12, 10, bold, brand);
  textRight(q.reference, right, top - 28, 14, bold);
  textRight(dateFmt.format(new Date(q.issued_at)), right, top - 44, 9, regular, MUTED);
  if (q.valid_until) textRight(`Valid until ${dateFmt.format(new Date(q.valid_until))}`, right, top - 57, 9, regular, MUTED);

  y = Math.min(y, top - 70) - 16;
  page.drawLine({ start: { x: M, y }, end: { x: right, y }, thickness: 0.6, color: LINE });
  y -= 22;
  text("Prepared for", M, y, 9, regular, MUTED);
  y -= 14;
  text(q.customer_name, M, y, 11, bold);
  const site = [q.site_address, q.site_postcode].filter(Boolean).join(", ");
  if (site) {
    for (const l of wrap(regular, site, 10, 300)) {
      y -= 13;
      text(l, M, y, 10, regular, MUTED);
    }
  }
  y -= 26;

  // Lines, grouped by room
  const col = { qty: right - 200, each: right - 100, amount: right };
  const head = () => {
    text("Item", M, y, 9, bold, MUTED);
    textRight("Quantity", col.qty + 40, y, 9, bold, MUTED);
    textRight("Each", col.each + 20, y, 9, bold, MUTED);
    textRight("Amount", col.amount, y, 9, bold, MUTED);
    y -= 8;
    page.drawLine({ start: { x: M, y }, end: { x: right, y }, thickness: 0.6, color: LINE });
    y -= 16;
  };
  head();
  for (const g of groupByRoom(q.lines)) {
    need(40);
    if (g.room || groupByRoom(q.lines).length > 1) {
      text(g.room ?? "General", M, y, 10, bold, brand);
      y -= 16;
    }
    for (const l of g.lines) {
      const desc = wrap(regular, l.description, 10, col.qty - M - 60);
      need(desc.length * 13 + 8);
      text(desc[0], M, y, 10);
      textRight(formatQuantity(l.quantity, l.unit), col.qty + 40, y, 10);
      textRight(formatPence(l.unit_sell_pence), col.each + 20, y, 10);
      textRight(formatPence(lineSell({ quantity: l.quantity, unitSellPence: l.unit_sell_pence })), col.amount, y, 10);
      for (const extra of desc.slice(1)) {
        y -= 13;
        text(extra, M, y, 10);
      }
      y -= 18;
    }
  }

  // Totals
  const t = customerTotals(
    q.lines.map((l) => ({ quantity: l.quantity, unitSellPence: l.unit_sell_pence })),
    q.vat_rate_bp,
  );
  need(80);
  page.drawLine({ start: { x: col.qty - 40, y: y + 8 }, end: { x: right, y: y + 8 }, thickness: 0.6, color: LINE });
  y -= 8;
  const totalRow = (label: string, value: string, strong = false) => {
    text(label, col.qty - 40, y, strong ? 11 : 10, strong ? bold : regular, strong ? NAVY : MUTED);
    textRight(value, right, y, strong ? 12 : 10, strong ? bold : regular);
    y -= strong ? 20 : 16;
  };
  if (q.vat_rate_bp > 0) {
    totalRow("Subtotal", formatPence(t.subtotalPence));
    totalRow(`VAT at ${formatBp(q.vat_rate_bp)}`, formatPence(t.vatPence));
    totalRow("Total", formatPence(t.totalPence), true);
  } else {
    totalRow("Total", formatPence(t.subtotalPence), true);
  }

  // Notes and terms
  for (const [label, body] of [
    ["Notes", q.notes],
    ["Terms", q.footer],
  ] as const) {
    if (!body) continue;
    y -= 10;
    need(40);
    text(label, M, y, 9, bold, MUTED);
    y -= 14;
    for (const para of body.split(/\n+/)) {
      for (const l of wrap(regular, para, 10, right - M)) {
        need(14);
        text(l, M, y, 10);
        y -= 13;
      }
    }
  }

  // Footer on every page
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const s = safe(regular, `Flooring: Duratek. Quotation from ${q.trader.company_name}.   Page ${i + 1} of ${pages.length}`);
    p.drawText(s, { x: M, y: 28, size: 8, font: regular, color: MUTED });
  });

  return doc.save();
}
