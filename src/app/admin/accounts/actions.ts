"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { escapeHtml, sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/site";
import { adminSupabase } from "@/lib/supabase/admin";
import { userSupabase } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Approve (with a tier), reject, or move an approved account to another tier. */
export async function reviewAccount(form: FormData) {
  const admin = await requireAdmin("/admin/accounts");
  const id = String(form.get("id") ?? "");
  const decision = String(form.get("decision") ?? "");
  const tier = String(form.get("tier") ?? "");
  if (!UUID.test(id) || !["approve", "reject", "retier"].includes(decision)) redirect("/admin/accounts?notice=invalid");
  if (id === admin.userId && decision === "reject") redirect("/admin/accounts?notice=self");
  if (decision !== "reject" && !UUID.test(tier)) redirect("/admin/accounts?notice=tier");

  const db = await userSupabase();
  const patch =
    decision === "approve"
      ? { status: "approved" as const, tier_id: tier }
      : decision === "retier"
        ? { tier_id: tier }
        : { status: "rejected" as const };
  const { error } = await db.from("profiles").update(patch).eq("id", id);
  if (error) redirect("/admin/accounts?notice=error");

  if (decision === "approve") await sendApprovalEmail(id);
  redirect(`/admin/accounts?notice=${decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "saved"}`);
}

/** Tells the applicant they can log in. A failed email is logged, not shown: the approval stands. */
async function sendApprovalEmail(userId: string): Promise<void> {
  const service = adminSupabase();
  if (!service) return;
  const { data } = await service.auth.admin.getUserById(userId);
  const email = data.user?.email;
  if (!email) return;
  const login = siteUrl("/trade/login");
  const name = String(data.user?.user_metadata?.contact_name ?? "").trim() || "there";
  await sendEmail({
    to: email,
    subject: "Your Duratek trade account is approved",
    text: `Hello ${name},\n\nYour Duratek trade account has been approved. Log in to see your prices:\n\n${login}\n\nDuratek`,
    html: `<p>Hello ${escapeHtml(name)},</p><p>Your Duratek trade account has been approved. <a href="${escapeHtml(login)}">Log in to see your prices</a>.</p><p>Duratek</p>`,
  });
}
