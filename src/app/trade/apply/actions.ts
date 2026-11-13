"use server";

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { escapeHtml } from "@/lib/email";
import { notify } from "@/lib/notify";
import { siteUrl } from "@/lib/site";
import { adminSupabase } from "@/lib/supabase/admin";
import {
  readTradeForm,
  TRADE_FIELDS,
  TRADE_TYPES,
  tradeApplicationSchema,
  type TradeApplication,
  type TradeApplicationState,
} from "@/lib/trade/application";
import { tradeApplicationsEnabled } from "@/lib/trade/settings";

/* Rate limits. Per address: best effort in memory on each server instance.
   Site-wide: counted in the database, so it holds across instances. */
const PER_IP = { max: 3, windowMs: 60 * 60 * 1000 };
const SITE_WIDE_PER_HOUR = 30;
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
  if (recentByIp.size > 5000) recentByIp.clear();
  return true;
}

const failed = (values: Extract<TradeApplicationState, { status: "error" }>["values"]): TradeApplicationState => ({
  status: "error",
  message: "Something went wrong on our side. Please try again.",
  errors: {},
  values,
});

export async function applyForTrade(_prev: TradeApplicationState, form: FormData): Promise<TradeApplicationState> {
  const raw = readTradeForm(form);
  const values = Object.fromEntries(TRADE_FIELDS.map((f) => [f, raw[f]]));
  const firstName = raw.contact_name.trim().split(/\s+/)[0] || "there";

  const db = adminSupabase();
  if (!tradeApplicationsEnabled() || !db) {
    return { status: "error", message: "Trade applications aren't open online yet.", errors: {}, values };
  }

  // Honeypot: people never see or fill it. Pretend success.
  const trap = form.get("company_website");
  if (typeof trap === "string" && trap !== "") return { status: "sent", firstName, email: raw.email.trim() };

  const parsed = tradeApplicationSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return { status: "error", message: "Please check the highlighted fields.", errors, values };
  }
  const app = parsed.data;

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  if (!ipAllowed(createHash("sha256").update(ip).digest("hex"))) {
    return {
      status: "error",
      message: "We've had several applications from here just now. Please try again in an hour.",
      errors: {},
      values,
    };
  }
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recent = await db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", hourAgo);
  if (recent.error) {
    console.error("Trade application rate check failed", recent.error);
    return failed(values);
  }
  if ((recent.count ?? 0) >= SITE_WIDE_PER_HOUR) {
    return { status: "error", message: "We're busy just now. Please try again in a little while.", errors: {}, values };
  }

  // Normal sign-up (anon key): the database trigger turns the new user into a
  // pending trade profile from these self-reported fields only. With email
  // confirmation on, an address that already has an account gets no error
  // here, so the form can't be used to find out who has an account.
  const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await auth.auth.signUp({
    email: app.email,
    password: app.password,
    options: {
      emailRedirectTo: siteUrl("/auth/confirm?next=/trade/account"),
      // Self-reported details only. The database re-checks each one and never
      // takes status, tier or role from here.
      data: {
        company_name: app.company_name,
        contact_name: app.contact_name,
        phone: app.phone,
        trade_type: app.trade_type,
        address_line1: app.address_line1,
        address_line2: app.address_line2,
        town: app.town,
        postcode: app.postcode,
        company_number: app.company_number,
        vat_number: app.vat_number,
        website: app.website,
        additional_info: app.additional_info,
      },
    },
  });
  if (error) {
    if (error.code === "user_already_exists" || /already registered/i.test(error.message)) {
      // Same outcome as a new application, so accounts can't be discovered.
      return { status: "sent", firstName: app.contact_name.split(/\s+/)[0], email: app.email };
    }
    if (error.code === "weak_password") {
      return { status: "error", message: "Please choose a stronger password.", errors: { password: error.message }, values };
    }
    console.error("Trade sign-up failed", error);
    return failed(values);
  }

  await sendApplicationEmails(app);
  return { status: "sent", firstName: app.contact_name.split(/\s+/)[0], email: app.email };
}

async function sendApplicationEmails(app: TradeApplication): Promise<void> {
  const type = TRADE_TYPES.find((t) => t.value === app.trade_type)?.label ?? app.trade_type;
  const applicant = notify({
    kind: "application_received",
    to: app.email,
    subject: "Your Duratek trade application",
    text: `Hello ${app.contact_name},\n\nThank you for applying for a Duratek trade account for ${app.company_name}. Please confirm your email address with the separate link we've sent, then we'll check your details and email you when your account is approved.\n\nDuratek`,
    html: `<p>Hello ${escapeHtml(app.contact_name)},</p><p>Thank you for applying for a Duratek trade account for ${escapeHtml(app.company_name)}. We'll check your details and email you when your account is approved.</p><p>Duratek</p>`,
  });
  const ownerTo = process.env.OWNER_NOTIFY_EMAIL;
  const owner = ownerTo
    ? notify({
        kind: "application_owner",
        to: ownerTo,
        replyTo: app.email,
        subject: `New trade application: ${app.company_name}`,
        text: `New trade application (pending approval)\n\nCompany: ${app.company_name}\nName: ${app.contact_name}\nEmail: ${app.email}\nPhone: ${app.phone}\nTrade: ${type}\nPostcode: ${app.postcode}\nCompany number: ${app.company_number || "-"}\nVAT number: ${app.vat_number || "-"}\n\nReview it at ${siteUrl("/admin/accounts")}`,
        html: `<p><strong>New trade application</strong> (pending approval)</p><p>Company: ${escapeHtml(app.company_name)}<br>Name: ${escapeHtml(app.contact_name)}<br>Email: ${escapeHtml(app.email)}<br>Phone: ${escapeHtml(app.phone)}<br>Trade: ${escapeHtml(type)}</p>`,
      })
    : Promise.resolve("not_configured" as const);
  // The application is saved either way; a failed email is logged, not shown.
  await Promise.all([applicant, owner]);
}
