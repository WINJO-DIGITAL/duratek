"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getFinishes } from "@/lib/catalogue";
import { escapeHtml } from "@/lib/email";
import { notify } from "@/lib/notify";
import { readSampleForm, sampleRequestSchema, SAMPLE_FIELDS, type SampleRequestState } from "@/lib/samples/request";
import { samplesEnabled } from "@/lib/samples/settings";
import { adminSupabase } from "@/lib/supabase/admin";

/* Rate limits. Per address: best effort in memory on each server instance.
   Per email and site-wide: counted in the database, so they hold across instances. */
const PER_IP = { max: 5, windowMs: 60 * 60 * 1000 };
const PER_EMAIL_PER_DAY = 2;
const SITE_WIDE_PER_HOUR = 60;
const recentByIp = new Map<string, number[]>();

function ipAllowed(ipHash: string): boolean {
  const now = Date.now();
  const recent = (recentByIp.get(ipHash) ?? []).filter((t) => now - t < PER_IP.windowMs);
  if (recent.length >= PER_IP.max) {
    recentByIp.set(ipHash, recent);
    return false;
  }
  recent.push(now);
  recentByIp.set(ipHash, recent);
  if (recentByIp.size > 5000) recentByIp.clear(); // bound memory
  return true;
}

type FormValues = Extract<SampleRequestState, { status: "error" }>["values"];

const busy = (values: FormValues): SampleRequestState => ({
  status: "error",
  message: "We've had a lot of sample requests just now. Please try again in a little while.",
  errors: {},
  values,
});

export async function requestSamples(_prev: SampleRequestState, form: FormData): Promise<SampleRequestState> {
  const raw = readSampleForm(form);
  const values = {
    ...Object.fromEntries(SAMPLE_FIELDS.map((f) => [f, raw[f]])),
    marketing_opt_in: raw.marketing_opt_in,
  };

  const db = adminSupabase();
  if (!samplesEnabled() || !db) {
    return { status: "error", message: "Online sample requests aren't open yet.", errors: {}, values };
  }

  // Honeypot: real people never see or fill this field. Pretend success.
  const firstName = raw.name.trim().split(/\s+/)[0] || "there";
  if (typeof form.get("company_website") === "string" && form.get("company_website") !== "") {
    return { status: "sent", firstName, email: raw.email.trim(), finishes: [] };
  }

  const parsed = sampleRequestSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return { status: "error", message: "Please check the highlighted fields.", errors, values };
  }
  const req = parsed.data;

  // Only published finishes can be requested.
  const finishes = await getFinishes();
  const chosen = req.finish_ids.map((id) => finishes.find((f) => f.id === id));
  if (chosen.some((f) => !f)) {
    return {
      status: "error",
      message: "One of your chosen finishes is no longer available. Please update your samples.",
      errors: { finish_ids: "Update your samples." },
      values,
    };
  }
  const names = chosen.map((f) => f!.name);

  // Samples that are out of stock just now. Checked here, from the database, not from what the browser sent.
  // (Forgiving before the admin migration: without the column every finish counts as available.)
  const { data: out, error: outError } = await db.from("finishes").select("name").in("id", req.finish_ids).eq("sample_available", false);
  if (!outError && out && out.length > 0) {
    return {
      status: "error",
      message: `Samples of ${out.map((f) => f.name).join(" and ")} aren't available just now. Please choose another finish.`,
      errors: { finish_ids: "Update your samples." },
      values,
    };
  }

  // Rate limits.
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex");
  if (!ipAllowed(ipHash)) return busy(values);

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const [byEmail, siteWide] = await Promise.all([
    db.from("sample_requests").select("id", { count: "exact", head: true }).eq("email", req.email).gte("created_at", dayAgo),
    db.from("sample_requests").select("id", { count: "exact", head: true }).gte("created_at", hourAgo),
  ]);
  if (byEmail.error || siteWide.error) {
    console.error("Sample request rate check failed", byEmail.error ?? siteWide.error);
    return { status: "error", message: "Something went wrong on our side. Please try again.", errors: {}, values };
  }
  if ((byEmail.count ?? 0) >= PER_EMAIL_PER_DAY) {
    return {
      status: "error",
      message: "We've already received sample requests from this email address today. They're on our list.",
      errors: {},
      values,
    };
  }
  if ((siteWide.count ?? 0) >= SITE_WIDE_PER_HOUR) return busy(values);

  // The same person asking again for the same finishes, or one address collecting many sets: refused kindly.
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [again, sameAddress] = await Promise.all([
    db
      .from("sample_requests")
      .select("id", { count: "exact", head: true })
      .eq("email", req.email)
      .overlaps("finish_ids", req.finish_ids)
      .in("status", ["new", "processing", "sent"])
      .gte("created_at", monthAgo),
    db
      .from("sample_requests")
      .select("id", { count: "exact", head: true })
      .eq("postcode", req.postcode)
      .ilike("address_line1", req.address_line1.replace(/[%_]/g, ""))
      .in("status", ["new", "processing", "sent"])
      .gte("created_at", monthAgo),
  ]);
  if (!again.error && (again.count ?? 0) > 0) {
    return {
      status: "error",
      message: "You've already asked for one of these samples in the last month. It's on our list, so there's no need to ask again.",
      errors: {},
      values,
    };
  }
  if (!sameAddress.error && (sameAddress.count ?? 0) >= 2) {
    return {
      status: "error",
      message: "We've already received sample requests for this address recently. Please contact us if you need more.",
      errors: {},
      values,
    };
  }

  const { data: saved, error } = await db.from("sample_requests").insert({
    name: req.name,
    email: req.email,
    phone: req.phone,
    address_line1: req.address_line1,
    address_line2: req.address_line2,
    town: req.town,
    postcode: req.postcode,
    finish_ids: req.finish_ids,
    marketing_opt_in: req.marketing_opt_in,
  }).select("id").single();
  if (error || !saved) {
    console.error("Sample request insert failed", error);
    return { status: "error", message: "Something went wrong on our side. Please try again.", errors: {}, values };
  }

  // Consent is recorded in the words the person saw, only when they ticked the box.
  if (req.marketing_opt_in) {
    await db.from("consent_records").insert({
      email: req.email,
      purpose: "marketing",
      granted: true,
      wording: "Send me occasional news from Duratek. You can unsubscribe at any time.",
      source: "sample_request",
      source_id: saved.id,
    });
  }

  await sendSampleEmails(req, names, saved.id);
  return { status: "sent", firstName: req.name.split(/\s+/)[0], email: req.email, finishes: names };
}

