"use server";

import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { emailSchema, type SimpleFormState } from "@/lib/auth/password";
import { clientKey, createLimiter } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site";

const perAddress = createLimiter({ max: 5, windowMs: 60 * 60 * 1000 });
const perEmail = createLimiter({ max: 3, windowMs: 60 * 60 * 1000 });

/** The same answer whether or not the address has an account, so the form can't reveal who does. */
const SENT: SimpleFormState = {
  status: "done",
  message: "If there's a Duratek trade account for that email, we've sent a link to choose a new password. It works for an hour.",
};

export async function requestPasswordReset(_prev: SimpleFormState, form: FormData): Promise<SimpleFormState> {
  if (form.get("company_website")) return SENT; // honeypot
  const parsed = emailSchema.safeParse(form.get("email"));
  if (!parsed.success) return { status: "error", message: "Enter your email address.", errors: { email: "Enter your email address." } };
  if (!perAddress(clientKey(await headers()))) return { status: "error", message: "Too many requests. Please try again later." };
  if (!perEmail(parsed.data)) return SENT;

  const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await auth.auth.resetPasswordForEmail(parsed.data, { redirectTo: siteUrl("/auth/confirm?next=/trade/reset-password") });
  if (error && error.status !== 429) console.error("Password reset request failed", error.status, error.code);
  return SENT;
}
