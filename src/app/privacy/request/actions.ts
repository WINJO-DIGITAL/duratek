"use server";

import { headers } from "next/headers";
import { escapeHtml } from "@/lib/escape";
import { notify } from "@/lib/notify";
import { privacyRequestSchema, type PrivacyRequestState } from "@/lib/privacy";
import { clientKey, createLimiter } from "@/lib/rate-limit";
import { adminSupabase } from "@/lib/supabase/admin";

const ipAllowed = createLimiter({ max: 5, windowMs: 60 * 60 * 1000 });
const PER_EMAIL_PER_DAY = 2;

export async function submitPrivacyRequest(_prev: PrivacyRequestState, form: FormData): Promise<PrivacyRequestState> {
  const get = (k: string) => (typeof form.get(k) === "string" ? (form.get(k) as string) : "");
  const values = { email: get("email"), kind: get("kind"), details: get("details") };
  const fail = (message: string): PrivacyRequestState => ({ status: "error", message, errors: {}, values });

  const db = adminSupabase();
  if (!db) return fail("Online requests aren't open yet. Please email us instead.");
  if (get("company_website") !== "") return { status: "sent", email: values.email.trim() }; // honeypot

  const parsed = privacyRequestSchema.safeParse(values);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0] ?? "")] ??= i.message;
    return { status: "error", message: "Please check the highlighted fields.", errors, values };
  }
  const r = parsed.data;
  if (!ipAllowed(clientKey(await headers()))) return fail("Please try again in a little while.");
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await db.from("privacy_requests").select("id", { count: "exact", head: true }).eq("email", r.email).gte("created_at", dayAgo);
  if ((count ?? 0) >= PER_EMAIL_PER_DAY) return fail("We already have your request and will reply within one month.");

  const { data, error } = await db.from("privacy_requests").insert({ email: r.email, kind: r.kind, details: r.details }).select("id").single();
  if (error || !data) {
    console.error("Privacy request insert failed", error);
    return fail("Something went wrong on our side. Please try again.");
  }
  const owner = process.env.OWNER_NOTIFY_EMAIL;
  if (owner) {
    await notify(
      {
        kind: "privacy_owner",
        to: owner,
        replyTo: r.email,
        subject: `Privacy request (${r.kind}) from ${r.email}`,
        text: `A privacy request was received.\n\nFrom: ${r.email}\nType: ${r.kind}\n\n${r.details ?? ""}\n\nUK GDPR gives one month to respond. Verify who they are before sharing or deleting anything.`,
        html: `<p>A privacy request was received.</p><p>From: ${escapeHtml(r.email)}<br>Type: ${escapeHtml(r.kind)}</p><p>${escapeHtml(r.details ?? "")}</p><p>UK GDPR gives one month to respond. Verify who they are before sharing or deleting anything.</p>`,
        relatedTable: "privacy_requests",
        relatedId: data.id,
      },
      db,
    );
  }
  await notify(
    {
      kind: "privacy_received",
      to: r.email,
      subject: "We've received your privacy request",
      text: "We've received your request. We will check that it is you, then reply within one month.\n\nDuratek",
      html: "<p>We've received your request. We will check that it is you, then reply within one month.</p><p>Duratek</p>",
      relatedTable: "privacy_requests",
      relatedId: data.id,
    },
    db,
  );
  return { status: "sent", email: r.email };
}
