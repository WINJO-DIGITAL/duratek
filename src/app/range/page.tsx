import type { Metadata } from "next";
import { Suspense } from "react";
import { SectionIntro } from "@/components/content/section-intro";
import { FinishCard } from "@/components/finish/finish-card";
import { RangeBrowser, RangeGrid, type RangeItem } from "@/components/finish/range-browser";
import { ButtonLink } from "@/components/ui/button";
import { PageTransition } from "@/components/layout/page-transition";
import { byTone, getFinishes, imagesOfKind } from "@/lib/catalogue";
import { FORMAT_LABELS, formatOptions, plankFormat } from "@/lib/catalogue/format";
import { colourFamilyLabel } from "@/lib/config";
import { countWord } from "@/lib/number-words";

export const metadata: Metadata = {
  title: "The range",
  description:
    "Every Duratek finish. Waterproof SPC click flooring in straight plank, with Scratch Shield surface protection.",
};

export default async function RangePage() {
  // Light to dark, measured from each swatch, so the grid reads as one palette.
  const finishes = byTone(await getFinishes());
  const items: RangeItem[] = finishes.map((f, i) => {
    const format = plankFormat(f.specs);
    return {
      id: f.id,
      name: f.name,
      style: f.style,
      colourFamily: f.colourFamily,
      format,
      keywords: [colourFamilyLabel(f.colourFamily), format && FORMAT_LABELS[format]].filter(Boolean).join(" "),
      card: (
        <FinishCard
          finish={f}
          priority={i < 3}
          headingLevel="h2"
          sizes="(min-width: 1024px) 31vw, 48vw"
        />
      ),
    };
  });

  // One swatch per colour family for the round filter chips.
  const colourSwatches: Record<string, string> = {};
  for (const f of finishes) {
    const sw = imagesOfKind(f, "swatch")[0];
    if (sw && !colourSwatches[f.colourFamily]) colourSwatches[f.colourFamily] = sw.src;
  }

  return (
    <PageTransition>
      <div className="container-page pb-section pt-12 sm:pt-16">
        <SectionIntro as="h1" size="lg" eyebrow="The range" title={`${countWord(finishes.length)} ${finishes.length === 1 ? "finish" : "finishes"}, light to dark`}>
          <p>
            Every one has a 0.55mm wear layer, Scratch Shield surface protection and a waterproof rigid SPC core.
            Choose up to three free samples.
          </p>
        </SectionIntro>
        <ButtonLink href="/explore" variant="quiet" className="mt-4">
          Explore them full screen
        </ButtonLink>
        <div className="mt-10">
          {/* The fallback is the full, unfiltered grid: works without JavaScript. */}
          <Suspense fallback={<RangeGrid items={items} />}>
            <RangeBrowser items={items} formats={formatOptions(finishes)} colourSwatches={colourSwatches} />
          </Suspense>
        </div>
      </div>
    </PageTransition>
  );
}
