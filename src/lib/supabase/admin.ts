import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Service-role client: bypasses RLS. Server only, never in a "use cache"
 * function, and only after the caller has validated and rate-limited the
 * request. Returns null when the key is not configured.
 */
let client: SupabaseClient<Database> | undefined;

export function adminSupabase(): SupabaseClient<Database> | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
