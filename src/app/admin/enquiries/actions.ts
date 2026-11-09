"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { escapeHtml } from "@/lib/escape";
import { isUuid } from "@/lib/ids";
import { notify } from "@/lib/notify";
import { userSupabase } from "@/lib/supabase/server";

const FILTERS = ["new", "contacted", "closed", "spam", "all"];
const back: (filter: string, notice?: string) => never = (filter, notice) =>
  redirect(`/admin/enquiries?filter=${FILTERS.includes(filter) ? filter : "new"}${notice ? `&notice=${notice}` : ""}`);

export async function updateEnquiry(form: FormData) {
  const admin = await requireAdmin("manage_stockists", "/admin/enquiries");
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "");
  const filter = String(form.get("filter") ?? "new");
  const note = String(form.get("admin_note") ?? "").trim().slice(0, 2000) || null;
  if (!isUuid(id) || !["new", "contacted", "closed", "spam"].includes(status)) back(filter);
  const db = await userSupabase();
  const { error } = await db
    .from("enquiries")
    .update({
      status: status as "new" | "contacted" | "closed" | "spam",
      admin_note: note,
      handled_by: status === "new" ? null : admin.userId,
      handled_at: status === "new" ? null : new Date().toISOString(),
    })
    .eq("id", id);
  back(filter, error ? "error" : "saved");
}

/** Passes an enquiry to its stockist by email. Only with the customer's consent, and only once. */
export async function forwardEnquiry(form: FormData) {
  await requireAdmin("manage_stockists", "/admin/enquiries");
  const id = String(form.get("id") ?? "");
  const filter = String(form.get("filter") ?? "new");
  if (!isUuid(id)) back(filter);
  const db = await userSupabase();
  const { data: e } = await db
    .from("enquiries")
    .select("id, name, email, phone, postcode, message, share_with_stockist, forwarded_at, anonymised_at, stockist_id, stockists (name, published, verified_at, stockist_private (lead_email))")
    .eq("id", id)
    .maybeSingle();
  const stockist = e ? (Array.isArray(e.stockists) ? e.stockists[0] : e.stockists) : null;
  const priv = stockist ? (Array.isArray(stockist.stockist_private) ? stockist.stockist_private[0] : stockist.stockist_private) : null;
  if (!e || !stockist || !e.share_with_stockist || e.anonymised_at) back(filter, "not-allowed");
  if (e.forwarded_at) back(filter, "already");
  if (!priv?.lead_email) back(filter, "no-address");

  const lines = [`Name: ${e.name}`, `Email: ${e.email}`, `Phone: ${e.phone ?? "-"}`, `Postcode: ${e.postcode ?? "-"}`, "", e.message];
  const status = await notify(
    {
      kind: "enquiry_stockist",
      to: priv.lead_email,
      replyTo: e.email,
      subject: `Duratek enquiry from ${e.name}`,
      text: `A customer asked Duratek to pass this message to you. Please reply to them directly.\n\n${lines.join("\n")}`,
      html: `<p>A customer asked Duratek to pass this message to you. Please reply to them directly.</p><p>${lines.map((l) => escapeHtml(l)).join("<br>")}</p>`,
      relatedTable: "enquiries",
      relatedId: e.id,
    },
    db,
  );
  if (status === "sent") {
    await db.from("enquiries").update({ forwarded_at: new Date().toISOString() }).eq("id", id);
    back(filter, "forwarded");
  }
  back(filter, status === "not_configured" ? "no-email" : "email-failed");
}
