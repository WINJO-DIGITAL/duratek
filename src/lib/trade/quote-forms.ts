import { z } from "zod";
import { inputToPence } from "@/lib/money";
import { normalisePostcode } from "@/lib/postcode";
import { percentToBp } from "@/lib/pricing/margin";

/** Errors keyed by field name, for showing next to the field. */
export type FieldErrors = Record<string, string>;
export type Parsed<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors };

const str = (form: FormData, k: string) => {
  const v = form.get(k);
  return typeof v === "string" ? v : "";
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "That's too long.")
    .transform((v) => v || null);

const pounds = (message: string, { required }: { required: boolean }) =>
  z.string().transform((v, ctx) => {
    const p = inputToPence(v);
    if (p === undefined || (required && p === null)) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return p;
  });

const decimal = (message: string, min: number, max: number) =>
  z.string().transform((v, ctx) => {
    const t = v.trim().replace(/,/g, "");
    const n = /^\d{1,6}(\.\d{1,2})?$/.test(t) ? Number(t) : Number.NaN;
    if (!(n >= min && n <= max)) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return n;
  });

function collect<T>(result: z.ZodSafeParseResult<T>): Parsed<T> {
  if (result.success) return { ok: true, data: result.data };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

// ---------------------------------------------------------------------------
// Quote header
// ---------------------------------------------------------------------------
export const quoteHeaderSchema = z.object({
  customer_name: z.string().trim().min(1, "Enter your customer's name.").max(200, "That's too long."),
  customer_email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "That's too long.")
    .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address.")
    .transform((v) => v || null),
  customer_phone: optionalText(30).refine((v) => v === null || /^[0-9+()\s-]{7,30}$/.test(v), "Enter a valid phone number."),
  site_address: z.string().trim().max(400, "That's too long."),
  site_postcode: z
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
  notes: z.string().trim().max(4000, "That's too long."),
  valid_until: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), "Enter a date.")
    .transform((v) => v || null),
  vat_rate_bp: z.enum(["0", "2000"], "Choose a VAT rate.").transform(Number),
});
export type QuoteHeader = z.infer<typeof quoteHeaderSchema>;

export function parseQuoteHeader(form: FormData): Parsed<QuoteHeader> {
  return collect(
    quoteHeaderSchema.safeParse({
      customer_name: str(form, "customer_name"),
      customer_email: str(form, "customer_email"),
      customer_phone: str(form, "customer_phone"),
      site_address: str(form, "site_address"),
      site_postcode: str(form, "site_postcode"),
      notes: str(form, "notes"),
      valid_until: str(form, "valid_until"),
      vat_rate_bp: str(form, "vat_rate_bp") || "2000",
    }),
  );
}

// ---------------------------------------------------------------------------
// Lines
// ---------------------------------------------------------------------------
export const flooringLineSchema = z.object({
  finish_id: z.uuid("Choose a finish."),
  area_m2: decimal("Enter the floor area in m², like 18.5.", 0.1, 100000),
  wastage_pct: decimal("Wastage is 0 to 50%.", 0, 50),
  /** Sell price per m² before VAT; blank uses the trader's default markup on their price. */
  sell_per_m2_pence: pounds("Enter a price, like 34.99.", { required: false }),
});
export type FlooringLine = z.infer<typeof flooringLineSchema>;

export function parseFlooringLine(form: FormData): Parsed<FlooringLine> {
  return collect(
    flooringLineSchema.safeParse({
      finish_id: str(form, "finish_id"),
      area_m2: str(form, "area_m2"),
      wastage_pct: str(form, "wastage_pct") || "10",
      sell_per_m2_pence: str(form, "sell_per_m2"),
    }),
  );
}

export const OTHER_LINE_KINDS = ["accessory", "labour", "other"] as const;
export const LINE_UNITS = ["item", "m2", "metre", "hour", "pack"] as const;

export const otherLineSchema = z.object({
  kind: z.enum(OTHER_LINE_KINDS, "Choose a type."),
  description: z.string().trim().min(1, "Describe the item.").max(300, "That's too long."),
  quantity: decimal("Enter a quantity, like 1 or 2.5.", 0.01, 100000),
  unit: z.enum(LINE_UNITS, "Choose a unit."),
  unit_cost_pence: pounds("Enter your cost, like 4.50, or leave blank.", { required: false }).transform((v) => v ?? 0),
  unit_sell_pence: pounds("Enter the price, like 6.99.", { required: true }).transform((v) => v as number),
});
export type OtherLine = z.infer<typeof otherLineSchema>;

export function parseOtherLine(form: FormData): Parsed<OtherLine> {
  return collect(
    otherLineSchema.safeParse({
      kind: str(form, "kind"),
      description: str(form, "description"),
      quantity: str(form, "quantity"),
      unit: str(form, "unit"),
      unit_cost_pence: str(form, "unit_cost"),
      unit_sell_pence: str(form, "unit_sell"),
    }),
  );
}

// ---------------------------------------------------------------------------
// Trader preferences
// ---------------------------------------------------------------------------
export interface Preferences {
  default_markup_bp: number;
  default_wastage_pct: number;
  vat_registered: boolean;
  quote_footer: string;
}

export const DEFAULT_PREFERENCES: Preferences = {
  default_markup_bp: 3000,
  default_wastage_pct: 10,
  vat_registered: true,
  quote_footer: "",
};

export function parsePreferences(form: FormData): Parsed<Preferences> {
  const errors: FieldErrors = {};
  const markup = percentToBp(str(form, "default_markup"), { min: 0, max: 1000 });
  if (markup == null) errors.default_markup = "Enter a markup from 0 to 1000%.";
  const wastage = Number(str(form, "default_wastage").trim());
  if (!/^\d{1,2}(\.\d)?$/.test(str(form, "default_wastage").trim()) || wastage > 50) errors.default_wastage = "Wastage is 0 to 50%.";
  const footer = str(form, "quote_footer").trim();
  if (footer.length > 2000) errors.quote_footer = "That's too long.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      default_markup_bp: markup as number,
      default_wastage_pct: wastage,
      vat_registered: form.get("vat_registered") === "on",
      quote_footer: footer,
    },
  };
}

/** The text a form sent, so a form with errors can be shown again as typed (React resets fields after an action). */
export function echo(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string" && !k.startsWith("$")) out[k] = v.slice(0, 4000);
  return out;
}
