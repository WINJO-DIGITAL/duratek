import { z } from "zod";

export const PRIVACY_KINDS = [
  { value: "access", label: "See the information you hold about me" },
  { value: "erase", label: "Delete my information" },
  { value: "withdraw_marketing", label: "Stop sending me marketing" },
  { value: "correct", label: "Correct my information" },
  { value: "other", label: "Something else" },
] as const;

export const privacyRequestSchema = z.object({
  email: z.string().trim().toLowerCase().max(254, "That's too long.").pipe(z.email("Enter a valid email address.")),
  kind: z.enum(["access", "erase", "withdraw_marketing", "correct", "other"], "Choose what you'd like."),
  details: z
    .string()
    .trim()
    .max(2000, "Please keep it under 2,000 characters.")
    .transform((v) => v || null),
});
export type PrivacyRequestInput = z.infer<typeof privacyRequestSchema>;

export type PrivacyRequestState =
  | { status: "idle" }
  | { status: "error"; message?: string; errors: Partial<Record<"email" | "kind" | "details", string>>; values: Record<string, string> }
  | { status: "sent"; email: string };

/** A filename-safe slug of an email address for the export download. */
export function exportFilename(email: string, date = new Date()): string {
  const safe = email.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "person";
  return `duratek-data-${safe}-${date.toISOString().slice(0, 10)}.json`;
}
