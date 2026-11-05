import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { userSupabase } from "@/lib/supabase/server";

export type AccountStatus = "pending" | "approved" | "rejected";

export interface Account {
  userId: string;
  email: string;
  companyName: string;
  contactName: string;
  status: AccountStatus;
  tierId: string | null;
  isAdmin: boolean;
}

/** Name of the session cookie that hides trade prices (Customer view). */
export const CUSTOMER_VIEW_COOKIE = "duratek_customer_view";

/**
 * The signed-in trade account, or null for a visitor. Verified with the auth
 * server (never trusts the cookie alone). One lookup per request.
 */
export const getAccount = cache(async (): Promise<Account | null> => {
  const db = await userSupabase();
  const { data } = await db.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const { data: p } = await db
    .from("profiles")
    .select("company_name, contact_name, status, tier_id, is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!p) return null;
  return {
    userId: user.id,
    email: user.email ?? "",
    companyName: p.company_name,
    contactName: p.contact_name,
    status: p.status,
    tierId: p.tier_id,
    isAdmin: p.is_admin,
  };
});

/** An approved trade account that is not in Customer view: the only case where trade prices may be sent. */
export async function canSeeTradePrices(account: Account | null): Promise<boolean> {
  if (!account || account.status !== "approved") return false;
  return !(await inCustomerView());
}

export async function inCustomerView(): Promise<boolean> {
  return (await cookies()).get(CUSTOMER_VIEW_COOKIE)?.value === "1";
}
