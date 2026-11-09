"use server";

import { refresh } from "next/cache";
import { getFinishes } from "@/lib/catalogue";
import { requireApprovedTrade } from "@/lib/auth/trade";
import { isUuid } from "@/lib/ids";
import { userSupabase } from "@/lib/supabase/server";

/** Saves a finish to the account, or removes it. */
export async function toggleSaved(form: FormData) {
  const { account } = await requireApprovedTrade("/trade/account/catalogue");
  const finishId = String(form.get("finish_id") ?? "");
  if (!isUuid(finishId) || !(await getFinishes()).some((f) => f.id === finishId)) return;
  const db = await userSupabase();
  if (form.get("saved") === "1") await db.from("saved_products").delete().eq("finish_id", finishId);
  else await db.from("saved_products").insert({ profile_id: account.userId, finish_id: finishId });
  refresh();
}
