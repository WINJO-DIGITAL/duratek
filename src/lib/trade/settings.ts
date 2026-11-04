import "server-only";
import { emailConfigured } from "@/lib/email";

/**
 * Trade applications are open only when an account can be created and the
 * owner will hear about it by email (there is no admin approvals screen yet,
 * so without email an application would go unseen). In development, account
 * creation alone is enough so the flow can be tested locally.
 */
export function tradeApplicationsEnabled(): boolean {
  const canCreate = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  if (!canCreate) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return emailConfigured() && Boolean(process.env.OWNER_NOTIFY_EMAIL);
}
