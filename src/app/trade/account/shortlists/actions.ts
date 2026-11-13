"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getFinishes } from "@/lib/catalogue";
import { requireApprovedTrade } from "@/lib/auth/trade";
import { isUuid } from "@/lib/ids";
import { userSupabase } from "@/lib/supabase/server";
import type { FieldErrors } from "@/lib/trade/quote-forms";
import { parseShortlist } from "@/lib/trade/shortlist-form";

export type ShortlistState = { status: "idle" } | { status: "saved"; message: string } | { status: "error"; errors: FieldErrors; message?: string; name?: string; finishIds?: string[] };

const MAX_SHORTLISTS = 200;

export async function createShortlist(_prev: ShortlistState, form: FormData): Promise<ShortlistState> {
  const { account } = await requireApprovedTrade("/trade/account/shortlists");
  const parsed = parseShortlist(form);
  const kept = { name: String(form.get("name") ?? "").slice(0, 120), finishIds: form.getAll("finish_id").map(String).slice(0, 50) };
  if (!parsed.ok) return { status: "error", errors: parsed.errors, message: "Please check the highlighted fields.", ...kept };

  const published = new Set((await getFinishes()).map((f) => f.id));
  const ids = parsed.data.finish_ids.filter((id) => published.has(id));
  if (ids.length === 0) return { status: "error", errors: { finish_ids: "Choose at least one finish." }, ...kept };

  const db = await userSupabase();
  const { count } = await db.from("shortlists").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= MAX_SHORTLISTS) return { status: "error", errors: {}, message: "You have a lot of shortlists. Delete some old ones first.", ...kept };

  const { error } = await db.from("shortlists").insert({ profile_id: account.userId, name: parsed.data.name, finish_ids: ids });
  if (error) return { status: "error", errors: {}, message: "Couldn’t save the shortlist. Please try again.", ...kept };
  refresh();
  return { status: "saved", message: `Saved “${parsed.data.name}”. Copy its link below.` };
}

export async function deleteShortlist(form: FormData) {
  await requireApprovedTrade("/trade/account/shortlists");
  const id = String(form.get("id") ?? "");
  if (isUuid(id)) {
    const db = await userSupabase();
    await db.from("shortlists").delete().eq("id", id);
  }
  redirect("/trade/account/shortlists?notice=deleted");
}
