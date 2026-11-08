import "server-only";
import { traderTotals, type QuoteLineKind, type QuoteUnit, type TraderTotals } from "@/lib/pricing";
import { userSupabase } from "@/lib/supabase/server";
import { isUuid } from "@/lib/ids";

import type { QuoteStatus } from "./quote-status";

export { STATUS_LABELS, type QuoteStatus } from "./quote-status";

export interface QuoteLine {
  id: string;
  kind: QuoteLineKind;
  finishId: string | null;
  description: string;
  quantity: number;
  unit: QuoteUnit;
  unitCostPence: number;
  unitSellPence: number;
  areaM2: number | null;
  wastagePct: number | null;
}

export interface Quote {
  id: string;
  reference: string;
  status: QuoteStatus;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  siteAddress: string;
  sitePostcode: string | null;
  notes: string;
  validUntil: string | null;
  vatRateBp: number;
  shareToken: string;
  sentAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lines: QuoteLine[];
  totals: TraderTotals;
}

const SELECT =
  "id, reference, status, customer_name, customer_email, customer_phone, site_address, site_postcode, notes, valid_until, vat_rate_bp, share_token, sent_at, responded_at, created_at, updated_at, quote_lines (id, kind, finish_id, description, quantity, unit, unit_cost_pence, unit_sell_pence, area_m2, wastage_pct, sort_order, created_at)";

type Row = {
  id: string;
  reference: string;
  status: QuoteStatus;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  site_address: string;
  site_postcode: string | null;
  notes: string;
  valid_until: string | null;
  vat_rate_bp: number;
  share_token: string;
  sent_at: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  quote_lines: {
    id: string;
    kind: QuoteLineKind;
    finish_id: string | null;
    description: string;
    quantity: number;
    unit: QuoteUnit;
    unit_cost_pence: number;
    unit_sell_pence: number;
    area_m2: number | null;
    wastage_pct: number | null;
    sort_order: number;
    created_at: string;
  }[];
};

function toQuote(r: Row): Quote {
  const lines: QuoteLine[] = [...r.quote_lines]
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
    .map((l) => ({
      id: l.id,
      kind: l.kind,
      finishId: l.finish_id,
      description: l.description,
      quantity: Number(l.quantity),
      unit: l.unit,
      unitCostPence: l.unit_cost_pence,
      unitSellPence: l.unit_sell_pence,
      areaM2: l.area_m2 === null ? null : Number(l.area_m2),
      wastagePct: l.wastage_pct === null ? null : Number(l.wastage_pct),
    }));
  return {
    id: r.id,
    reference: r.reference,
    status: r.status,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    customerPhone: r.customer_phone,
    siteAddress: r.site_address,
    sitePostcode: r.site_postcode,
    notes: r.notes,
    validUntil: r.valid_until,
    vatRateBp: r.vat_rate_bp,
    shareToken: r.share_token,
    sentAt: r.sent_at,
    respondedAt: r.responded_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    lines,
    totals: traderTotals(lines, r.vat_rate_bp),
  };
}

/** The signed-in trader's quotes, newest first (RLS: own quotes, approved only). */
export async function listQuotes(): Promise<Quote[]> {
  const db = await userSupabase();
  const { data, error } = await db.from("quotes").select(SELECT).order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(`Failed to load quotes: ${error.message}`);
  return (data as unknown as Row[]).map(toQuote);
}

export async function getQuote(id: string): Promise<Quote | null> {
  if (!isUuid(id)) return null;
  const db = await userSupabase();
  const { data } = await db.from("quotes").select(SELECT).eq("id", id).maybeSingle();
  return data ? toQuote(data as unknown as Row) : null;
}
