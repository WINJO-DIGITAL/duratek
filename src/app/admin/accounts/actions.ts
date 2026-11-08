"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { PERMISSIONS, type AccountRole, type Permission } from "@/lib/auth/permissions";
import { escapeHtml, sendEmail } from "@/lib/email";
import { isUuid } from "@/lib/ids";
import { siteUrl } from "@/lib/site";
import { adminSupabase } from "@/lib/supabase/admin";
import { userSupabase } from "@/lib/supabase/server";

const DECISIONS = ["approve", "reject", "suspend", "reinstate", "retier"] as const;
type Decision = (typeof DECISIONS)[number];

const back = (filter: string, notice: string): never => redirect(`/admin/accounts?filter=${encodeURIComponent(filter)}&notice=${notice}`);

/**
 * Account decisions. The database checks them again (only account managers
 * change status or tier; nobody changes their own), and every change lands
 * in the audit log with who made it.
 */
export async function reviewAccount(form: FormData) {
  const admin = await requireAdmin("manage_accounts", "/admin/accounts");
  const id = String(form.get("id") ?? "");
  const decision = String(form.get("decision") ?? "") as Decision;
  const tier = String(form.get("tier") ?? "");
  const reason = String(form.get("reason") ?? "").trim().slice(0, 1000) || null;
  const filter = String(form.get("filter") ?? "pending");
  if (!isUuid(id) || !DECISIONS.includes(decision)) back(filter, "invalid");
  if (id === admin.userId) back(filter, "self");
  if ((decision === "approve" || decision === "retier") && !isUuid(tier)) back(filter, "tier");
  if ((decision === "reject" || decision === "suspend") && !reason) back(filter, "reason");

  const patch =
    decision === "approve"
      ? { status: "approved" as const, tier_id: tier, status_reason: null }
      : decision === "retier"
        ? { tier_id: tier }
        : decision === "reinstate"
          ? { status: "approved" as const, status_reason: null }
          : { status: decision === "reject" ? ("rejected" as const) : ("suspended" as const), status_reason: reason };

  const db = await userSupabase();
  const { data, error } = await db.from("profiles").update(patch).eq("id", id).select("id");
  if (error || !data?.length) back(filter, "error");

  if (decision === "approve") await sendApprovalEmail(id);
  back(filter, { approve: "approved", reject: "rejected", suspend: "suspended", reinstate: "reinstated", retier: "saved" }[decision]);
}

/** Role and permissions: super administrators only (checked here and in the database). */
export async function setRole(form: FormData) {
  const admin = await requireAdmin("manage_accounts", "/admin/accounts");
  const filter = String(form.get("filter") ?? "staff");
  if (admin.role !== "super_admin") back(filter, "super");
  const id = String(form.get("id") ?? "");
  const role = String(form.get("role") ?? "") as AccountRole;
  if (!isUuid(id) || !["super_admin", "admin", "trade", "stockist"].includes(role)) back(filter, "invalid");
  if (id === admin.userId) back(filter, "self");
  const wanted = new Set(
    form.getAll("permission").map(String).filter((p): p is Permission => PERMISSIONS.some((x) => x.value === p)),
  );

  const db = await userSupabase();
  const { error } = await db.from("profiles").update({ role }).eq("id", id);
  if (error) back(filter, "error");

  const { data: current } = await db.from("admin_permissions").select("permission").eq("profile_id", id);
  const have = new Set((current ?? []).map((r) => r.permission as Permission));
  const keep = role === "admin" ? wanted : new Set<Permission>();
  const remove = [...have].filter((p) => !keep.has(p));
  const add = [...keep].filter((p) => !have.has(p));
  if (remove.length) {
    const { error: e } = await db.from("admin_permissions").delete().eq("profile_id", id).in("permission", remove);
    if (e) back(filter, "error");
  }
  if (add.length) {
    const { error: e } = await db.from("admin_permissions").insert(add.map((permission) => ({ profile_id: id, permission })));
    if (e) back(filter, "error");
  }
  back(filter, "role");
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
