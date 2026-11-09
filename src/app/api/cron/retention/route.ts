import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Daily retention run: anonymises or deletes personal data past its period
 * (see Settings). Called by Vercel Cron with `Authorization: Bearer $CRON_SECRET`.
 * Without CRON_SECRET, or without the service key, it refuses rather than pretend.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!safeEqual(given, secret)) return new NextResponse("Unauthorized", { status: 401 });
  const db = adminSupabase();
  if (!db) return NextResponse.json({ error: "Service key not configured" }, { status: 503 });
  const { data, error } = await db.rpc("purge_expired_personal_data");
  if (error) {
    console.error("Retention run failed", error.message);
    return NextResponse.json({ error: "Retention run failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...(data as object) }, { headers: { "cache-control": "no-store" } });
}
