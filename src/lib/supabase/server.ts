import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { hardenAuthCookie } from "./cookie-options";
import type { Database } from "./database.types";

/**
 * Supabase client for the signed-in visitor: reads and writes the auth
 * cookies, and runs as that user, so Row Level Security decides what they can
 * see (their own tier's prices, nothing private otherwise). Uses the anon key.
 * Call only from request-time code (server components, actions).
 */
export async function userSupabase() {
  // Auth checks token expiry against the clock: only ever on a real request, never while prerendering.
  await connection();
  const jar = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.");
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (all) => {
        try {
          for (const { name, value, options } of all) jar.set(name, value, hardenAuthCookie(options));
        } catch {
          // Called from a server component, which can't set cookies; the proxy refreshes them.
        }
      },
    },
  });
}
