"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { escapeHtml, sendEmail } from "@/lib/email";
import { isShareToken } from "@/lib/ids";
import { clientKey, createLimiter } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site";
import { adminSupabase } from "@/lib/supabase/admin";
import { publicSupabase } from "@/lib/supabase/public";

const perAddress = createLimiter({ max: 10, windowMs: 60 * 60 * 1000 });

/** The customer accepts or declines. Only a sent quote can change, once (enforced in SQL). */
export async function respondToQuote(form: FormData) {
  const token = String(form.get("token") ?? "");
  const decision = String(form.get("decision") ?? "");
  if (!isShareToken(token) || !["accepted", "declined"].includes(decision)) redirect("/");
  if (!perAddress(clientKey(await headers()))) redirect(`/q/${token}?notice=busy`);

  const { data } = await publicSupabase().rpc("respond_to_quote", { p_token: token, p_decision: decision });
  if (data) await tellTrader(token, data);
  redirect(`/q/${token}?notice=${data ? "thanks" : "unchanged"}`);
}

/** Lets the trader know. Needs the service key to look up their email; skipped quietly without it. */
async function tellTrader(token: string, status: string) {
  const db = adminSupabase();
  if (!db) return;
  const { data: q } = await db.from("quotes").select("id, reference, customer_name, profile_id").eq("share_token", token).maybeSingle();
  if (!q) return;
  const { data: u } = await db.auth.admin.getUserById(q.profile_id);
  const to = u.user?.email;
  if (!to) return;
  const link = siteUrl(`/trade/account/quotes/${q.id}`);
  const verb = status === "accepted" ? "accepted" : "declined";
  await sendEmail({
    to,
    subject: `${q.customer_name} ${verb} quote ${q.reference}`,
    text: `${q.customer_name} has ${verb} quote ${q.reference}.\n\n${link}\n\nDuratek`,
    html: `<p>${escapeHtml(q.customer_name)} has ${verb} quote ${escapeHtml(q.reference)}.</p><p><a href="${escapeHtml(link)}">Open the quote</a></p><p>Duratek</p>`,
  });
}
