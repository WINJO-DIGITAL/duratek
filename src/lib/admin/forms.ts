import { z } from "zod";
import { normalisePostcode } from "@/lib/postcode";
import type { FieldErrors, Parsed } from "@/lib/trade/quote-forms";

const str = (form: FormData, k: string) => {
  const v = form.get(k);
  return typeof v === "string" ? v : "";
};

function collect<T>(r: z.ZodSafeParseResult<T>): Parsed<T> {
  if (r.success) return { ok: true, data: r.data };
  const errors: FieldErrors = {};
  for (const i of r.error.issues) errors[String(i.path[0] ?? "form")] ??= i.message;
  return { ok: false, errors };
}

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "That's too long.")
    .transform((v) => v || null);

const httpsUrl = (message: string) =>
  z
    .string()
    .trim()
    .max(500, "That's too long.")
    .transform((v, ctx) => {
      if (v === "") return null;
      const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
      try {
        const u = new URL(withScheme);
        if (u.protocol !== "https:" || !u.hostname.includes(".")) throw new Error();
        return u.toString();
      } catch {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
    });

const postcode = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const pc = normalisePostcode(v);
    if (!pc) {
      ctx.addIssue({ code: "custom", message: "Enter a valid UK postcode." });
      return z.NEVER;
    }
    return pc;
  });

// ---------------------------------------------------------------------------
// Stockists and online retailers
// ---------------------------------------------------------------------------
export const STOCKIST_TYPES = ["showroom", "retailer", "fitter"] as const;

const emailField = (message: string) =>
  z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "That's too long.")
    .transform((v, ctx) => {
      if (v === "") return null;
      if (!z.email().safeParse(v).success) {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
      return v;
    });

const dateField = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) {
      ctx.addIssue({ code: "custom", message: "Enter a date." });
      return z.NEVER;
    }
    return v;
  });

export const stockistSchema = z
  .object({
    name: z.string().trim().min(1, "Enter the business name.").max(200, "That's too long."),
    type: z.enum(STOCKIST_TYPES, "Choose a type."),
    address: z.string().trim().min(1, "Enter the address.").max(400, "That's too long."),
    postcode,
    phone: optional(30).refine((v) => v === null || /^[0-9+()\s-]{7,30}$/.test(v), "Enter a valid phone number."),
    website: httpsUrl("Enter a web address starting https://"),
    email: emailField("Enter a valid email address."),
    opening_hours: optional(600),
    description: optional(600),
    published: z.boolean(),
    /** The owner has confirmed these details with the business. Required before it can be published. */
    verified: z.boolean(),
    verification_note: optional(1000),
    // Private to the owner
    lead_email: emailField("Enter a valid email address."),
    admin_note: optional(2000),
    finish_ids: z.array(z.uuid()).max(200),
    price_list_id: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
    terms_note: optional(2000),
    payment_terms: optional(300),
    terms_valid_from: dateField,
    terms_valid_to: dateField,
  })
  .superRefine((v, ctx) => {
    if (v.published && !v.verified) {
      ctx.addIssue({ code: "custom", path: ["published"], message: "Confirm the details with the business and tick Verified before publishing." });
    }
    if (v.terms_valid_from && v.terms_valid_to && v.terms_valid_to <= v.terms_valid_from) {
      ctx.addIssue({ code: "custom", path: ["terms_valid_to"], message: "The end date must be after the start." });
    }
  });
export type StockistInput = z.infer<typeof stockistSchema>;

export function parseStockist(form: FormData): Parsed<StockistInput> {
  return collect(
    stockistSchema.safeParse({
      name: str(form, "name"),
      type: str(form, "type"),
      address: str(form, "address"),
      postcode: str(form, "postcode"),
      phone: str(form, "phone"),
      website: str(form, "website"),
      email: str(form, "email"),
      opening_hours: str(form, "opening_hours"),
      description: str(form, "description"),
      published: form.get("published") === "on",
      verified: form.get("verified") === "on",
      verification_note: str(form, "verification_note"),
      lead_email: str(form, "lead_email"),
      admin_note: str(form, "admin_note"),
      finish_ids: form.getAll("finish_ids").filter((v): v is string => typeof v === "string"),
      price_list_id: str(form, "price_list_id"),
      terms_note: str(form, "terms_note"),
      payment_terms: str(form, "payment_terms"),
      terms_valid_from: str(form, "terms_valid_from"),
      terms_valid_to: str(form, "terms_valid_to"),
    }),
  );
}

