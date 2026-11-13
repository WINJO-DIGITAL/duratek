import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { userSupabase } from "@/lib/supabase/server";

import { isMissingSchema } from "@/lib/catalogue/errors";
import { PERMISSIONS, type AccountRole, type AccountStatus, type Permission } from "./permissions";

export type { AccountRole, AccountStatus, Permission } from "./permissions";

export interface Account {
  userId: string;
  email: string;
  companyName: string;
  contactName: string;
  status: AccountStatus;
  tierId: string | null;
  role: AccountRole;
  /** Administrative permissions in force now (all of them for a super administrator). Empty for trade. */
  permissions: Permission[];
  /** True for an administrator who can open at least one admin screen. */
  isAdmin: boolean;
  emailConfirmed: boolean;
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
  const [profile, perms] = await Promise.all([
    db.from("profiles").select("company_name, contact_name, status, tier_id, role").eq("id", user.id).maybeSingle(),
    db.rpc("my_permissions"),
  ]);
  let p = profile.data;
  let permissions = ((perms.data as Permission[] | null) ?? []).filter(Boolean);

  // Deploy safety net: before the roles migration runs there is no role column
  // and no my_permissions(); fall back to the legacy is_admin flag. Only for
  // "undefined column / function"; any other failure means no account.
  if (profile.error && isMissingSchema(profile.error)) {
    const legacy = await db.from("profiles").select("company_name, contact_name, status, tier_id, is_admin").eq("id", user.id).maybeSingle();
    if (!legacy.data) return null;
    const { is_admin, ...rest } = legacy.data as typeof legacy.data & { is_admin: boolean };
    p = { ...rest, role: is_admin ? "super_admin" : "trade" };
    permissions = is_admin ? PERMISSIONS.map((x) => x.value) : [];
  }
  if (!p) return null;
  return {
    userId: user.id,
    email: user.email ?? "",
    companyName: p.company_name,
    contactName: p.contact_name,
    status: p.status,
    tierId: p.tier_id,
    role: p.role,
    permissions,
    isAdmin: permissions.length > 0,
    emailConfirmed: Boolean(user.email_confirmed_at),
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