async function sendSampleEmails(
  req: ReturnType<typeof sampleRequestSchema.parse>,
  names: string[],
  requestId: string,
): Promise<void> {
  const address = [req.address_line1, req.address_line2, req.town, req.postcode].filter(Boolean).join(", ");
  const list = names.map((n) => `- ${n}`).join("\n");
  const htmlList = `<ul>${names.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>`;

  const customer = notify({
    kind: "sample_confirmation",
    relatedTable: "sample_requests",
    relatedId: requestId,
    to: req.email,
    subject: "Your Duratek sample request",
    text: `Hello ${req.name},\n\nThank you for requesting Duratek samples. We've received your request for:\n\n${list}\n\nThey'll be sent to: ${address}\n\nDuratek`,
    html: `<p>Hello ${escapeHtml(req.name)},</p><p>Thank you for requesting Duratek samples. We've received your request for:</p>${htmlList}<p>They'll be sent to: ${escapeHtml(address)}</p><p>Duratek</p>`,
  });

  const ownerTo = process.env.OWNER_NOTIFY_EMAIL;
  const owner = ownerTo
    ? notify({
        kind: "sample_owner",
        relatedTable: "sample_requests",
        relatedId: requestId,
        to: ownerTo,
        replyTo: req.email,
        subject: `New sample request: ${names.join(", ")}`,
        text: `New sample request\n\nName: ${req.name}\nEmail: ${req.email}\nPhone: ${req.phone ?? "-"}\nAddress: ${address}\nMarketing opt-in: ${req.marketing_opt_in ? "yes" : "no"}\n\nSamples:\n${list}`,
        html: `<p><strong>New sample request</strong></p><p>Name: ${escapeHtml(req.name)}<br>Email: ${escapeHtml(req.email)}<br>Phone: ${escapeHtml(req.phone ?? "-")}<br>Address: ${escapeHtml(address)}<br>Marketing opt-in: ${req.marketing_opt_in ? "yes" : "no"}</p><p>Samples:</p>${htmlList}`,
      })
    : Promise.resolve("not_configured" as const);

  // The request is saved either way; a failed email is logged, not shown.
  await Promise.all([customer, owner]);
}
