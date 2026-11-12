import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { DM_Mono, DM_Sans, Manrope } from "next/font/google";
import { MobileBottomBar } from "@/components/layout/mobile-bottom-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { RevealObserver } from "@/components/layout/reveal-observer";
import { RouteScrollReset } from "@/components/layout/route-scroll-reset";
import { SiteHeader } from "@/components/layout/site-header";
import { SampleTray } from "@/components/samples/sample-tray";
import { JsonLd } from "@/components/seo/json-ld";
import { getNavData } from "@/lib/catalogue/nav";
import { siteUrl } from "@/lib/site";
import "./globals.css";

// Headings and product titles.
const heading = Manrope({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

// Body, navigation and buttons.
const body = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

// Data: measurements and specifications.
const data = DM_Mono({
  variable: "--font-data",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Duratek | Waterproof SPC click flooring",
    template: "%s | Duratek",
  },
  description:
    "Beautifully considered. Built to perform. Waterproof rigid SPC click flooring with a 0.55mm wear layer and Scratch Shield surface protection.",
};

export const viewport: Viewport = {
  themeColor: "#faf7f1",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const nav = await getNavData();
  return (
    <html lang="en-GB" className={`${heading.variable} ${body.variable} ${data.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col pb-[calc(var(--spacing-bottom-bar)+env(safe-area-inset-bottom))] lg:pb-0">
        <a
          href="#main"
          className="sr-only z-50 bg-navy px-4 py-3 text-off-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <RevealObserver />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Duratek",
            url: siteUrl("/"),
            logo: siteUrl("/icon.svg"),
          }}
        />
        {/* The chrome reads the URL (active links), which isn't known when the finish page's
            fallback shell is regenerated, so each piece loads behind a boundary. The header's
            fallback holds its space, so nothing moves. */}
        <Suspense fallback={<div aria-hidden="true" className="h-[calc(var(--spacing-header)+1px)]" />}>
          <SiteHeader nav={nav} />
        </Suspense>
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        {/* After the page content, so it runs after Next's own scroll handling. */}
        <Suspense fallback={null}>
          <RouteScrollReset />
        </Suspense>
        <Suspense fallback={null}>
          <MobileBottomBar />
          <SampleTray catalogue={nav.catalogue} />
        </Suspense>
      </body>
    </html>
  );
}
