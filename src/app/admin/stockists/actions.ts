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
  await requireAdmin("/admin/stockists");
  const id = String(form.get("id") ?? "");
  const parsed = parseStockist(form);
  if (!parsed.ok) return { status: "error", errors: parsed.errors, message: "Please check the highlighted fields.", values: echo(form) };

  // Coordinates from the postcode, so postcode search can find it.
  const geo = await geocodePostcode(parsed.data.postcode);
  const point: { lat: number | null; lng: number | null } = geo.ok ? geo.point : { lat: null, lng: null };
  if (!geo.ok && geo.reason === "not-found") {
    return { status: "error", errors: { postcode: "That postcode wasn’t found." }, values: echo(form) };
  }

  const db = await userSupabase();
  const row = { ...parsed.data, ...point };
  const { error } = isUuid(id) ? await db.from("stockists").update(row).eq("id", id) : await db.from("stockists").insert(row);
  if (error) return { status: "error", errors: {}, message: "Couldn’t save. Please try again.", values: echo(form) };

  updateTag(STOCKISTS_TAG);
  refresh();
  const where = geo.ok ? "" : " The postcode lookup is unavailable just now, so it won’t appear in postcode search until you save it again.";
  return { status: "saved", message: `Saved ${parsed.data.name}.${where}` };
}

export async function deleteStockist(form: FormData) {
  await requireAdmin("/admin/stockists");
  const id = String(form.get("id") ?? "");
  if (!isUuid(id) || form.get("confirm") !== "yes") redirect("/admin/stockists?notice=confirm");
  const db = await userSupabase();
  await db.from("stockists").delete().eq("id", id);
  updateTag(STOCKISTS_TAG);
  redirect("/admin/stockists?notice=deleted");
}

export async function saveRetailer(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  await requireAdmin("/admin/stockists");
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
  await requireAdmin("/admin/stockists");
  const id = String(form.get("id") ?? "");
  if (!isUuid(id) || form.get("confirm") !== "yes") redirect("/admin/stockists?notice=confirm");
  const db = await userSupabase();
  await db.from("online_retailers").delete().eq("id", id);
  updateTag(TAGS.retailers);
  redirect("/admin/stockists?notice=deleted");
}
