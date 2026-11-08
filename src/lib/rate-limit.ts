import { createHash } from "node:crypto";

/**
 * Best-effort, in-memory sliding window per key, per server instance. Pair it
 * with a database count where the limit must hold across instances.
 */
export function createLimiter({ max, windowMs }: { max: number; windowMs: number }) {
  const hits = new Map<string, number[]>();
  return function allow(key: string, now = Date.now()): boolean {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) hits.clear(); // bound memory
    return true;
  };
}

/** A hashed client address from request headers: never stored or logged in the clear. */
export function clientKey(h: Headers): string {
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(ip).digest("hex");
}
