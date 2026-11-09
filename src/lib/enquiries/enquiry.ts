import { z } from "zod";
import { normalisePostcode } from "@/lib/postcode";

export const ENQUIRY_FIELDS = ["name", "email", "phone", "postcode", "message"] as const;
export type EnquiryField = (typeof ENQUIRY_FIELDS)[number];

/** Wording recorded with the consent, so what the person agreed to is on file. */
export const STOCKIST_CONSENT_WORDING = (stockistName: string) =>
  `I agree that Duratek may pass my name, email, phone number and message to ${stockistName} so they can reply to me.`;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "That's too long.")
    .transform((v) => v || null);

export const enquirySchema = z
  .object({
    kind: z.enum(["stockist", "product", "contact"]),
    stockist_id: z.uuid().nullable(),
    finish_id: z.uuid().nullable(),
    name: z.string().trim().min(1, "Enter your name.").max(200, "That's too long."),
    email: z.string().trim().toLowerCase().max(254, "That's too long.").pipe(z.email("Enter a valid email address.")),
    phone: optionalText(30).refine((v) => v === null || /^[0-9+()\s-]{7,30}$/.test(v), "Enter a valid phone number."),
    postcode: z
      .string()
      .trim()
      .transform((v, ctx) => {
        if (v === "") return null;
        const pc = normalisePostcode(v);
        if (!pc) {
          ctx.addIssue({ code: "custom", message: "Enter a valid UK postcode." });
          return z.NEVER;
        }
        return pc;
      }),
    message: z.string().trim().min(1, "Write a short message.").max(2000, "Please keep it under 2,000 characters."),
    wants_contact: z.boolean(),
    share_with_stockist: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "stockist" && !v.stockist_id) ctx.addIssue({ code: "custom", path: ["message"], message: "Choose a stockist." });
    if (v.kind === "stockist" && !v.share_with_stockist) {
      ctx.addIssue({ code: "custom", path: ["share_with_stockist"], message: "Tick the box so we can pass your message on." });
    }
  });

export type EnquiryInput = z.infer<typeof enquirySchema>;

export type EnquiryState =
  | { status: "idle" }
  | { status: "error"; message?: string; errors: Partial<Record<EnquiryField | "share_with_stockist", string>>; values: Record<string, string> }
  | { status: "sent"; forwarded: boolean; stockistName: string | null; email: string };

const get = (form: FormData, k: string) => {
  const v = form.get(k);
  return typeof v === "string" ? v : "";
};
const uuidOrNull = (v: string) => (/^[0-9a-f-]{36}$/i.test(v) ? v : null);

export function readEnquiryForm(form: FormData) {
  const stockist = uuidOrNull(get(form, "stockist_id"));
  const finish = uuidOrNull(get(form, "finish_id"));
  return {
    kind: stockist ? "stockist" : finish ? "product" : "contact",
    stockist_id: stockist,
    finish_id: finish,
    name: get(form, "name"),
    email: get(form, "email"),
    phone: get(form, "phone"),
    postcode: get(form, "postcode"),
    message: get(form, "message"),
    wants_contact: get(form, "wants_contact") === "on",
    share_with_stockist: get(form, "share_with_stockist") === "on",
  };
}
