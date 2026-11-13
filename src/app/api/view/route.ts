import { NextResponse, type NextRequest } from "next/server";
import { clientKey, createLimiter } from "@/lib/rate-limit";
import { adminSupabase } from "@/lib/supabase/admin";

const perAddress = createLimiter({ max: 120, windowMs: 60 * 60 * 1000 });
const BOT = /bot|crawl|spider|slurp|headless|preview|lighthouse|monitor|curl|wget|python|node-fetch/i;

/**
 * Counts one finish page view. Stores a daily total per finish only: no
 * address, no cookie, no visitor id. Always answers 204 so nothing here can
 * break a page; bots and over-eager clients are quietly ignored.
 */
export async function POST(request: NextRequest) {
  const done = new NextResponse(null, { status: 204, headers: { "cache-control": "no-store" } });
  if (BOT.test(request.headers.get("user-agent") ?? "")) return done;
  if (!perAddress(clientKey(request.headers))) return done;
  let slug = "";
  try {
    slug = String(((await request.json()) as { slug?: unknown }).slug ?? "");
  } catch {
    return done;
  }
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return done;
  const db = adminSupabase();
  if (!db) return done; // no service key configured: nothing is counted, and nothing is claimed
  const { error } = await db.rpc("record_finish_view", { p_slug: slug });
  if (error) console.error("View not recorded", error.message);
  return done;
}
