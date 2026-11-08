/** PostgREST's "function not found": a migration hasn't been applied yet. */
export function isMissingFunction(error: { code?: string }): boolean {
  return error.code === "PGRST202" || error.code === "42883";
}
