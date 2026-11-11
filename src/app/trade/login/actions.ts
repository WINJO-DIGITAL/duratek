"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { loginSchema, safeNext, type LoginState } from "@/lib/auth/login";
import { clientKey, createFailureLimiter } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site";
import { userSupabase } from "@/lib/supabase/server";

/* Rate limit failed sign-in attempts per address (best effort, in memory on each
   server instance). Only failures count, so people signing in successfully from one
   office address never lock each other out. Supabase Auth applies its own limits as well.
   Test servers may raise the limit (LOGIN_RATE_MAX); production leaves it at 10. */
const failures = createFailureLimiter({ max: Number(process.env.LOGIN_RATE_MAX) || 10, windowMs: 15 * 60 * 1000 });

export async function logIn(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = typeof form.get("email") === "string" ? (form.get("email") as string).trim() : "";
  // Honeypot: people never see or fill it.
  if (form.get("company_website")) return { status: "error", message: "Email or password isn't right.", email };

  const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check your details.", email };
  }

  const key = clientKey(await headers());
  if (failures.blocked(key)) {
    return { status: "error", message: "Too many attempts. Please try again in a few minutes.", email };
  }

  const db = await userSupabase();
  const { error } = await db.auth.signInWithPassword(parsed.data);
  // Auth only says this after the password matched, so it reveals nothing to a stranger.
  if (error?.code === "email_not_confirmed") return { status: "unconfirmed", email: parsed.data.email };
  if (error) {
    failures.fail(key);
    // One message for every failure, so it can't be used to find out who has an account.
    return { status: "error", message: "Email or password isn't right.", email };
  }
  redirect(safeNext(form.get("next")));
}

const resendLimit = new Map<string, number>();

/** Sends the confirmation email again. Same reply whatever happens; at most once a minute per address. */
export async function resendConfirmation(_prev: LoginState, form: FormData): Promise<LoginState> {
  const parsed = loginSchema.shape.email.safeParse(form.get("email"));
  if (!parsed.success) return { status: "error", message: "Enter your email address." };
  const email = parsed.data;
  const last = resendLimit.get(email) ?? 0;
  if (Date.now() - last > 60_000) {
    resendLimit.set(email, Date.now());
    if (resendLimit.size > 5000) resendLimit.clear();
    const db = await userSupabase();
    await db.auth.resend({ type: "signup", email, options: { emailRedirectTo: siteUrl("/auth/confirm?next=/trade/account") } });
  }
  return { status: "unconfirmed", email, resent: true };
}
