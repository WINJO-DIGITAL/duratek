import "server-only";

/**
 * Fetches an image for a generated social image as a data URL. The image
 * renderer only reads PNG and JPEG, so anything else (or any failure) falls
 * back to `fallback` (typically the blur placeholder), never an error.
 */
export async function ogImageData(src: string | undefined, fallback?: string): Promise<string | undefined> {
  if (!src) return fallback;
  try {
    const url = new URL(src);
    if (url.hostname === "cdn.shopify.com") url.searchParams.set("width", "800");
    const res = await fetch(url, { headers: { accept: "image/jpeg,image/png" }, signal: AbortSignal.timeout(6000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/^image\/(jpeg|png)/.test(type)) return fallback;
    return `data:${type.split(";")[0]};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return fallback;
  }
}
