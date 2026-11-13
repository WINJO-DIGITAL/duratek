import type { QuoteLineKind, QuoteUnit } from "@/lib/pricing";
import type { QuoteStatus } from "./quote-status";

/**
 * The customer's copy of a quote. Deliberately has no cost, margin or
 * contingency fields: anything typed as this can't carry buying prices.
 */
export interface CustomerQuote {
  reference: string;
  status: QuoteStatus;
  customer_name: string;
  site_address: string;
  site_postcode: string | null;
  notes: string;
  valid_until: string | null;
  vat_rate_bp: number;
  issued_at: string;
  responded_at: string | null;
  trader: {
    company_name: string;
    contact_name: string;
    phone: string | null;
    email?: string | null;
    website?: string | null;
    address?: string | null;
    logo_path?: string | null;
    brand_colour?: string | null;
  };
  footer: string;
  lines: {
    kind: QuoteLineKind;
    finish_id: string | null;
    room_name?: string | null;
    description: string;
    quantity: number;
    unit: QuoteUnit;
    unit_sell_pence: number;
  }[];
}

export interface OwnQuoteForCopy {
  reference: string;
  status: QuoteStatus;
  customerName: string;
  siteAddress: string;
  sitePostcode: string | null;
  notes: string;
  validUntil: string | null;
  vatRateBp: number;
  sentAt: string | null;
  createdAt: string;
  respondedAt: string | null;
  lines: { kind: QuoteLineKind; finishId: string | null; roomName?: string | null; description: string; quantity: number; unit: QuoteUnit; unitSellPence: number; unitCostPence?: number }[];
}

export interface TraderBranding {
  companyName: string;
  contactName: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  logoPath: string | null;
  brandColour: string | null;
  footer: string;
}

/** The trader's own quote as their customer sees it. Costs are dropped field by field, never copied. */
export function toCustomerQuote(q: OwnQuoteForCopy, b: TraderBranding): CustomerQuote {
  return {
    reference: q.reference,
    status: q.status,
    customer_name: q.customerName,
    site_address: q.siteAddress,
    site_postcode: q.sitePostcode,
    notes: q.notes,
    valid_until: q.validUntil,
    vat_rate_bp: q.vatRateBp,
    issued_at: q.sentAt ?? q.createdAt,
    responded_at: q.respondedAt,
    trader: {
      company_name: b.companyName,
      contact_name: b.contactName,
      phone: b.phone,
      email: b.email,
      website: b.website,
      address: b.address,
      logo_path: b.logoPath,
      brand_colour: b.brandColour,
    },
    footer: b.footer,
    lines: q.lines.map((l) => ({
      kind: l.kind,
      finish_id: l.finishId,
      room_name: l.roomName ?? null,
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      unit_sell_pence: l.unitSellPence,
    })),
  };
}

/** Lines grouped by room, in first-seen order; lines with no room come last under "General". */
export function groupByRoom<T extends { room_name?: string | null }>(lines: T[]): { room: string | null; lines: T[] }[] {
  const groups: { room: string | null; lines: T[] }[] = [];
  for (const l of lines) {
    const room = l.room_name?.trim() || null;
    let g = groups.find((x) => x.room === room);
    if (!g) groups.push((g = { room, lines: [] }));
    g.lines.push(l);
  }
  return [...groups.filter((g) => g.room), ...groups.filter((g) => !g.room)];
}
