import "server-only";
import { redirect } from "next/navigation";
import { getAccount, inCustomerView, type Account } from "./session";

/**
 * Trade-only pages and actions. Not signed in: to the login page. Signed in
 * but not approved: back to the account page, which explains why. Row Level
 * Security independently stops an unapproved account reading or writing
 * trade data.
 */
export async function requireApprovedTrade(next = "/trade/account"): Promise<{ account: Account; customerView: boolean }> {
  const account = await getAccount();
  if (!account) redirect(`/trade/login?next=${encodeURIComponent(next)}`);
  if (account.status !== "approved") redirect("/trade/account");
  return { account, customerView: await inCustomerView() };
}
