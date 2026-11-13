import "server-only";
import { userSupabase } from "@/lib/supabase/server";
import { DEFAULT_PREFERENCES, type Branding, type Preferences } from "./quote-forms";

/** The trader's own defaults, read as that user (RLS: own row, approved only). */
export async function getPreferences(): Promise<Preferences> {
  const db = await userSupabase();
  const { data } = await db
    .from("trade_preferences")
    .select("default_markup_bp, default_wastage_pct, vat_registered, quote_footer, labour_per_m2_pence")
    .maybeSingle();
  if (!data) return DEFAULT_PREFERENCES;
  return { ...data, default_wastage_pct: Number(data.default_wastage_pct) };
}

export interface FullPreferences extends Preferences, Branding {
  logo_path: string | null;
}

/** Preferences with branding, for settings and quotes. */
export async function getFullPreferences(): Promise<FullPreferences> {
  const db = await userSupabase();
  const { data } = await db
    .from("trade_preferences")
    .select("default_markup_bp, default_wastage_pct, vat_registered, quote_footer, labour_per_m2_pence, display_name, contact_email, contact_phone, website, address, brand_colour, logo_path")
    .maybeSingle();
  const blank = { display_name: null, contact_email: null, contact_phone: null, website: null, address: null, brand_colour: null, logo_path: null };
  if (!data) return { ...DEFAULT_PREFERENCES, ...blank };
  return { ...data, default_wastage_pct: Number(data.default_wastage_pct) };
}

/** Public URL of a trader's logo (the bucket is public; paths are per trader). */
export function logoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trade-logos/${path}`;
}

/** Logo bytes for a PDF. Never throws: a missing logo just means no logo. */
export async function logoBytes(path: string | null | undefined): Promise<{ bytes: Uint8Array; type: "png" | "jpg" } | null> {
  const url = logoUrl(path);
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type")?.includes("png") ? "png" : "jpg";
    return { bytes: new Uint8Array(await res.arrayBuffer()), type };
  } catch {
    return null;
  }
}
