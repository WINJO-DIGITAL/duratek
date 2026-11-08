"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { parseOverrideForm } from "@/lib/admin/prices";
import { isUuid } from "@/lib/ids";
import { userSupabase } from "@/lib/supabase/server";

/** Account prices: set for this account only, winning over its tier price. Validated first; a typo saves nothing. */
export async function saveAccountPrices(form: FormData) {
  await requireAdmin("/admin/accounts");
  const profileId = String(form.get("profile_id") ?? "");
  if (!isUuid(profileId)) redirect("/admin/accounts?notice=invalid");
  const back = (n: string) => redirect(`/admin/accounts/${profileId}?notice=${n}`);
  const edits = parseOverrideForm(form.entries());
  if (edits.invalid.length) back("invalid");

  const db = await userSupabase();
  if (edits.set.length) {
    const { error } = await db
      .from("price_overrides")
      .upsert(edits.set.map((e) => ({ profile_id: profileId, finish_id: e.finishId, price_per_m2_pence: e.pence })), { onConflict: "finish_id,profile_id" });
    if (error) back("error");
  }
  if (edits.clear.length) {
    const { error } = await db.from("price_overrides").delete().eq("profile_id", profileId).in("finish_id", edits.clear);
    if (error) back("error");
  }
  back("saved");
}
