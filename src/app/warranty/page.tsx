import type { Metadata } from "next";
import { PageTransition } from "@/components/layout/page-transition";
import Link from "next/link";
import { SectionIntro } from "@/components/content/section-intro";
import { WarrantyBadges, WarrantyDisclaimer } from "@/components/content/warranty";
import { FinishImage } from "@/components/finish/finish-image";
import { getFinishes } from "@/lib/catalogue";
import { imagePool } from "@/lib/catalogue/image-pool";

export const metadata: Metadata = {
  title: "Warranty",
  description:
    "Duratek residential lifetime warranty (25 years) and 10 year commercial warranty for light and medium traffic areas.",
};

export default async function WarrantyPage() {
  const finishes = await getFinishes();
  const image = imagePool(finishes, "room").at(-1);

  return (
    <PageTransition>
      <>
        <header className="container-page grid gap-10 pb-section-sm pt-12 sm:pt-16 lg:grid-cols-2 lg:items-end">
          <SectionIntro as="h1" size="lg" eyebrow="Duratek warranty" title="Confidence for years to come." />
          <div className="lg:justify-self-end">
            <WarrantyBadges />
          </div>
        </header>

        {/* The disclaimer leads: it governs everything below. */}
        <div className="container-page">
          <div className="border-l-2 border-green-ink bg-white px-5 py-4 sm:px-6">
            <WarrantyDisclaimer className="text-[0.875rem] text-navy" />
          </div>
        </div>

        <section className="py-section" aria-label="Warranty cover">
          <div className="container-page">
            <div className="grid gap-px border border-line bg-line md:grid-cols-2">
              <div className="bg-off-white p-6 sm:p-10">
                <p className="eyebrow">Residential</p>
                <h2 className="mt-3 text-display-md text-navy">Lifetime warranty</h2>
                <p className="mt-4 text-lede text-ink-muted">
                  For homes. Residential lifetime is defined as{" "}
                  <strong className="font-semibold text-navy">25 years</strong>.
                </p>
              </div>
              <div className="bg-off-white p-6 sm:p-10">
                <p className="eyebrow">Commercial</p>
                <h2 className="mt-3 text-display-md text-navy">10 year warranty</h2>
                <p className="mt-4 text-lede text-ink-muted">
                  For <strong className="font-semibold text-navy">light and medium traffic</strong> commercial areas.
                  Not applicable to heavy traffic areas.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-section">
          <div className="container-page grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-16">
            {image && (
              <div className="relative aspect-[4/3] overflow-hidden bg-line lg:col-span-6">
                <FinishImage image={image.image} sizes="(min-width: 1024px) 50vw, 100vw" />
              </div>
            )}
            <div className="lg:col-span-5 lg:col-start-8">
              <SectionIntro eyebrow="Getting the most from it" title="Fitted properly. Cared for simply.">
                <p>
                  Always follow the product&apos;s installation and care guidance, including subfloor preparation. Ask
                  for the exact product&apos;s technical sheet, warranty and applicable independent test certificates
                  for full details.
                </p>
              </SectionIntro>
              <p className="mt-6">
                <Link
                  href="/contact"
                  className="inline-flex min-h-tap items-center text-navy underline underline-offset-4 hover:text-green-ink"
                >
                  Ask us about the warranty
                </Link>
              </p>
            </div>
          </div>
        </section>
      </>
    </PageTransition>
  );
}
