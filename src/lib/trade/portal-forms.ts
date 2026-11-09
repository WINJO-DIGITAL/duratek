import { z } from "zod";
import { normalisePostcode } from "@/lib/postcode";
import type { FieldErrors, Parsed } from "./quote-forms";

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

const postcode = z
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
  });

/** Metres, up to 2 decimal places: "4.2", "4,2" or "420cm" are all 4.2. Blank is null. */
const metres = (message: string) =>
  z.string().transform((v, ctx) => {
    let t = v.trim().toLowerCase().replace(",", ".");
    if (t === "") return null;
    let factor = 1;
    if (t.endsWith("cm")) [t, factor] = [t.slice(0, -2).trim(), 0.01];
    else if (t.endsWith("mm")) [t, factor] = [t.slice(0, -2).trim(), 0.001];
    else if (t.endsWith("m")) t = t.slice(0, -1).trim();
    const n = /^\d{1,5}(\.\d{1,3})?$/.test(t) ? Math.round(Number(t) * factor * 100) / 100 : Number.NaN;
    if (!(n > 0 && n <= 1000)) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return n;
  });

// ---------------------------------------------------------------------------
export const customerSchema = z.object({
  name: z.string().trim().min(1, "Enter the customer's name.").max(200, "That's too long."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "That's too long.")
    .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address.")
    .transform((v) => v || null),
  phone: optional(30).refine((v) => v === null || /^[0-9+()\s-]{7,30}$/.test(v), "Enter a valid phone number."),
  address: z.string().trim().max(400, "That's too long."),
  postcode,
  notes: z.string().trim().max(2000, "That's too long."),
});
export type CustomerInput = z.infer<typeof customerSchema>;

export function parseCustomer(form: FormData): Parsed<CustomerInput> {
  return collect(customerSchema.safeParse(Object.fromEntries(["name", "email", "phone", "address", "postcode", "notes"].map((k) => [k, str(form, k)]))));
}

// ---------------------------------------------------------------------------
export const projectSchema = z.object({
  name: z.string().trim().min(1, "Give the project a name, like “Smith kitchen and hall”.").max(120, "That's too long."),
  customer_id: z
    .string()
    .trim()
    .transform((v) => v || null)
    .refine((v) => v === null || z.uuid().safeParse(v).success, "Choose a customer."),
  site_postcode: postcode,
  notes: z.string().trim().max(4000, "That's too long."),
});
export type ProjectInput = z.infer<typeof projectSchema>;

export function parseProject(form: FormData): Parsed<ProjectInput> {
  return collect(projectSchema.safeParse(Object.fromEntries(["name", "customer_id", "site_postcode", "notes"].map((k) => [k, str(form, k)]))));
}

// ---------------------------------------------------------------------------
export const roomSchema = z
  .object({
    room_name: z.string().trim().min(1, "Name the room, like Kitchen.").max(120, "That's too long."),
    length_m: metres("Enter the length in metres, like 4.2."),
    width_m: metres("Enter the width in metres, like 3.6."),
    wastage_pct: z.string().transform((v, ctx) => {
      const t = v.trim().replace(/%$/, "");
      const n = /^\d{1,2}(\.\d)?$/.test(t) ? Number(t) : Number.NaN;
      if (!(n >= 0 && n <= 50)) {
        ctx.addIssue({ code: "custom", message: "Wastage is 0 to 50%." });
        return z.NEVER;
      }
      return n;
    }),
    finish_id: z
      .string()
      .trim()
      .transform((v) => v || null)
      .refine((v) => v === null || z.uuid().safeParse(v).success, "Choose a finish."),
  })
  .refine((r) => r.length_m !== null && r.width_m !== null, { message: "Enter the length and the width.", path: ["length_m"] });
export type RoomInput = z.infer<typeof roomSchema>;

export function parseRoom(form: FormData): Parsed<RoomInput> {
  return collect(roomSchema.safeParse(Object.fromEntries(["room_name", "length_m", "width_m", "wastage_pct", "finish_id"].map((k) => [k, str(form, k)]))));
}
