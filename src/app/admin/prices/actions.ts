"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAGS } from "@/lib/catalogue";
import { requireAdmin } from "@/lib/auth/admin";
import { parsePriceForm } from "@/lib/admin/prices";
import { userSupabase } from "@/lib/supabase/server";

export type SavePricesState = { status: "idle" } | { status: "saved"; count: number } | { status: "error"; message: string };

/**
 * Saves RRPs and trade prices as the signed-in admin (Row Level Security is
 * the backstop). Validates everything first, so a typo saves nothing.
 */
export async function savePrices(_prev: SavePricesState, form: FormData): Promise<SavePricesState> {
  await requireAdmin("/admin/prices");
  const edits = parsePriceForm(form.entries());
  if (edits.invalid.length > 0) {
    return { status: "error", message: `${edits.invalid.length} ${edits.invalid.length === 1 ? "price isn’t" : "prices aren’t"} valid. Use pounds and pence, like 33.33. Nothing was saved.` };
  }

  const db = await userSupabase();
  let count = 0;

  for (const r of edits.rrp) {
    const { error } = await db.from("finishes").update({ rrp_per_m2_pence: r.pence }).eq("id", r.finishId);
    if (error) return { status: "error", message: "Couldn’t save an RRP. Nothing more was saved; please try again." };
    count++;
  }

  const upserts = edits.tier.filter((t) => t.pence !== null).map((t) => ({ finish_id: t.finishId, tier_id: t.tierId, price_per_m2_pence: t.pence as number }));
  if (upserts.length) {
    const { error } = await db.from("prices").upsert(upserts, { onConflict: "finish_id,tier_id" });
    if (error) return { status: "error", message: "Couldn’t save the trade prices. Please try again." };
    count += upserts.length;
  }
  for (const t of edits.tier.filter((t) => t.pence === null)) {
    const { error } = await db.from("prices").delete().eq("finish_id", t.finishId).eq("tier_id", t.tierId);
    if (error) return { status: "error", message: "Couldn’t clear a trade price. Please try again." };
  }

  updateTag(TAGS.finishes); // RRP is public: refresh the cached catalogue
  return { status: "saved", count };
}

export async function addTier(form: FormData) {
  await requireAdmin("/admin/prices");
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  if (!name) redirect("/admin/prices?tier=empty");
  const db = await userSupabase();
  const { error } = await db.from("price_tiers").insert({ name });
  redirect(error ? "/admin/prices?tier=exists" : "/admin/prices?tier=added");
}
