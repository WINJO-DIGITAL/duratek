"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { userSupabase } from "@/lib/supabase/server";

/** Typed settings the owner may change. Anything else is refused. */
const RULES: Record<string, (raw: string) => unknown | undefined> = {
  default_vat_rate_bp: (raw) => {
    const t = raw.trim().replace(/%$/, "");
    if (!/^\d{1,2}(\.\d{1,2})?$/.test(t)) return undefined;
    const bp = Math.round(Number(t) * 100);
    return bp >= 0 && bp <= 10000 ? bp : undefined;
  },
  sample_limit: (raw) => (/^\d{1,2}$/.test(raw.trim()) && Number(raw) >= 1 && Number(raw) <= 10 ? Number(raw) : undefined),
  quote_validity_days: (raw) => (/^\d{1,3}$/.test(raw.trim()) && Number(raw) >= 1 && Number(raw) <= 365 ? Number(raw) : undefined),
};

export async function saveSetting(form: FormData) {
  await requireAdmin("manage_settings", "/admin/settings");
  const key = String(form.get("key") ?? "");
  const rule = RULES[key];
  const value = rule?.(String(form.get("value") ?? ""));
  if (value === undefined) redirect(`/admin/settings?notice=invalid&key=${encodeURIComponent(key)}`);
  const db = await userSupabase();
  const { error } = await db.from("system_settings").update({ value: value as never, updated_by: (await db.auth.getUser()).data.user?.id }).eq("key", key);
  redirect(`/admin/settings?notice=${error ? "failed" : "saved"}`);
}
