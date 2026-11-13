import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/content/page-hero";
import { ScratchShieldBadge, WarrantyDisclaimer } from "@/components/content/warranty";
import { SectionIntro } from "@/components/content/section-intro";
import { FinishCard } from "@/components/finish/finish-card";
import { HelpChoose } from "@/components/finish/help-choose";
import { RangeBrowser, RangeGrid, type RangeItem } from "@/components/finish/range-browser";
import { distinct, toneGroups } from "@/lib/catalogue/filter";
import { SamplePromo } from "@/components/samples/sample-promo";
import { ButtonLink } from "@/components/ui/button";
import { PageTransition } from "@/components/layout/page-transition";
import { byTone, getFinishes, imagesOfKind } from "@/lib/catalogue";
import { pageHero } from "@/lib/catalogue/heroes";
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
  const toneOf = toneGroups(finishes);
  const items: RangeItem[] = finishes.map((f, i) => {
    const format = plankFormat(f.specs);
    return {
      id: f.id,
      name: f.name,
      style: f.style,
      colourFamily: f.colourFamily,
      rrpPence: f.rrpPence,
      toneGroup: toneOf.get(f.id),
      format,
      keywords: [colourFamilyLabel(f.colourFamily), format && FORMAT_LABELS[format]].filter(Boolean).join(" "),
      card: (
        <FinishCard
          finish={f}
          priority={i < 3}
          headingLevel="h2"
          sizes="(min-width: 1024px) 31vw, 48vw"
          // Shorter photographs on wide screens, so names and prices show on the first screen.
          aspect="aspect-[3/4]"
        />
      ),
    };
  });

  const hero = pageHero(finishes, "range");
  return (
    <PageTransition>
      <>
        {/* The opening photograph carries the title; the finishes start just below. */}
        <PageHero
          image={hero?.image}
          focus="object-[50%_62%]"
          badge={<ScratchShieldBadge className="w-16! drop-shadow-[0_6px_18px_rgba(0,0,0,0.35)] sm:w-24!" />}
        >
          <SectionIntro
            as="h1"
            size="lg"
            tone="dark"
            eyebrow="The range"
            title={`${countWord(finishes.length)} ${finishes.length === 1 ? "finish" : "finishes"}, light to dark`}
          >
            <p>Every floor has a 0.55mm wear layer, Scratch Shield surface protection and a waterproof rigid SPC core.</p>
          </SectionIntro>
          <div className="mt-6">
            <ButtonLink href="#finishes" variant="quiet-on-dark" arrow>
              Explore the {finishes.length} finishes
            </ButtonLink>
          </div>
        </PageHero>
      <div id="finishes" className="scroll-mt-header container-page pb-section pt-6 sm:pt-8">
        <p className="max-w-prose text-lede text-ink-muted">Straight plank or herringbone. Pick the look, then the tone.</p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-10 gap-y-4">
          <ButtonLink href="/explore" variant="quiet" arrow>
            Open full-screen view
          </ButtonLink>
          <HelpChoose styles={distinct(finishes.map((f) => f.style))} tones={distinct([...toneOf.values()])}formats={distinct(finishes.map((f) => plankFormat(f.specs)).filter((x): x is NonNullable<typeof x> => x !== undefined))} />
        </div>
        <div className="mt-8 sm:mt-10">
          {/* The fallback is the full, unfiltered grid: works without JavaScript. */}
          <Suspense fallback={<RangeGrid items={items} />}>
            <RangeBrowser items={items} formats={formatOptions(finishes)} />
          </Suspense>
        </div>
        {/* The warranty, once, with its disclaimer, where the range is chosen. */}
        <div className="mt-stack border-t border-line pt-6">
          <p className="text-navy">Residential lifetime warranty, 25 years. Commercial, 10 years for light and medium traffic.</p>
          <WarrantyDisclaimer className="mt-3" />
        </div>
        {/* The sample offer follows the range: by then there is something to choose from. */}
        <SamplePromo
          className="mt-stack"
          swatches={[0, Math.floor(finishes.length / 2), finishes.length - 1]
            .map((i) => finishes[i] && imagesOfKind(finishes[i], "swatch")[0])
            .filter((x): x is NonNullable<typeof x> => Boolean(x))}
        />
      </div>
      </>
    </PageTransition>
  );
}
