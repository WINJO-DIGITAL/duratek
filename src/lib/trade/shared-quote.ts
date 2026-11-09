import "server-only";
import { isShareToken } from "@/lib/ids";
import { publicSupabase } from "@/lib/supabase/public";
import type { CustomerQuote } from "./customer-quote";
import type { QuoteStatus } from "./quote-status";

/** The customer's copy of a quote: sell prices only (shaped by get_shared_quote in SQL). */
export type SharedQuote = CustomerQuote & { status: Exclude<QuoteStatus, "draft"> };

export async function getSharedQuote(token: string): Promise<SharedQuote | null> {
  if (!isShareToken(token)) return null;
  const { data, error } = await publicSupabase().rpc("get_shared_quote", { p_token: token });
  if (error || !data) return null;
  const q = data as unknown as SharedQuote;
  return { ...q, lines: q.lines.map((l) => ({ ...l, quantity: Number(l.quantity) })) };
}
