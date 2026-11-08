import "server-only";
import { notFound, redirect } from "next/navigation";
import { ADMIN_AREAS, allows, type Permission } from "./permissions";
import { getAccount, type Account } from "./session";

/**
 * Admin pages and actions. Not signed in: to the login page. Signed in
 * without this permission: a plain 404, so the screens aren't advertised.
 * Row Level Security independently refuses anything the permission doesn't cover.
 */
export async function requireAdmin(permission: Permission, next = "/admin"): Promise<Account> {
  const account = await getAccount();
  if (!account) redirect(`/trade/login?next=${encodeURIComponent(next)}`);
  if (!allows(account, permission)) notFound();
  return account;
}

/** The admin screens this account may open. */
export function adminAreasFor(account: Account) {
  return ADMIN_AREAS.filter((a) => allows(account, a.permission));
}
