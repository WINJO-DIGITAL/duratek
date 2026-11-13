import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth/login";
import { clientKey, createLimiter } from "@/lib/rate-limit";
import { userSupabase } from "@/lib/supabase/server";

const TYPES: EmailOtpType[] = ["signup", "recovery", "email", "email_change", "invite", "magiclink"];
const perAddress = createLimiter({ max: 30, windowMs: 15 * 60 * 1000 });

/**
 * Email links land here: confirming an address, or starting a password reset.
 * Supports the token-hash links our templates send (they work in any browser)
 * and the code links Supabase sends by default. Same-site destinations only.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const to = (path: string) => NextResponse.redirect(new URL(path, url.origin), { status: 303, headers: { "cache-control": "no-store" } });
  if (!perAddress(clientKey(request.headers))) return to("/trade/login?notice=busy");

  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const db = await userSupabase();

  let ok = false;
  if (tokenHash && type && TYPES.includes(type)) {
    ok = !(await db.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  } else if (code) {
    ok = !(await db.auth.exchangeCodeForSession(code)).error;
  }
  if (!ok) return to("/trade/login?notice=link");

  if (type === "recovery") return to("/trade/reset-password");
  const next = safeNext(url.searchParams.get("next"), "/trade/account");
  return to(`${next}${next.includes("?") ? "&" : "?"}notice=verified`);
}
