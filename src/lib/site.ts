/** Public origin for absolute URLs (sitemap, structured data, social images). */
export function siteUrl(path = ""): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${base}${path.startsWith("/") || path === "" ? path : `/${path}`}`;
}

/** Built public pages, for the sitemap. Add routes here as they are built. */
export const PUBLIC_ROUTES = ["/", "/range", "/explore", "/inspiration", "/technology", "/warranty", "/samples", "/where-to-buy", "/contact", "/trade", "/trade/apply", "/privacy", "/privacy/request", "/cookies", "/terms"] as const;
