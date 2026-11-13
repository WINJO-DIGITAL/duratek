import { z } from "zod";
import type { FieldErrors, Parsed } from "./quote-forms";

export const SHORTLIST_MAX = 24;

export const shortlistSchema = z.object({
  name: z.string().trim().min(1, "Give the shortlist a name, like “Smith kitchen”.").max(120, "That's too long."),
  finish_ids: z
    .array(z.uuid())
    .min(1, "Choose at least one finish.")
    .max(SHORTLIST_MAX, `Choose up to ${SHORTLIST_MAX} finishes.`)
    .transform((ids) => [...new Set(ids)]),
});
export type ShortlistInput = z.infer<typeof shortlistSchema>;

export function parseShortlist(form: FormData): Parsed<ShortlistInput> {
  const r = shortlistSchema.safeParse({
    name: typeof form.get("name") === "string" ? form.get("name") : "",
    finish_ids: form.getAll("finish_id").filter((v): v is string => typeof v === "string"),
  });
  if (r.success) return { ok: true, data: r.data };
  const errors: FieldErrors = {};
  for (const i of r.error.issues) errors[String(i.path[0])] ??= i.message;
  return { ok: false, errors };
}
