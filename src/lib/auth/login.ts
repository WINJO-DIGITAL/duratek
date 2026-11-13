import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Enter your email address.")),
  password: z.string().min(1, "Enter your password.").max(72),
});

export type LoginState =
  | { status: "idle" }
  | { status: "error"; message: string; email?: string }
  /** Right password, email not yet confirmed. */
  | { status: "unconfirmed"; email: string; resent?: boolean };

export const DEFAULT_AFTER_LOGIN = "/trade/account";

/** Only same-site paths: never an absolute URL, a protocol-relative one or a backslash trick. */
export function safeNext(raw: unknown, fallback = DEFAULT_AFTER_LOGIN): string {
  if (typeof raw !== "string") return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\") || /[\r\n]/.test(raw)) return fallback;
  return raw;
}
