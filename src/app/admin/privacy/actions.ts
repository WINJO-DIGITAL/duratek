"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { isUuid } from "@/lib/ids";
import { privacyRequestSchema } from "@/lib/privacy";
import { userSupabase } from "@/lib/supabase/server";

const back = (notice: string, extra = ""): never => redirect(`/admin/privacy?notice=${notice}${extra}`);

/** Logs a request that arrived by email or post, so it has a due date and a record. */
export async function addPrivacyRequest(form: FormData) {
  await requireAdmin("manage_settings", "/admin/privacy");
  const parsed = privacyRequestSchema.safeParse({ email: form.get("email"), kind: form.get("kind"), details: form.get("details") ?? "" });
  if (!parsed.success) back("invalid");
  const db = await userSupabase();
  const { error } = await db.from("privacy_requests").insert(parsed.data!);
  back(error ? "error" : "added");
}

export async function updatePrivacyRequest(form: FormData) {
  const admin = await requireAdmin("manage_settings", "/admin/privacy");
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "");
  if (!isUuid(id) || !["new", "verifying", "done", "refused"].includes(status)) back("invalid");
  const note = String(form.get("outcome_note") ?? "").trim().slice(0, 1000) || null;
  const db = await userSupabase();
  const { error } = await db
    .from("privacy_requests")
    .update({
      status: status as "new" | "verifying" | "done" | "refused",
      outcome_note: note,
      handled_by: status === "done" || status === "refused" ? admin.userId : null,
      handled_at: status === "done" || status === "refused" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  back(error ? "error" : "saved");
}

/** Anonymises everything held against an email address. Irreversible, so it needs the box ticked. */
export async function erasePerson(form: FormData) {
  await requireAdmin("manage_settings", "/admin/privacy");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) back("invalid");
  if (form.get("confirm") !== "yes") back("confirm");
  const db = await userSupabase();
  const { data, error } = await db.rpc("erase_person_data", { p_email: email });
  if (error || !data) back("error");
  const r = data as { sample_requests: number; enquiries: number; consent_records: number; email_log: number };
  // Close any open erase request for this address.
  await db.from("privacy_requests").update({ status: "done", handled_at: new Date().toISOString(), outcome_note: "Erased" }).eq("email", email).eq("kind", "erase").in("status", ["new", "verifying"]);
  back("erased", `&s=${r.sample_requests}&e=${r.enquiries}&c=${r.consent_records}&l=${r.email_log}`);
}

export async function runRetention() {
  await requireAdmin("manage_settings", "/admin/privacy");
  const db = await userSupabase();
  const { data, error } = await db.rpc("purge_expired_personal_data");
  if (error || !data) back("error");
  const r = data as { sample_requests: number; enquiries: number; email_log: number; privacy_requests: number; rejected_accounts: number };
  back("retention", `&s=${r.sample_requests}&e=${r.enquiries}&l=${r.email_log}&a=${r.rejected_accounts}`);
}
