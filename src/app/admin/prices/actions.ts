"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAGS } from "@/lib/catalogue";
import { requireAdmin } from "@/lib/auth/admin";
import { dateStart, parseBasePriceForm, PRICE_UNITS, type PriceUnit } from "@/lib/admin/prices";
import { isUuid } from "@/lib/ids";
import { inputToPence } from "@/lib/money";
import { userSupabase } from "@/lib/supabase/server";

export type SavePricesState = { status: "idle" } | { status: "saved"; count: number } | { status: "error"; message: string };

/**
 * Base prices: per m², from 1 m², no dates, one per list and variant. Saved
 * as the signed-in pricing manager (RLS is the backstop; every change is in
 * the audit log). Validated first, so a typo saves nothing.
 */
export async function saveBasePrices(_prev: SavePricesState, form: FormData): Promise<SavePricesState> {
  await requireAdmin("manage_pricing", "/admin/prices");
  const edits = parseBasePriceForm(form.entries());
  if (edits.invalid.length > 0) {
    return {
      status: "error",
      message: `${edits.invalid.length} ${edits.invalid.length === 1 ? "price isn’t" : "prices aren’t"} valid. Use pounds and pence, like 33.33 (not 0). Nothing was saved.`,
    };
  }
  const db = await userSupabase();
  const { data: existing, error: readError } = await db
    .from("price_list_items")
    .select("id, price_list_id, variant_id, amount_pence")
    .eq("price_unit", "m2")
    .eq("min_quantity", 1)
    .is("valid_from", null)
    .is("valid_to", null);
  if (readError) return { status: "error", message: "Couldn’t read the current prices. Nothing was saved." };
  const key = (l: string, v: string) => `${l}:${v}`;
  const current = new Map((existing ?? []).map((i) => [key(i.price_list_id, i.variant_id), i]));

  let count = 0;
  for (const e of edits.set) {
    const was = current.get(key(e.listId, e.variantId));
    if (was?.amount_pence === e.pence) continue;
    const { error } = was
      ? await db.from("price_list_items").update({ amount_pence: e.pence }).eq("id", was.id)
      : await db.from("price_list_items").insert({ price_list_id: e.listId, variant_id: e.variantId, amount_pence: e.pence, price_unit: "m2" });
    if (error) return { status: "error", message: `Couldn’t save a price (${count} saved before it). Please try again.` };
    count++;
  }
  for (const e of edits.clear) {
    const was = current.get(key(e.listId, e.variantId));
    if (!was) continue;
    const { error } = await db.from("price_list_items").delete().eq("id", was.id);
    if (error) return { status: "error", message: "Couldn’t clear a price. Please try again." };
    count++;
  }
  updateTag(TAGS.finishes); // public prices are cached
  return { status: "saved", count };
}

export async function addTier(form: FormData) {
  await requireAdmin("manage_pricing", "/admin/prices");
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  if (!name) redirect("/admin/prices?notice=tier-empty");
  const db = await userSupabase();
  // The database gives every new tier its own trade price list.
  const { error } = await db.from("price_tiers").insert({ name });
  redirect(error ? "/admin/prices?notice=tier-exists" : "/admin/prices?notice=tier-added");
}

const KINDS = ["trade", "stockist", "promotion"] as const;
const AUDIENCES = ["public", "trade", "stockist", "all"] as const;

