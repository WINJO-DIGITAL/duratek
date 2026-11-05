import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Keeps signed-in visitors' sessions fresh (tokens expire; server components
 * can't write cookies). Does nothing for visitors without an auth cookie, so
 * public pages cost nothing and stay cacheable.
 */
export async function proxy(request: NextRequest) {
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
  if (!hasSession) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (all) => {
        for (const { name, value } of all) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of all) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser(); // refreshes the token and rewrites cookies if needed
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico|woff2?)$).*)"],
};
