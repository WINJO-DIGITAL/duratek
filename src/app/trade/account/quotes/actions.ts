"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getFinishes } from "@/lib/catalogue";
import { requireApprovedTrade } from "@/lib/auth/trade";
import { escapeHtml, sendEmail } from "@/lib/email";
import { isUuid } from "@/lib/ids";
import { formatPence } from "@/lib/money";
import { createLimiter } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site";
import { userSupabase } from "@/lib/supabase/server";
import { getPreferences } from "@/lib/trade/preferences";
import { priceFlooring } from "@/lib/trade/flooring-server";
import { echo, parseFlooringLine, parseOtherLine, parseQuoteHeader, type FieldErrors } from "@/lib/trade/quote-forms";
import { getCustomer } from "@/lib/trade/portal";
import { getQuote } from "@/lib/trade/quotes";

export type QuoteFormState =
  | { status: "idle" }
  | { status: "saved"; message?: string }
  | { status: "error"; errors: FieldErrors; message?: string; values?: Record<string, string> };

/** The room a line belongs to, from the form; blank is none. */
const roomOf = (form: FormData) => String(form.get("room_name") ?? "").trim().slice(0, 120) || null;

const failed = (message: string, errors: FieldErrors = {}, form?: FormData): QuoteFormState => ({
  status: "error",
  errors,
  message,
  values: form ? echo(form) : undefined,
});
const quotePath = (id: string) => `/trade/account/quotes/${id}`;

/* Limits per trader. Creation is counted in the database (holds across
   instances); emails are limited in memory and in the database. */
const QUOTES_PER_DAY = 100;
const EMAILS_PER_DAY = 30;
const emailBurst = createLimiter({ max: 10, windowMs: 10 * 60 * 1000 });
const dayAgo = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

// ---------------------------------------------------------------------------
// Quote header
// ---------------------------------------------------------------------------
export async function createQuote(_prev: QuoteFormState, form: FormData): Promise<QuoteFormState> {
  const { account } = await requireApprovedTrade("/trade/account/quotes");
  await fillFromCustomer(form);
  const parsed = parseQuoteHeader(form);
  if (!parsed.ok) return failed("Please check the highlighted fields.", parsed.errors, form);

  const db = await userSupabase();
  const { count } = await db.from("quotes").select("id", { count: "exact", head: true }).gte("created_at", dayAgo());
  if ((count ?? 0) >= QUOTES_PER_DAY) return failed("That’s a lot of quotes today. Please try again tomorrow.", {}, form);

  const { data, error } = await db
    .from("quotes")
    .insert({ profile_id: account.userId, ...parsed.data })
    .select("id")
    .single();
  if (error || !data) return failed("Couldn’t create the quote. Please try again.", {}, form);
  redirect(quotePath(data.id));
}

/** Choosing a customer record fills in whatever the form left blank (read as the trader: their own customers only). */
async function fillFromCustomer(form: FormData) {
  const id = String(form.get("customer_id") ?? "");
  if (!isUuid(id)) return;
  const c = await getCustomer(id);
  if (!c) {
    form.set("customer_id", "");
    return;
  }
  const blank = (k: string) => !String(form.get(k) ?? "").trim();
  if (blank("customer_name")) form.set("customer_name", c.name);
  if (blank("customer_email") && c.email) form.set("customer_email", c.email);
  if (blank("customer_phone") && c.phone) form.set("customer_phone", c.phone);
  if (blank("site_address") && c.address) form.set("site_address", c.address);
  if (blank("site_postcode") && c.postcode) form.set("site_postcode", c.postcode);
}

export async function updateQuote(_prev: QuoteFormState, form: FormData): Promise<QuoteFormState> {
  await requireApprovedTrade("/trade/account/quotes");
  const id = String(form.get("quote_id") ?? "");
  if (!isUuid(id)) return failed("That quote wasn’t found.", {}, form);
  const parsed = parseQuoteHeader(form);
  if (!parsed.ok) return failed("Please check the highlighted fields.", parsed.errors, form);
  const db = await userSupabase();
  const { data, error } = await db.from("quotes").update(parsed.data).eq("id", id).select("id");
  if (error || !data?.length) return failed("Couldn’t save. Please try again.", {}, form);
  refresh();
  return { status: "saved", message: "Saved." };
}

// ---------------------------------------------------------------------------
// Lines
// ---------------------------------------------------------------------------
async function nextSortOrder(quoteId: string): Promise<number> {
  const db = await userSupabase();
  const { data } = await db.from("quote_lines").select("sort_order").eq("quote_id", quoteId).order("sort_order", { ascending: false }).limit(1);
  return (data?.[0]?.sort_order ?? 0) + 1;
}

