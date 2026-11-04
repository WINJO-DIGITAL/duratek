import type { MetadataRoute } from "next";
import { getFinishes } from "@/lib/catalogue";
import { PUBLIC_ROUTES, siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const finishes = await getFinishes();
  return [
    ...PUBLIC_ROUTES.map((path) => ({
      url: siteUrl(path),
      changeFrequency: "weekly" as const,
      priority: path === "/" ? 1 : path === "/range" ? 0.9 : 0.6,
    })),
    ...finishes.map((f) => ({ url: siteUrl(`/range/${f.slug}`), changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
