"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAGS } from "@/lib/catalogue";
import { requireAdmin } from "@/lib/auth/admin";
import type { AdminFormState } from "@/lib/admin/form-state";
import { parseRetailer, parseStockist } from "@/lib/admin/forms";
import { isUuid } from "@/lib/ids";
import { userSupabase } from "@/lib/supabase/server";
import { echo } from "@/lib/trade/quote-forms";
import { geocodePostcode, STOCKISTS_TAG } from "@/lib/where-to-buy";

export async function saveStockist(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin("manage_stockists", "/admin/stockists");
  const id = String(form.get("id") ?? "");
  const parsed = parseStockist(form);
  if (!parsed.ok) return { status: "error", errors: parsed.errors, message: "Please check the highlighted fields.", values: echo(form) };
  const d = parsed.data;

  // Coordinates from the postcode, so postcode search can find it.
  const geo = await geocodePostcode(d.postcode);
  const point: { lat: number | null; lng: number | null } = geo.ok ? geo.point : { lat: null, lng: null };
  if (!geo.ok && geo.reason === "not-found") {
    return { status: "error", errors: { postcode: "That postcode wasn’t found." }, values: echo(form) };
  }

  const db = await userSupabase();
  // Verification is stamped once, by whoever ticked it, and kept until it is unticked.
  const { data: before } = isUuid(id) ? await db.from("stockists").select("verified_at, verified_by").eq("id", id).maybeSingle() : { data: null };
  const verified_at = d.verified ? (before?.verified_at ?? new Date().toISOString()) : null;
  const verified_by = d.verified ? (before?.verified_by ?? admin.userId) : null;

  const row = {
    name: d.name,
    type: d.type,
    address: d.address,
    postcode: d.postcode,
    phone: d.phone,
    website: d.website,
    email: d.email,
    opening_hours: d.opening_hours,
    description: d.description,
    published: d.published,
    verified_at,
    verified_by,
    ...point,
  };
  const saved = isUuid(id)
    ? await db.from("stockists").update(row).eq("id", id).select("id").maybeSingle()
    : await db.from("stockists").insert(row).select("id").maybeSingle();
  if (saved.error || !saved.data) {
    const refused = saved.error?.code === "23514";
    return { status: "error", errors: refused ? { published: "Verify the details before publishing." } : {}, message: refused ? undefined : "Couldn’t save. Please try again.", values: echo(form) };
  }
  const stockistId = saved.data.id;

  // Private detail: where leads go, notes and commercial terms (never public).
  const priv = await db.from("stockist_private").upsert({
    stockist_id: stockistId,
    lead_email: d.lead_email,
    admin_note: d.admin_note,
    verification_note: d.verification_note,
    price_list_id: d.price_list_id,
    terms_note: d.terms_note,
    payment_terms: d.payment_terms,
    terms_valid_from: d.terms_valid_from,
    terms_valid_to: d.terms_valid_to,
    updated_at: new Date().toISOString(),
  });
  if (priv.error) return { status: "error", errors: {}, message: "Saved the listing, but not the private details. Please try again.", values: echo(form) };

  // Range carried: add what's new, remove what was unticked.
  const { data: current } = await db.from("stockist_products").select("finish_id").eq("stockist_id", stockistId);
  const have = new Set((current ?? []).map((r) => r.finish_id));
  const want = new Set(d.finish_ids);
  const add = [...want].filter((f) => !have.has(f));
  const remove = [...have].filter((f) => !want.has(f));
  if (add.length) await db.from("stockist_products").insert(add.map((finish_id) => ({ stockist_id: stockistId, finish_id })));
  if (remove.length) await db.from("stockist_products").delete().eq("stockist_id", stockistId).in("finish_id", remove);

  updateTag(STOCKISTS_TAG);
  refresh();
  const where = geo.ok ? "" : " The postcode lookup is unavailable just now, so it won’t appear in postcode search until you save it again.";
  return { status: "saved", message: `Saved ${d.name}.${where}` };
}

export async function deleteStockist(form: FormData) {
  await requireAdmin("manage_stockists", "/admin/stockists");
  const id = String(form.get("id") ?? "");
  if (!isUuid(id) || form.get("confirm") !== "yes") redirect("/admin/stockists?notice=confirm");
  const db = await userSupabase();
  await db.from("stockists").delete().eq("id", id);
  updateTag(STOCKISTS_TAG);
  redirect("/admin/stockists?notice=deleted");
}

export async function saveRetailer(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  await requireAdmin("manage_stockists", "/admin/stockists");
  const id = String(form.get("id") ?? "");
  const parsed = parseRetailer(form);
  if (!parsed.ok) return { status: "error", errors: parsed.errors, message: "Please check the highlighted fields.", values: echo(form) };
  const db = await userSupabase();
  const row = { ...parsed.data, url: parsed.data.url as string };
  const { error } = isUuid(id) ? await db.from("online_retailers").update(row).eq("id", id) : await db.from("online_retailers").insert(row);
  if (error) return { status: "error", errors: {}, message: "Couldn’t save. Please try again.", values: echo(form) };
  updateTag(TAGS.retailers);
  refresh();
  return { status: "saved", message: `Saved ${parsed.data.name}.` };
}

export async function deleteRetailer(form: FormData) {
  await requireAdmin("manage_stockists", "/admin/stockists");
  const id = String(form.get("id") ?? "");
  if (!isUuid(id) || form.get("confirm") !== "yes") redirect("/admin/stockists?notice=confirm");
  const db = await userSupabase();
  await db.from("online_retailers").delete().eq("id", id);
  updateTag(TAGS.retailers);
  redirect("/admin/stockists?notice=deleted");
}
