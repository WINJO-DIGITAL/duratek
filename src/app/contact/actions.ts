"use server";

import { headers } from "next/headers";
import { escapeHtml } from "@/lib/email";
import {
  ENQUIRY_FIELDS,
  enquirySchema,
  readEnquiryForm,
  STOCKIST_CONSENT_WORDING,
  type EnquiryState,
} from "@/lib/enquiries/enquiry";
import { notify } from "@/lib/notify";
import { clientKey, createLimiter } from "@/lib/rate-limit";
import { adminSupabase } from "@/lib/supabase/admin";

/* Per address: best effort in memory. Per email and site-wide: counted in the database, so they hold across instances. */
const ipAllowed = createLimiter({ max: 5, windowMs: 60 * 60 * 1000 });
const PER_EMAIL_PER_DAY = 3;
const SITE_WIDE_PER_HOUR = 60;

export async function submitEnquiry(_prev: EnquiryState, form: FormData): Promise<EnquiryState> {
  const raw = readEnquiryForm(form);
  const values: Record<string, string> = {
    ...Object.fromEntries(ENQUIRY_FIELDS.map((f) => [f, raw[f]])),
    stockist_id: raw.stockist_id ?? "",
    finish_id: raw.finish_id ?? "",
    wants_contact: raw.wants_contact ? "on" : "",
    share_with_stockist: raw.share_with_stockist ? "on" : "",
  };
  const fail = (message: string): EnquiryState => ({ status: "error", message, errors: {}, values });

  const db = adminSupabase();
  if (!db) return fail("Online enquiries aren't open yet. Please contact us by phone or email instead.");

  // Honeypot: real people never see or fill this field. Pretend success.
  if (typeof form.get("company_website") === "string" && form.get("company_website") !== "") {
    return { status: "sent", forwarded: false, stockistName: null, email: raw.email.trim() };
  }

  const parsed = enquirySchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return { status: "error", message: "Please check the highlighted fields.", errors, values };
  }
  const enq = parsed.data;

  if (!ipAllowed(clientKey(await headers()))) return fail("We've had a lot of messages just now. Please try again in a little while.");
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const [byEmail, siteWide] = await Promise.all([
    db.from("enquiries").select("id", { count: "exact", head: true }).eq("email", enq.email).gte("created_at", dayAgo),
    db.from("enquiries").select("id", { count: "exact", head: true }).gte("created_at", hourAgo),
  ]);
  if (byEmail.error || siteWide.error) {
    console.error("Enquiry rate check failed", byEmail.error ?? siteWide.error);
    return fail("Something went wrong on our side. Please try again.");
  }
  if ((byEmail.count ?? 0) >= PER_EMAIL_PER_DAY) return fail("We've already received your messages today. We'll reply as soon as we can.");
  if ((siteWide.count ?? 0) >= SITE_WIDE_PER_HOUR) return fail("We've had a lot of messages just now. Please try again in a little while.");

  // The stockist must be live (published and verified); the finish must be one we show.
  let stockist: { id: string; name: string; leadEmail: string | null } | null = null;
  if (enq.stockist_id) {
    const { data } = await db
      .from("stockists")
      .select("id, name, published, verified_at, stockist_private (lead_email)")
      .eq("id", enq.stockist_id)
      .maybeSingle();
    if (!data || !data.published || !data.verified_at) return fail("That stockist isn't available for enquiries. Please choose another, or contact us.");
    const priv = Array.isArray(data.stockist_private) ? data.stockist_private[0] : data.stockist_private;
    stockist = { id: data.id, name: data.name, leadEmail: priv?.lead_email ?? null };
  }
  let finishName: string | null = null;
  if (enq.finish_id) {
    const { data } = await db.from("finishes").select("name").eq("id", enq.finish_id).eq("published", true).maybeSingle();
    if (!data) return fail("That finish isn't available. Please choose another, or contact us.");
    finishName = data.name;
  }

  const { data: row, error } = await db
    .from("enquiries")
    .insert({
      kind: enq.kind,
      stockist_id: stockist?.id ?? null,
      finish_id: enq.finish_id,
      name: enq.name,
      email: enq.email,
      phone: enq.phone,
      postcode: enq.postcode,
      message: enq.message,
      wants_contact: enq.wants_contact,
      share_with_stockist: enq.share_with_stockist,
    })
    .select("id")
    .single();
  if (error || !row) {
    console.error("Enquiry insert failed", error);
    return fail("Something went wrong on our side. Please try again.");
  }

  if (stockist && enq.share_with_stockist) {
    await db.from("consent_records").insert({
      email: enq.email,
      purpose: "stockist_contact",
      granted: true,
      wording: STOCKIST_CONSENT_WORDING(stockist.name),
      source: "enquiry",
      source_id: row.id,
    });
  }

  const summary = [
    `Name: ${enq.name}`,
    `Email: ${enq.email}`,
    `Phone: ${enq.phone ?? "-"}`,
    `Postcode: ${enq.postcode ?? "-"}`,
    finishName ? `Finish: ${finishName}` : null,
    `Asked to be contacted: ${enq.wants_contact ? "yes" : "no"}`,
    "",
    enq.message,
  ].filter((l): l is string => l !== null);
  const htmlSummary = `<p>${summary.map((l) => escapeHtml(l)).join("<br>")}</p>`;
  const what = stockist ? `for ${stockist.name}` : finishName ? `about ${finishName}` : "";

  // Forward to the stockist only with consent and only when we have somewhere to send it.
  let forwarded = false;
  if (stockist?.leadEmail && enq.share_with_stockist) {
    const result = await notify(
      {
        kind: "enquiry_stockist",
        to: stockist.leadEmail,
        replyTo: enq.email,
        subject: `Duratek enquiry from ${enq.name}`,
        text: `A customer asked Duratek to pass this message to you. Please reply to them directly.\n\n${summary.join("\n")}`,
        html: `<p>A customer asked Duratek to pass this message to you. Please reply to them directly.</p>${htmlSummary}`,
        relatedTable: "enquiries",
        relatedId: row.id,
      },
      db,
    );
    forwarded = result === "sent";
    if (forwarded) await db.from("enquiries").update({ forwarded_at: new Date().toISOString() }).eq("id", row.id);
  }

  const owner = process.env.OWNER_NOTIFY_EMAIL;
  if (owner) {
    await notify(
      {
        kind: "enquiry_owner",
        to: owner,
        replyTo: enq.email,
        subject: `New enquiry ${what}`.trim(),
        text: `New enquiry${stockist ? ` for ${stockist.name}` : ""}\n\n${summary.join("\n")}\n\n${forwarded ? "Forwarded to the stockist." : stockist ? "Not forwarded to the stockist: pass it on from the Enquiries screen." : ""}`,
        html: `<p><strong>New enquiry ${escapeHtml(what)}</strong></p>${htmlSummary}<p>${forwarded ? "Forwarded to the stockist." : stockist ? "Not forwarded to the stockist: pass it on from the Enquiries screen." : ""}</p>`,
        relatedTable: "enquiries",
        relatedId: row.id,
      },
      db,
    );
  }
  await notify(
    {
      kind: "enquiry_received",
      to: enq.email,
      subject: "We've received your Duratek enquiry",
      text: `Hello ${enq.name},\n\nThank you for getting in touch. We've received your message${stockist ? ` for ${stockist.name}` : ""}.\n\n${enq.message}\n\nDuratek`,
      html: `<p>Hello ${escapeHtml(enq.name)},</p><p>Thank you for getting in touch. We've received your message${stockist ? ` for ${escapeHtml(stockist.name)}` : ""}.</p><p>${escapeHtml(enq.message)}</p><p>Duratek</p>`,
      relatedTable: "enquiries",
      relatedId: row.id,
    },
    db,
  );

  return { status: "sent", forwarded, stockistName: stockist?.name ?? null, email: enq.email };
}
