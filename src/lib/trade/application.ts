import { z } from "zod";

export const TRADE_TYPES = [
  { value: "fitter", label: "Fitter" },
  { value: "retailer", label: "Retailer" },
  { value: "contractor", label: "Contractor" },
  { value: "specifier", label: "Specifier" },
] as const;

export type TradeType = (typeof TRADE_TYPES)[number]["value"];

/** Text fields of the application form, as named in the form. */
export const TRADE_FIELDS = ["company_name", "contact_name", "email", "phone", "trade_type"] as const;
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
    password: get("password"),
  };
}
