/**
 * Options for the Supabase auth cookies. The browser never reads them (every
 * request that needs the session goes through the server), so they are
 * HttpOnly: a script injected into a page can't steal a session. SameSite=Lax
 * keeps them off cross-site POSTs; Secure applies on https (production).
 */
export function hardenAuthCookie<T extends object>(options: T) {
  return { ...options, httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production" };
}
