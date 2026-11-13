"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { parseOverrideForm } from "@/lib/admin/prices";
import { isUuid } from "@/lib/ids";
import { userSupabase } from "@/lib/supabase/server";

/**
 * Account prices: per m², ex VAT, for this account only, winning over its
 * tier. Kept in the account's own price list (made on first save). Validated
 * first; a typo saves nothing.
 */
export async function saveAccountPrices(form: FormData) {
  await requireAdmin("manage_pricing", "/admin/accounts");
  const profileId = String(form.get("profile_id") ?? "");
  if (!isUuid(profileId)) redirect("/admin/accounts?notice=invalid");
  const back = (n: string): never => redirect(`/admin/accounts/${profileId}?notice=${n}`);
  const edits = parseOverrideForm(form.entries());
  if (edits.invalid.length || edits.set.some((e) => e.pence === 0)) back("invalid");

  const db = await userSupabase();
  let { data: list } = await db.from("price_lists").select("id").eq("profile_id", profileId).maybeSingle();
  if (!list && edits.set.length) {
    const { data, error } = await db
      .from("price_lists")
      .insert({ code: `account-${profileId.replace(/-/g, "").slice(0, 12)}`, name: "Account prices", kind: "account", profile_id: profileId, prices_include_vat: false })
      .select("id")
      .single();
    if (error) back("error");
    list = data;
  }
  if (!list) back("saved");
  const listId = list!.id;

  const { data: variants } = await db.from("product_variants").select("id, finish_id").eq("is_default", true);
  const variantOf = new Map((variants ?? []).map((v) => [v.finish_id, v.id]));
  for (const e of edits.set) {
    const variantId = variantOf.get(e.finishId);
    if (!variantId) continue;
    const { data: was } = await db
      .from("price_list_items")
      .select("id")
      .eq("price_list_id", listId)
      .eq("variant_id", variantId)
      .eq("price_unit", "m2")
      .eq("min_quantity", 1)
      .is("valid_from", null)
      .maybeSingle();
    const { error } = was
      ? await db.from("price_list_items").update({ amount_pence: e.pence }).eq("id", was.id)
      : await db.from("price_list_items").insert({ price_list_id: listId, variant_id: variantId, amount_pence: e.pence, price_unit: "m2" });
    if (error) back("error");
  }
  for (const finishId of edits.clear) {
    const variantId = variantOf.get(finishId);
    if (!variantId) continue;
    const { error } = await db
      .from("price_list_items")
      .delete()
      .eq("price_list_id", listId)
      .eq("variant_id", variantId)
      .eq("price_unit", "m2")
      .eq("min_quantity", 1)
      .is("valid_from", null);
    if (error) back("error");
  }
  back("saved");
}

/** Deletes a trade account and everything it owns. The database refuses for administrators. Needs the settings permission. */
export async function deleteAccount(form: FormData) {
  await requireAdmin("manage_settings", "/admin/accounts");
  const id = String(form.get("profile_id") ?? "");
  if (!isUuid(id)) redirect("/admin/accounts");
  if (form.get("confirm") !== "yes") redirect(`/admin/accounts/${id}?notice=delete-confirm`);
  const db = await userSupabase();
  const { error } = await db.rpc("delete_trade_account", { p_profile: id });
  redirect(error ? `/admin/accounts/${id}?notice=delete-failed` : "/admin/accounts?notice=deleted");
}