export const retailerSchema = z.object({
  name: z.string().trim().min(1, "Enter the retailer's name.").max(120, "That's too long."),
  url: httpsUrl("Enter a web address starting https://").refine((v) => v !== null, "Enter the web address."),
  sort_order: z.coerce.number().int().min(0).max(999).catch(0),
  published: z.boolean(),
});

export function parseRetailer(form: FormData) {
  return collect(
    retailerSchema.safeParse({
      name: str(form, "name"),
      url: str(form, "url"),
      sort_order: str(form, "sort_order") || "0",
      published: form.get("published") === "on",
    }),
  );
}

// ---------------------------------------------------------------------------
// Finishes
// ---------------------------------------------------------------------------
const positive = (message: string, max: number) =>
  z.string().transform((v, ctx) => {
    const t = v.trim();
    if (t === "") return undefined;
    const n = Number(t);
    if (!/^\d{1,5}(\.\d{1,3})?$/.test(t) || n <= 0 || n > max) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return n;
  });

export const finishSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(120, "That's too long."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lower-case letters, numbers and single hyphens, like keswick-oak.")
    .max(80, "That's too long."),
  style: z.enum(["plank", "herringbone"], "Choose a style."),
  colour_family: z.string().trim().toLowerCase().regex(/^[a-z][a-z-]{1,30}$/, "Use a short word, like natural or grey."),
  description: z.string().trim().max(4000, "That's too long."),
  sort_order: z.coerce.number().int().min(0).max(9999).catch(0),
  published: z.boolean(),
  /** Stock code of the default variant, e.g. DT-KESWICK-OAK. Blank: made from the web address. */
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || /^[A-Z0-9][A-Z0-9-]{2,39}$/.test(v), "Use capital letters, numbers and hyphens, like DT-KESWICK-OAK."),
  thickness_mm: positive("Enter the thickness in mm.", 50),
  plank_width_mm: positive("Enter the width in mm.", 5000),
  plank_length_mm: positive("Enter the length in mm.", 5000),
  pack_coverage_m2: positive("Enter m² per pack, like 2.21.", 50),
  wear_layer_mm: positive("Enter the wear layer in mm, like 0.55.", 5),
  format: optional(80),
  edge: optional(80),
});
export type FinishInput = z.infer<typeof finishSchema>;

export const SPEC_NUMBER_KEYS = ["thickness_mm", "plank_width_mm", "plank_length_mm", "pack_coverage_m2", "wear_layer_mm"] as const;
export const SPEC_TEXT_KEYS = ["format", "edge"] as const;

export function parseFinish(form: FormData): Parsed<FinishInput> {
  return collect(
    finishSchema.safeParse({
      name: str(form, "name"),
      slug: str(form, "slug"),
      style: str(form, "style"),
      colour_family: str(form, "colour_family"),
      description: str(form, "description"),
      sort_order: str(form, "sort_order") || "0",
      published: form.get("published") === "on",
      sku: str(form, "sku"),
      ...Object.fromEntries([...SPEC_NUMBER_KEYS, ...SPEC_TEXT_KEYS].map((k) => [k, str(form, k)])),
    }),
  );
}

/**
 * Merges edited spec fields into the stored specs, keeping keys the form
 * doesn't show (core, surface, underlay, click system). Blank removes a value.
 */
