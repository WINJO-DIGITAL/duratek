import { z } from "zod";
import { normalisePostcode } from "@/lib/postcode";

export const TRADE_TYPES = [
  { value: "fitter", label: "Fitter" },
  { value: "retailer", label: "Retailer" },
  { value: "contractor", label: "Contractor" },
  { value: "specifier", label: "Specifier" },
] as const;

export type TradeType = (typeof TRADE_TYPES)[number]["value"];

/** Text fields of the application form, as named in the form. */
export const TRADE_FIELDS = [
  "company_name",
  "contact_name",
  "email",
  "phone",
  "trade_type",
  "address_line1",
  "address_line2",
  "town",
  "postcode",
  "company_number",
  "vat_number",
  "website",
  "additional_info",
] as const;
export type TradeField = (typeof TRADE_FIELDS)[number] | "password";

export const PASSWORD_MIN = 10;

const text = (max: number, message: string) => z.string().trim().min(1, message).max(max, "That's too long.");

/** Server-side validation for a trade application. */
export const tradeApplicationSchema = z.object({
  company_name: text(200, "Enter your company name."),
  contact_name: text(200, "Enter your name."),
  email: z.string().trim().toLowerCase().max(254, "That's too long.").pipe(z.email("Enter a valid email address.")),
  phone: z
    .string()
    .trim()
    .min(1, "Enter a phone number, so we can check your details.")
    .max(30, "That's too long.")
    .refine((v) => /^[0-9+()\s-]{7,30}$/.test(v), "Enter a valid phone number."),
  trade_type: z.enum(["fitter", "retailer", "contractor", "specifier"], { message: "Choose what best describes you." }),
  address_line1: text(200, "Enter your business address."),
  address_line2: z.string().trim().max(200, "That's too long."),
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
  /** Companies House number: 8 characters, e.g. 12345678 or SC123456. Optional (sole traders have none). */
  company_number: z
    .string()
    .trim()
    .toUpperCase()
    .transform((v) => v.replace(/\s+/g, ""))
    .refine((v) => v === "" || /^(SC|NI|OC|SO|NC|R0|[0-9]{2})[0-9]{6}$/.test(v), "Enter an 8-character company number, like 12345678 or SC123456."),
  /** UK VAT number, with or without GB. Optional. */
  vat_number: z
    .string()
    .trim()
    .toUpperCase()
    .transform((v) => v.replace(/\s+/g, ""))
    .transform((v) => (/^[0-9]{9}$|^[0-9]{12}$/.test(v) ? `GB${v}` : v))
    .refine((v) => v === "" || /^GB([0-9]{9}|[0-9]{12}|GD[0-9]{3}|HA[0-9]{3})$/.test(v), "Enter a UK VAT number, like GB123456789."),
  website: z
    .string()
    .trim()
    .max(300, "That's too long.")
    .transform((v) => (v === "" ? "" : /^https?:\/\//i.test(v) ? v.replace(/^http:/i, "https:") : `https://${v}`))
    .refine((v) => v === "" || /^https:\/\/[^\s/]+\.[^\s]+$/.test(v), "Enter your website address."),
  additional_info: z.string().trim().max(2000, "Please keep this under 2,000 characters."),
  password: z
    .string()
    .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
    .max(72, "Use 72 characters or fewer."),
});

export type TradeApplication = z.infer<typeof tradeApplicationSchema>;

export type TradeApplicationState =
  | { status: "idle" }
  | {
      status: "error";
      message?: string;
      errors: Partial<Record<TradeField, string>>;
      /** Echoed back so the form keeps what was typed; never the password. */
      values: Partial<Record<(typeof TRADE_FIELDS)[number], string>>;
    }
  | { status: "sent"; firstName: string; email: string };

export function readTradeForm(form: FormData) {
  const get = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : "";
  };
  return {
    company_name: get("company_name"),
    contact_name: get("contact_name"),
    email: get("email"),
    phone: get("phone"),
    trade_type: get("trade_type"),
    address_line1: get("address_line1"),
    address_line2: get("address_line2"),
    town: get("town"),
    postcode: get("postcode"),
    company_number: get("company_number"),
    vat_number: get("vat_number"),
    website: get("website"),
    additional_info: get("additional_info"),
    password: get("password"),
  };
}
