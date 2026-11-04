import "server-only";
import { emailConfigured } from "@/lib/email";

/**
 * Online sample requests are open only when requests can be saved (service
 * role key) and someone will hear about them (email: confirmation to the
 * customer and a notification to the owner). Admin has no sample list yet,
 * so without email a request would go unseen. In development, saving alone
 * is enough so the flow can be tested locally.
 */
export function samplesEnabled(): boolean {
  const canSave = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!canSave) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return emailConfigured() && Boolean(process.env.OWNER_NOTIFY_EMAIL);
}
