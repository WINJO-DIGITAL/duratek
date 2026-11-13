"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { parseDispatch } from "@/lib/admin/forms";
import { TAGS, getFinishes } from "@/lib/catalogue";
import { requireAdmin } from "@/lib/auth/admin";
import { isUuid } from "@/lib/ids";
import { notify } from "@/lib/notify";
import { dispatchEmail } from "@/lib/samples/dispatch-email";
import { userSupabase } from "@/lib/supabase/server";

const FILTERS = ["new", "sent", "cancelled", "all"];
const back: (filter: string, notice?: string) => never = (filter, notice) =>
  redirect(`/admin/samples?filter=${FILTERS.includes(filter) ? filter : "new"}${notice ? `&notice=${notice}` : ""}`);

/**
 * One action for every change to a request: start packing, mark sent (with
 * dispatch details and an optional email), cancel, or put back in the queue.
 */
export async function updateSample(form: FormData) {
  const admin = await requireAdmin("manage_samples", "/admin/samples");
  const id = String(form.get("id") ?? "");
  const intent = String(form.get("intent") ?? "");
  const filter = String(form.get("filter") ?? "new");
  if (!isUuid(id) || !["processing", "sent", "cancelled", "reopen"].includes(intent)) back(filter);
  const db = await userSupabase();

  if (intent === "sent") {
    const parsed = parseDispatch(form);
    if (!parsed.ok) back(filter, "invalid");
    const d = parsed.data;
    const { data: row, error } = await db
      .from("sample_requests")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        carrier: d.carrier,
        tracking_ref: d.tracking_ref,
        dispatch_note: d.dispatch_note,
        dispatched_by: admin.userId,
      })
      .eq("id", id)
      .select("name, email, finish_ids, customer_notified_at, anonymised_at")
      .maybeSingle();
    if (error || !row) back(filter, "error");

    // Email the customer once, only when asked, and only if their details haven't been erased.
    if (d.notify_customer && !row.customer_notified_at && !row.anonymised_at) {
      const finishes = await getFinishes();
      const names = row.finish_ids.map((fid) => finishes.find((f) => f.id === fid)?.name ?? "Duratek sample");
      const m = dispatchEmail({ name: row.name, finishes: names, carrier: d.carrier, trackingRef: d.tracking_ref, note: d.dispatch_note });
      const status = await notify({ kind: "sample_dispatched", to: row.email, relatedTable: "sample_requests", relatedId: id, ...m }, db);
      if (status === "sent") {
        await db.from("sample_requests").update({ customer_notified_at: new Date().toISOString() }).eq("id", id);
        back(filter, "sent-emailed");
      }
      back(filter, status === "not_configured" ? "sent-no-email" : "sent-email-failed");
    }
    back(filter, "sent");
  }

  const patch =
    intent === "processing"
      ? { status: "processing" as const }
      : intent === "cancelled"
        ? { status: "cancelled" as const }
        : { status: "new" as const, sent_at: null, carrier: null, tracking_ref: null, dispatch_note: null, dispatched_by: null };
  const { error } = await db.from("sample_requests").update(patch).eq("id", id);
  back(filter, error ? "error" : "saved");
}

/** Marks a finish's samples in or out of stock. The database checks the permission. */
export async function setSampleAvailability(form: FormData) {
  await requireAdmin("manage_samples", "/admin/samples");
  const finishId = String(form.get("finish_id") ?? "");
  const available = form.get("available") === "yes";
  if (!isUuid(finishId)) redirect("/admin/samples");
  const db = await userSupabase();
  const { error } = await db.rpc("set_sample_availability", { p_finish: finishId, p_available: available });
  if (!error) updateTag(TAGS.finishes);
  redirect(`/admin/samples?filter=${String(form.get("filter") ?? "new")}&notice=${error ? "error" : "availability"}#availability`);
}
