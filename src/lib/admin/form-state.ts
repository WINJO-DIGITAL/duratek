import type { FieldErrors } from "@/lib/trade/quote-forms";

/** Result of an admin form action: field errors keep what was typed. */
export type AdminFormState =
  | { status: "idle" }
  | { status: "saved"; message: string }
  | { status: "error"; errors: FieldErrors; message?: string; values?: Record<string, string> };

export const IDLE: AdminFormState = { status: "idle" };
