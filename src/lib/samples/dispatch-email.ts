import { escapeHtml } from "@/lib/escape";

export interface DispatchDetails {
  name: string;
  finishes: string[];
  carrier: string | null;
  trackingRef: string | null;
  note: string | null;
}

/**
 * The "your samples are on their way" email. It states only what was recorded:
 * no delivery date is promised, and tracking appears only when it was entered.
 */
export function dispatchEmail(d: DispatchDetails): { subject: string; text: string; html: string } {
  const list = d.finishes.map((n) => `- ${n}`).join("\n");
  const how = [d.carrier ? `Sent with ${d.carrier}.` : null, d.trackingRef ? `Tracking reference: ${d.trackingRef}.` : null].filter(Boolean).join(" ");
  const text = `Hello ${d.name},\n\nYour free Duratek samples have been sent:\n\n${list}\n\n${how ? `${how}\n\n` : ""}${d.note ? `${d.note}\n\n` : ""}Duratek`;
  const html = `<p>Hello ${escapeHtml(d.name)},</p><p>Your free Duratek samples have been sent:</p><ul>${d.finishes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>${how ? `<p>${escapeHtml(how)}</p>` : ""}${d.note ? `<p>${escapeHtml(d.note)}</p>` : ""}<p>Duratek</p>`;
  return { subject: "Your Duratek samples are on their way", text, html };
}
