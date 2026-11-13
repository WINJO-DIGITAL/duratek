/**
 * Which deployment this is. Vercel sets VERCEL_ENV to "production", "preview"
 * or "development". Locally and in the test runs it is unset, and those runs
 * are treated as safe: they use placeholder keys and no real addresses.
 *
 * Preview and development builds currently read and write the live database
 * (see docs/ENVIRONMENTS.md). Until they have their own database, they must not
 * send real email to customers, and they must not run the retention purge.
 */
export function isPreviewDeployment(env: Record<string, string | undefined> = process.env): boolean {
  return env.VERCEL_ENV === "preview" || env.VERCEL_ENV === "development";
}

/** Emails are not sent from a preview, unless someone sets ALLOW_EMAIL_FROM_PREVIEW=true on purpose. */
export function outboundEmailSuppressed(env: Record<string, string | undefined> = process.env): boolean {
  return isPreviewDeployment(env) && env.ALLOW_EMAIL_FROM_PREVIEW !== "true";
}
