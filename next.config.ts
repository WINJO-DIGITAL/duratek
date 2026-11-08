import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
  : undefined;

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    // Admin uploads (PDFs, photographs) up to 4 MB; Vercel functions accept 4.5 MB bodies.
    serverActions: { bodySizeLimit: "4mb" },
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [70, 80],
    remotePatterns: [
      // Demo photography from the Kwik Floors Duratek collection. Remove once
      // the client's own photography is in Supabase Storage.
      { protocol: "https", hostname: "cdn.shopify.com", pathname: "/s/files/1/1032/3902/4989/**" },
      ...(supabaseUrl
        ? [
            {
              protocol: supabaseUrl.protocol.replace(":", "") as "http" | "https",
              hostname: supabaseUrl.hostname,
              port: supabaseUrl.port,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
