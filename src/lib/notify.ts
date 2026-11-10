import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { emailConfigured, sendEmail } from "@/lib/email";
import { outboundEmailSuppressed } from "@/lib/runtime-env";
import { adminSupabase } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export type NotifyStatus = "sent" | "failed" | "not_configured" | "suppressed";

export interface Notification {
  /** What this email is, e.g. "sample_dispatched". Shown in the admin email log. */
  kind: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  relatedTable?: string;
  relatedId?: string;
}

/**
 * Sends one email and records what happened. The log says "sent" only when
 * the provider accepted the message, "failed" when it refused or was
 * unreachable, and "not_configured" when no email provider is set up: a
 * success is never invented. `db` is the caller's own client, used for the
 * log only when the service-role client isn't available (admin screens).
 */
export async function notify(message: Notification, db?: SupabaseClient<Database>): Promise<NotifyStatus> {
  let status: NotifyStatus = "not_configured";
  if (outboundEmailSuppressed()) {
    status = "suppressed";
  } else if (emailConfigured()) {
    status = (await sendEmail({ to: message.to, subject: message.subject, text: message.text, html: message.html, replyTo: message.replyTo })) ? "sent" : "failed";
  }
  const logger = adminSupabase() ?? db;
  if (logger) {
    const { error } = await logger.from("notification_log").insert({
      kind: message.kind,
      recipient: message.to,
      subject: message.subject.slice(0, 200),
      status,
      related_table: message.relatedTable ?? null,
      related_id: message.relatedId ?? null,
    });
    // A log that can't be written (for example before its migration) never blocks the email.
    if (error) console.error("Email log not written", error.message);
  }
  return status;
}
