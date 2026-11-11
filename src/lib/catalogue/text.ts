/**
 * Splits a finish description into its first sentence (its character, set
 * large under the name) and the rest. A description of one sentence has no rest.
 */
export function splitLead(text: string): { lead: string; rest: string } {
  const t = text.trim();
  const m = /^(.+?[.!?])(?:\s+|$)([\s\S]*)$/.exec(t);
  if (!m) return { lead: t, rest: "" };
  return { lead: m[1].trim(), rest: m[2].trim() };
}
