"use server";

import { redirect } from "next/navigation";
import { newPasswordSchema, type SimpleFormState } from "@/lib/auth/password";
import { userSupabase } from "@/lib/supabase/server";

/** Sets a new password for the signed-in user (after a recovery link), then signs out every other session. */
export async function setNewPassword(_prev: SimpleFormState, form: FormData): Promise<SimpleFormState> {
  const db = await userSupabase();
  const { data } = await db.auth.getUser();
  if (!data.user) return { status: "error", message: "That link has expired. Ask for a new one." };

  const parsed = newPasswordSchema.safeParse({ password: form.get("password"), confirm: form.get("confirm") });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { status: "error", message: "Please check the highlighted fields.", errors };
  }
  const { error } = await db.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const message =
      error.code === "same_password"
        ? "That's your current password. Choose a different one."
        : error.code === "weak_password"
          ? "Please choose a stronger password."
          : "Couldn't change the password. Please ask for a new link.";
    return { status: "error", message, errors: { password: message } };
  }
  // Anyone else signed in as this account is signed out.
  await db.auth.signOut({ scope: "others" });
  redirect("/trade/account?notice=password");
}
