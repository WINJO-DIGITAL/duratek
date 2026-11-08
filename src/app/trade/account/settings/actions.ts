"use server";

import { requireApprovedTrade } from "@/lib/auth/trade";
import { echo, parsePreferences, type FieldErrors } from "@/lib/trade/quote-forms";
import { userSupabase } from "@/lib/supabase/server";

export type SettingsState = { status: "idle" } | { status: "saved" } | { status: "error"; errors: FieldErrors; message?: string; values?: Record<string, string> };

export async function savePreferences(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const { account } = await requireApprovedTrade("/trade/account/settings");
  const parsed = parsePreferences(form);
  if (!parsed.ok) return { status: "error", errors: parsed.errors, values: echo(form) };
  const db = await userSupabase();
  const { error } = await db.from("trade_preferences").upsert({ profile_id: account.userId, ...parsed.data });
  if (error) return { status: "error", errors: {}, message: "Couldn’t save. Please try again.", values: echo(form) };
  return { status: "saved" };
}
