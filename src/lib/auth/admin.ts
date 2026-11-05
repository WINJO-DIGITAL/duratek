import "server-only";
import { notFound, redirect } from "next/navigation";
import { getAccount, type Account } from "./session";

/**
 * Admin pages and actions only. Not signed in: to the login page. Signed in
 * but not an admin: a plain 404, so the screens aren't advertised. Row Level
 * Security independently stops a non-admin writing anything.
 */
export async function requireAdmin(next = "/admin"): Promise<Account> {
  const account = await getAccount();
  if (!account) redirect(`/trade/login?next=${encodeURIComponent(next)}`);
  if (!account.isAdmin) notFound();
  return account;
}
