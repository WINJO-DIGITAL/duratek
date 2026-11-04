import type { Metadata } from "next";
import { PageTransition } from "@/components/layout/page-transition";
import { Suspense } from "react";
import { SectionIntro } from "@/components/content/section-intro";
import { FinishCard } from "@/components/finish/finish-card";
import { RangeBrowser, RangeGrid, type RangeItem } from "@/components/finish/range-browser";
import { getFinishes, imagesOfKind } from "@/lib/catalogue";

export const metadata: Metadata = {
  title: "The range",
  description:
    "Every Duratek finish. Waterproof SPC click flooring in straight plank, with Scratch Shield surface protection.",
};

export default async function RangePage() {
  const finishes = await getFinishes();
  const items: RangeItem[] = finishes.map((f, i) => ({
    id: f.id,
    name: f.name,
    style: f.style,
    colourFamily: f.colourFamily,
    card: (
      <FinishCard
        finish={f}
        priority={i < 3}
        headingLevel="h2"
        aspect="aspect-[4/5]"
          media="texture"
        sizes="(min-width: 1024px) 31vw, 48vw"
      />
    ),
  }));

  // One swatch per colour family for the round filter chips.
  const colourSwatches: Record<string, string> = {};
  for (const f of finishes) {
    const sw = imagesOfKind(f, "swatch")[0];
    if (sw && !colourSwatches[f.colourFamily]) colourSwatches[f.colourFamily] = sw.src;
  }

  return (
    <PageTransition>
      <div className="container-page pb-section pt-12 sm:pt-16">
        <SectionIntro as="h1" size="lg" title="The range">
          <p>
            {finishes.length} finishes, every one with a 0.55mm wear layer, Scratch Shield surface protection and a
            waterproof rigid SPC core. Choose up to three free samples.
          </p>
        </SectionIntro>
        <div className="mt-10">
          {/* The fallback is the full, unfiltered grid: works without JavaScript. */}
          <Suspense fallback={<RangeGrid items={items} />}>
            <RangeBrowser items={items} colourSwatches={colourSwatches} />
          </Suspense>
        </div>
      </div>
    </PageTransition>
  );
}
