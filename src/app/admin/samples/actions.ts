"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { isUuid } from "@/lib/ids";
import { userSupabase } from "@/lib/supabase/server";

export async function setSampleStatus(form: FormData) {
  await requireAdmin("manage_samples", "/admin/samples");
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "");
  const back = String(form.get("filter") ?? "new");
  if (!isUuid(id) || !["new", "sent"].includes(status)) redirect("/admin/samples");
  const db = await userSupabase();
  await db
    .from("sample_requests")
    .update({ status: status as "new" | "sent", sent_at: status === "sent" ? new Date().toISOString() : null })
    .eq("id", id);
  redirect(`/admin/samples?filter=${["new", "sent", "all"].includes(back) ? back : "new"}`);
}
