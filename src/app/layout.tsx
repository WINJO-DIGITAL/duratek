import type { Metadata, Viewport } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import { MobileBottomBar } from "@/components/layout/mobile-bottom-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getNavData } from "@/lib/catalogue/nav";
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
  themeColor: "#f7f6f2",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const nav = await getNavData();
  return (
    <html lang="en-GB" className={`${heading.variable} ${body.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col pb-[calc(var(--spacing-bottom-bar)+env(safe-area-inset-bottom))] lg:pb-0">
        <a
          href="#main"
          className="sr-only z-50 bg-navy px-4 py-3 text-off-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <SiteHeader nav={nav} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <MobileBottomBar />
      </body>
    </html>
  );
}
