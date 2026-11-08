export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);
/** Share tokens: URL-safe base64, at least 20 characters. */
export const isShareToken = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{20,64}$/.test(v);
