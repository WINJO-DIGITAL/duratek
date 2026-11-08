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

export const stockistSchema = z.object({
  name: z.string().trim().min(1, "Enter the business name.").max(200, "That's too long."),
  type: z.enum(STOCKIST_TYPES, "Choose a type."),
  address: z.string().trim().min(1, "Enter the address.").max(400, "That's too long."),
  postcode,
  phone: optional(30).refine((v) => v === null || /^[0-9+()\s-]{7,30}$/.test(v), "Enter a valid phone number."),
  website: httpsUrl("Enter a web address starting https://"),
  published: z.boolean(),
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
      published: form.get("published") === "on",
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