export function mergeSpecs(stored: Record<string, unknown>, input: FinishInput): Record<string, unknown> {
  const out: Record<string, unknown> = { ...stored };
  for (const k of [...SPEC_NUMBER_KEYS, ...SPEC_TEXT_KEYS]) {
    const v = input[k];
    if (v === undefined || v === null) delete out[k];
    else out[k] = v;
  }
  return out;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------
export const IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

/** The default variant row for a finish form: measurements and stock code. */
export function variantFromFinish(input: FinishInput) {
  return {
    sku: input.sku || `DT-${input.slug.toUpperCase()}`.slice(0, 40),
    name: input.format || "Standard",
    pack_coverage_m2: input.pack_coverage_m2 ?? null,
    length_mm: input.plank_length_mm !== undefined ? Math.round(input.plank_length_mm) : null,
    width_mm: input.plank_width_mm !== undefined ? Math.round(input.plank_width_mm) : null,
    thickness_mm: input.thickness_mm ?? null,
  };
}

// ---------------------------------------------------------------------------
// Sample dispatch
// ---------------------------------------------------------------------------
export const dispatchSchema = z.object({
  carrier: optional(80),
  tracking_ref: optional(120),
  dispatch_note: optional(500),
  notify_customer: z.boolean(),
});
export type DispatchInput = z.infer<typeof dispatchSchema>;

export function parseDispatch(form: FormData): Parsed<DispatchInput> {
  return collect(
    dispatchSchema.safeParse({
      carrier: str(form, "carrier"),
      tracking_ref: str(form, "tracking_ref"),
      dispatch_note: str(form, "dispatch_note"),
      notify_customer: form.get("notify_customer") === "on",
    }),
  );
}

// ---------------------------------------------------------------------------
// Variants (a pack size or format of a finish)
// ---------------------------------------------------------------------------
export const UNITS_OF_SALE = ["m2", "pack", "item", "linear_metre"] as const;

const decimal = (message: string, max: number) =>
  z.string().transform((v, ctx) => {
    const t = v.trim();
    if (t === "") return null;
    const n = Number(t);
    if (!/^\d{1,5}(\.\d{1,3})?$/.test(t) || n <= 0 || n > max) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return n;
  });

export const variantSchema = z
  .object({
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9][A-Z0-9-]{2,39}$/, "Use 3 to 40 letters, numbers or dashes."),
    name: z.string().trim().min(1, "Enter a name, e.g. Standard pack.").max(120, "That's too long."),
    unit_of_sale: z.enum(UNITS_OF_SALE, "Choose how it is sold."),
    pack_coverage_m2: decimal("Enter the area a pack covers, e.g. 2.21.", 100),
    units_per_pack: decimal("Enter a whole number.", 10000),
    length_mm: decimal("Enter millimetres.", 10000),
    width_mm: decimal("Enter millimetres.", 10000),
    thickness_mm: decimal("Enter millimetres, e.g. 5.", 100),
    vat_percent: decimal("Enter a percentage, e.g. 20.", 100).transform((v) => v ?? 20),
    active: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.unit_of_sale === "pack" && v.pack_coverage_m2 === null && v.units_per_pack === null) {
      ctx.addIssue({ code: "custom", path: ["pack_coverage_m2"], message: "A pack needs the area it covers." });
    }
    if (v.units_per_pack !== null && !Number.isInteger(v.units_per_pack)) {
      ctx.addIssue({ code: "custom", path: ["units_per_pack"], message: "Enter a whole number." });
    }
  });
export type VariantInput = z.infer<typeof variantSchema>;

export function parseVariant(form: FormData): Parsed<VariantInput> {
  return collect(
    variantSchema.safeParse({
      sku: str(form, "sku"),
      name: str(form, "name"),
      unit_of_sale: str(form, "unit_of_sale"),
      pack_coverage_m2: str(form, "pack_coverage_m2"),
      units_per_pack: str(form, "units_per_pack"),
      length_mm: str(form, "length_mm"),
      width_mm: str(form, "width_mm"),
      thickness_mm: str(form, "thickness_mm"),
      vat_percent: str(form, "vat_percent"),
      active: form.get("active") === "on",
    }),
  );
}
