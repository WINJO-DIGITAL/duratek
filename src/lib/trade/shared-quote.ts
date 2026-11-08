import "server-only";
import type { QuoteLineKind, QuoteUnit } from "@/lib/pricing";
import { isShareToken } from "@/lib/ids";
import { publicSupabase } from "@/lib/supabase/public";
import type { QuoteStatus } from "./quote-status";

/** The customer's copy of a quote: sell prices only (shaped by get_shared_quote in SQL). */
export interface SharedQuote {
  reference: string;
  status: Exclude<QuoteStatus, "draft">;
  customer_name: string;
  site_address: string;
  site_postcode: string | null;
  notes: string;
  valid_until: string | null;
  vat_rate_bp: number;
  issued_at: string;
  responded_at: string | null;
  trader: { company_name: string; contact_name: string; phone: string | null };
  footer: string;
  lines: { kind: QuoteLineKind; finish_id: string | null; description: string; quantity: number; unit: QuoteUnit; unit_sell_pence: number }[];
}

export async function getSharedQuote(token: string): Promise<SharedQuote | null> {
  if (!isShareToken(token)) return null;
  const { data, error } = await publicSupabase().rpc("get_shared_quote", { p_token: token });
  if (error || !data) return null;
  const q = data as unknown as SharedQuote;
  return { ...q, lines: q.lines.map((l) => ({ ...l, quantity: Number(l.quantity) })) };
}