/** A new stockist list, promotion or extra trade list. */
export async function createList(form: FormData) {
  await requireAdmin("manage_pricing", "/admin/prices");
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  const kind = String(form.get("kind") ?? "") as (typeof KINDS)[number];
  const audience = String(form.get("audience") ?? "") as (typeof AUDIENCES)[number];
  const from = dateStart(String(form.get("valid_from") ?? ""));
  const to = dateStart(String(form.get("valid_to") ?? ""));
  if (!name || !KINDS.includes(kind) || from === undefined || to === undefined) redirect("/admin/prices?notice=list-invalid");
  if (kind === "promotion" && !AUDIENCES.includes(audience)) redirect("/admin/prices?notice=list-audience");
  if (from && to && to <= from) redirect("/admin/prices?notice=list-dates");
  const includeVat = kind === "promotion" ? audience === "public" || audience === "all" : false;
  const code = `${kind}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "list"}-${Date.now().toString(36)}`;
  const db = await userSupabase();
  const { data, error } = await db
    .from("price_lists")
    .insert({ code, name, kind, audience: kind === "promotion" ? audience : null, prices_include_vat: includeVat, valid_from: from, valid_to: to })
    .select("id")
    .single();
  if (error || !data) redirect("/admin/prices?notice=list-failed");
  redirect(`/admin/prices/lists/${data.id}?notice=created`);
}

/** List settings: name, active, dates, and whether its prices include VAT. */
export async function updateList(form: FormData) {
  await requireAdmin("manage_pricing", "/admin/prices");
  const id = String(form.get("id") ?? "");
  if (!isUuid(id)) redirect("/admin/prices");
  const back = (n: string): never => redirect(`/admin/prices/lists/${id}?notice=${n}`);
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  const from = dateStart(String(form.get("valid_from") ?? ""));
  const to = dateStart(String(form.get("valid_to") ?? ""));
  if (!name || from === undefined || to === undefined) back("invalid");
  if (from && to && to <= from) back("dates");
  const db = await userSupabase();
  const { error } = await db
    .from("price_lists")
    .update({ name, active: form.get("active") === "on", valid_from: from, valid_to: to, prices_include_vat: form.get("prices_include_vat") === "on" })
    .eq("id", id);
  if (error) back("failed");
  updateTag(TAGS.finishes);
  back("saved");
}

/** One price: any unit, a volume break, and optional start and end dates. */
export async function addItem(form: FormData) {
  await requireAdmin("manage_pricing", "/admin/prices");
  const listId = String(form.get("list_id") ?? "");
  if (!isUuid(listId)) redirect("/admin/prices");
  const back = (n: string): never => redirect(`/admin/prices/lists/${listId}?notice=${n}`);
  const variantId = String(form.get("variant_id") ?? "");
  const pence = inputToPence(String(form.get("amount") ?? ""));
  const unit = String(form.get("price_unit") ?? "") as PriceUnit;
  const minRaw = String(form.get("min_quantity") ?? "1").trim() || "1";
  const min = /^\d{1,6}(\.\d{1,2})?$/.test(minRaw) ? Number(minRaw) : Number.NaN;
  const from = dateStart(String(form.get("valid_from") ?? ""));
  const to = dateStart(String(form.get("valid_to") ?? ""));
  if (!isUuid(variantId)) back("variant");
  if (!pence) back("amount");
  if (!PRICE_UNITS.some((u) => u.value === unit)) back("unit");
  if (!(min > 0)) back("min");
  if (from === undefined || to === undefined || (from && to && to <= from)) back("dates");
  const db = await userSupabase();
  const { error } = await db
    .from("price_list_items")
    .insert({ price_list_id: listId, variant_id: variantId, amount_pence: pence as number, price_unit: unit, min_quantity: min, valid_from: from, valid_to: to });
  if (error) back(error.code === "23505" ? "duplicate" : error.code === "P0001" ? "unit-mismatch" : "failed");
  updateTag(TAGS.finishes);
  back("item-added");
}

export async function deleteItem(form: FormData) {
  await requireAdmin("manage_pricing", "/admin/prices");
  const listId = String(form.get("list_id") ?? "");
  const id = String(form.get("id") ?? "");
  if (!isUuid(listId) || !isUuid(id)) redirect("/admin/prices");
  const db = await userSupabase();
  await db.from("price_list_items").delete().eq("id", id).eq("price_list_id", listId);
  updateTag(TAGS.finishes);
  refresh();
  redirect(`/admin/prices/lists/${listId}?notice=item-removed`);
}
