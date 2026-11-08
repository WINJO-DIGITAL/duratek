import "server-only";
import { userSupabase } from "@/lib/supabase/server";
import { DEFAULT_PREFERENCES, type Preferences } from "./quote-forms";

/** The trader's own defaults, read as that user (RLS: own row, approved only). */
export async function getPreferences(): Promise<Preferences> {
  const db = await userSupabase();
  const { data } = await db
    .from("trade_preferences")
    .select("default_markup_bp, default_wastage_pct, vat_registered, quote_footer")
    .maybeSingle();
  if (!data) return DEFAULT_PREFERENCES;
  return { ...data, default_wastage_pct: Number(data.default_wastage_pct) };
}
