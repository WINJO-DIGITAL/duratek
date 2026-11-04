import { z } from "zod";
import { SAMPLE_LIMIT } from "@/lib/config";
import { normalisePostcode } from "@/lib/postcode";

/** Fields of the sample request form, as named in the form. */
export const SAMPLE_FIELDS = ["name", "email", "phone", "address_line1", "address_line2", "town", "postcode"] as const;
export type SampleField = (typeof SAMPLE_FIELDS)[number];

const text = (max: number, message: string) => z.string().trim().min(1, message).max(max, "That's too long.");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "That's too long.")
    .transform((v) => v || null);

/** Server-side validation for a sample request. */
export const sampleRequestSchema = z.object({
  name: text(200, "Enter your name."),
  email: z.string().trim().toLowerCase().max(254, "That's too long.").pipe(z.email("Enter a valid email address.")),
  phone: optionalText(30).refine((v) => v === null || /^[0-9+()\s-]{7,30}$/.test(v), "Enter a valid phone number."),
  address_line1: text(200, "Enter the first line of your address."),
  address_line2: optionalText(200),
  town: text(100, "Enter your town or city."),
  postcode: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const pc = normalisePostcode(v);
      if (!pc) {
        ctx.addIssue({ code: "custom", message: "Enter a valid UK postcode." });
        return z.NEVER;
      }
      return pc;
    }),
  finish_ids: z
    .array(z.uuid())
    .min(1, "Choose at least one finish.")
    .max(SAMPLE_LIMIT, `You can order up to ${SAMPLE_LIMIT} samples.`)
    .refine((ids) => new Set(ids).size === ids.length, "Each finish can only be chosen once."),
  marketing_opt_in: z.boolean(),
});

export type SampleRequest = z.infer<typeof sampleRequestSchema>;

export type SampleRequestState =
  | { status: "idle" }
  | {
      status: "error";
      message?: string;
      errors: Partial<Record<SampleField | "finish_ids", string>>;
      values: Partial<Record<SampleField, string>> & { marketing_opt_in?: boolean };
    }
  | { status: "sent"; firstName: string; email: string; finishes: string[] };

/** Reads the form into the shape the schema expects. */
export function readSampleForm(form: FormData) {
  const get = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : "";
  };
  return {
    name: get("name"),
    email: get("email"),
    phone: get("phone"),
    address_line1: get("address_line1"),
    address_line2: get("address_line2"),
    town: get("town"),
    postcode: get("postcode"),
    finish_ids: form.getAll("finish_id").filter((v): v is string => typeof v === "string"),
    marketing_opt_in: form.get("marketing_opt_in") === "on",
  };
}