export async function addFlooringLine(_prev: QuoteFormState, form: FormData): Promise<QuoteFormState> {
  await requireApprovedTrade("/trade/account/quotes");
  const quoteId = String(form.get("quote_id") ?? "");
  const quote = await getQuote(quoteId);
  if (!quote) return failed("That quote wasn’t found.", {}, form);
  const parsed = parseFlooringLine(form);
  if (!parsed.ok) return failed("Please check the highlighted fields.", parsed.errors, form);

  const [finishes, prefs] = await Promise.all([getFinishes(), getPreferences()]);
  const finish = finishes.find((f) => f.id === parsed.data.finish_id);
  if (!finish) return failed("Choose a finish from the range.", { finish_id: "Choose a finish." }, form);
  const built = await priceFlooring({
    finish,
    areaM2: parsed.data.area_m2,
    wastagePct: parsed.data.wastage_pct,
    sellPerM2Pence: parsed.data.sell_per_m2_pence,
    defaultMarkupBp: prefs.default_markup_bp,
  });
  if (!built.ok) {
    if (built.error === "no-price")
      return failed("There’s no trade price on your account for this finish yet. Enter your sell price per m².", {
        sell_per_m2_pence: "Enter your sell price per m².",
      }, form);
    return failed("This finish has no pack size on record yet. Add it as an ‘Other’ line instead.", {}, form);
  }

  const db = await userSupabase();
  const { error } = await db
    .from("quote_lines")
    .insert({ quote_id: quote.id, finish_id: finish.id, room_name: roomOf(form), sort_order: await nextSortOrder(quote.id), ...built.row });
  if (error) return failed("Couldn’t add the line. Please try again.", {}, form);
  refresh();
  return { status: "saved", message: `Added ${built.plan.packs} ${built.plan.packs === 1 ? "pack" : "packs"} of ${finish.name}.` };
}

export async function addOtherLine(_prev: QuoteFormState, form: FormData): Promise<QuoteFormState> {
  await requireApprovedTrade("/trade/account/quotes");
  const quoteId = String(form.get("quote_id") ?? "");
  if (!isUuid(quoteId)) return failed("That quote wasn’t found.", {}, form);
  const parsed = parseOtherLine(form);
  if (!parsed.ok) return failed("Please check the highlighted fields.", parsed.errors, form);
  const db = await userSupabase();
  const { error } = await db.from("quote_lines").insert({ quote_id: quoteId, room_name: roomOf(form), sort_order: await nextSortOrder(quoteId), ...parsed.data });
  if (error) return failed("Couldn’t add the line. Please try again.", {}, form);
  refresh();
  return { status: "saved", message: `Added ${parsed.data.description}.` };
}

export async function deleteLine(form: FormData) {
  await requireApprovedTrade("/trade/account/quotes");
  const quoteId = String(form.get("quote_id") ?? "");
  const lineId = String(form.get("line_id") ?? "");
  if (!isUuid(quoteId) || !isUuid(lineId)) redirect("/trade/account/quotes");
  const db = await userSupabase();
  await db.from("quote_lines").delete().eq("id", lineId).eq("quote_id", quoteId);
  redirect(quotePath(quoteId));
}

// ---------------------------------------------------------------------------
// Status, sharing, email
// ---------------------------------------------------------------------------
export async function setQuoteStatus(form: FormData) {
  await requireApprovedTrade("/trade/account/quotes");
  const id = String(form.get("quote_id") ?? "");
  const status = String(form.get("status") ?? "");
  if (!isUuid(id) || !["draft", "sent", "accepted", "declined"].includes(status)) redirect("/trade/account/quotes");
  const db = await userSupabase();
  const patch =
    status === "sent"
      ? { status: "sent" as const, sent_at: new Date().toISOString() }
      : { status: status as "draft" | "accepted" | "declined" };
  await db.from("quotes").update(patch).eq("id", id);
  redirect(`${quotePath(id)}?notice=${status}`);
}

/** Emails the customer a link to their copy of the quote (sell prices only). */
export async function emailQuote(form: FormData) {
  const { account } = await requireApprovedTrade("/trade/account/quotes");
  const id = String(form.get("quote_id") ?? "");
  const quote = await getQuote(id);
  if (!quote) redirect("/trade/account/quotes");
  const back = (notice: string) => redirect(`${quotePath(quote.id)}?notice=${notice}`);
  if (!quote.customerEmail) back("no-email");
  if (quote.lines.length === 0) back("empty");

  const db = await userSupabase();
  const { count } = await db.from("quotes").select("id", { count: "exact", head: true }).gte("sent_at", dayAgo());
  if (!emailBurst(account.userId) || (count ?? 0) >= EMAILS_PER_DAY) back("email-limit");

  const link = siteUrl(`/q/${quote.shareToken}`);
  const from = account.companyName || "Your fitter";
  const total = formatPence(quote.totals.totalPence);
  const ok = await sendEmail({
    to: quote.customerEmail!,
    replyTo: account.email || undefined,
    subject: `Your flooring quote ${quote.reference} from ${from}`,
    text: `Hello ${quote.customerName},\n\n${from} has sent you a quote for your Duratek flooring (${total}${quote.vatRateBp ? " including VAT" : ""}).\n\nView, print or accept it here:\n${link}\n\nReply to this email to contact ${from}.`,
    html: `<p>Hello ${escapeHtml(quote.customerName)},</p><p>${escapeHtml(from)} has sent you a quote for your Duratek flooring (${escapeHtml(total)}${quote.vatRateBp ? " including VAT" : ""}).</p><p><a href="${escapeHtml(link)}">View, print or accept your quote</a></p><p>Reply to this email to contact ${escapeHtml(from)}.</p>`,
  });
  if (!ok) back("email-failed");
  await db.from("quotes").update({ status: quote.status === "draft" ? "sent" : quote.status, sent_at: new Date().toISOString() }).eq("id", quote.id);
  back("emailed");
}

export async function deleteQuote(form: FormData) {
  await requireApprovedTrade("/trade/account/quotes");
  const id = String(form.get("quote_id") ?? "");
  if (form.get("confirm") !== "yes" || !isUuid(id)) redirect(id && isUuid(id) ? `${quotePath(id)}?notice=confirm` : "/trade/account/quotes");
  const db = await userSupabase();
  await db.from("quotes").delete().eq("id", id);
  redirect("/trade/account/quotes?notice=deleted");
}
