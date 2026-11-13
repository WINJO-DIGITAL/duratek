"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CUSTOMER_VIEW_COOKIE, getAccount } from "@/lib/auth/session";
import { safeNext } from "@/lib/auth/login";
import { userSupabase } from "@/lib/supabase/server";

/** Customer view: hides every trade price for this session, so the site can be shown to a homeowner. */
export async function setCustomerView(form: FormData) {
  const account = await getAccount();
  if (!account) redirect("/trade/login");
  const jar = await cookies();
  if (form.get("on") === "1") {
    // A session cookie: it ends when the browser closes.
    jar.set(CUSTOMER_VIEW_COOKIE, "1", { path: "/", sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
  } else {
    jar.delete(CUSTOMER_VIEW_COOKIE);
  }
  redirect(safeNext(form.get("back")));
}

export async function logOut() {
  const db = await userSupabase();
  await db.auth.signOut();
  (await cookies()).delete(CUSTOMER_VIEW_COOKIE);
  redirect("/");
}

/** Signs this account out on every device (for a lost phone or a shared tablet). */
export async function logOutEverywhere() {
  const db = await userSupabase();
  await db.auth.signOut({ scope: "global" });
  (await cookies()).delete(CUSTOMER_VIEW_COOKIE);
  redirect("/trade/login?notice=signedout");
}
