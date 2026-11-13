/** PostgREST's "function not found": a migration hasn't been applied yet. */
export function isMissingFunction(error: { code?: string }): boolean {
  return error.code === "PGRST202" || error.code === "42883";
}

/** A column, table or function that a pending migration adds is missing. */
export function isMissingSchema(error: { code?: string }): boolean {
  return isMissingFunction(error) || ["42703", "42P01", "PGRST200", "PGRST204", "PGRST205"].includes(error.code ?? "");
}
