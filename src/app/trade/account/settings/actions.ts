"use server";

import { requireApprovedTrade } from "@/lib/auth/trade";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { echo, LOGO_MAX_BYTES, LOGO_TYPES, parseBranding, parsePreferences, type FieldErrors } from "@/lib/trade/quote-forms";
import { userSupabase } from "@/lib/supabase/server";

export type SettingsState = { status: "idle" } | { status: "saved" } | { status: "error"; errors: FieldErrors; message?: string; values?: Record<string, string> };

export async function savePreferences(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const { account } = await requireApprovedTrade("/trade/account/settings");
  const parsed = parsePreferences(form);
  if (!parsed.ok) return { status: "error", errors: parsed.errors, values: echo(form) };
  const db = await userSupabase();
  const { error } = await db.from("trade_preferences").upsert({ profile_id: account.userId, ...parsed.data });
  if (error) return { status: "error", errors: {}, message: "Couldn’t save. Please try again.", values: echo(form) };
  refresh();
  return { status: "saved" };
}

/** Business name, contact details, website, address and colour for quotes. */
export async function saveBranding(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const { account } = await requireApprovedTrade("/trade/account/settings");
  const parsed = parseBranding(form);
  if (!parsed.ok) return { status: "error", errors: parsed.errors, values: echo(form) };
  const db = await userSupabase();
  const { error } = await db.from("trade_preferences").upsert({ profile_id: account.userId, ...parsed.data });
  if (error) return { status: "error", errors: {}, message: "Couldn’t save. Please try again.", values: echo(form) };
  refresh();
  return { status: "saved" };
}

/** A logo for quotes: PNG or JPEG, up to 1 MB, checked by its first bytes, not just its name. */
export async function uploadLogo(form: FormData) {
  const { account } = await requireApprovedTrade("/trade/account/settings");
  const back = (n: string): never => redirect(`/trade/account/settings?notice=${n}#branding`);
  const file = form.get("logo");
  if (!(file instanceof File) || file.size === 0) return back("logo-missing");
  if (file.size > LOGO_MAX_BYTES) return back("logo-size");
  const type = LOGO_TYPES[file.type];
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  const isJpg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  if (!type || (type === "png" && !isPng) || (type === "jpg" && !isJpg)) return back("logo-type");

  const db = await userSupabase();
  const path = `${account.userId}/logo-${Date.now().toString(36)}.${type}`;
  const { error: upErr } = await db.storage.from("trade-logos").upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return back("logo-failed");
  const { data: was } = await db.from("trade_preferences").select("logo_path").maybeSingle();
  const { error } = await db.from("trade_preferences").upsert({ profile_id: account.userId, logo_path: path });
  if (error) {
    await db.storage.from("trade-logos").remove([path]);
    return back("logo-failed");
  }
  if (was?.logo_path && was.logo_path !== path) await db.storage.from("trade-logos").remove([was.logo_path]);
  back("logo-saved");
}

export async function removeLogo() {
  const { account } = await requireApprovedTrade("/trade/account/settings");
  const db = await userSupabase();
  const { data } = await db.from("trade_preferences").select("logo_path").maybeSingle();
  if (data?.logo_path) {
    await db.storage.from("trade-logos").remove([data.logo_path]);
    await db.from("trade_preferences").upsert({ profile_id: account.userId, logo_path: null });
  }
  redirect("/trade/account/settings?notice=logo-removed#branding");
}
