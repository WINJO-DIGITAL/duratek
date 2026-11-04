import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { MobileBottomBar } from "@/components/layout/mobile-bottom-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

const serif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const sans = Inter({
  variable: "--font-inter",
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
  themeColor: "#fbfaf6",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${serif.variable} ${sans.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col pb-[calc(var(--spacing-bottom-bar)+env(safe-area-inset-bottom))] lg:pb-0">
        <a
          href="#main"
          className="sr-only z-50 bg-navy px-4 py-3 text-cream focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <MobileBottomBar />
      </body>
    </html>
  );
}
