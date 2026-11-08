import { z } from "zod";
import { PASSWORD_MIN } from "@/lib/trade/application";

export const newPasswordSchema = z
  .object({
    password: z.string().min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`).max(72, "Use 72 characters or fewer."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "The two passwords don't match.", path: ["confirm"] });

export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email("Enter your email address."));

export type SimpleFormState =
  | { status: "idle" }
  | { status: "done"; message: string }
  | { status: "error"; message: string; errors?: Record<string, string>; email?: string };
