import "server-only";
import { outboundEmailSuppressed } from "./runtime-env";

/**
 * Transactional email through Resend's HTTP API (no SDK needed).
 * Configured by RESEND_API_KEY and EMAIL_FROM (e.g. "Duratek <samples@your-domain>",
 * on a domain verified in Resend).
 */
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(message: {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}): Promise<boolean> {
  // Previews share the live database; a real customer must not get email from a test build.
  if (outboundEmailSuppressed()) {
    console.warn("Email not sent: this is a preview build (ALLOW_EMAIL_FROM_PREVIEW is not set).");
    return false;
  }
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("Resend error", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (err) {
    console.error("Resend request failed", err);
    return false;
  }
}

export { escapeHtml } from "./escape";
