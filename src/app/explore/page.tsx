import type { Metadata } from "next";
import { Suspense } from "react";
import { FinishExplorer, type ExplorerFinish } from "@/components/explorer/finish-explorer";
import { PageTransition } from "@/components/layout/page-transition";
import { byTone, getFinishes, grainImage, imagesOfKind } from "@/lib/catalogue";
import { isSecondaryRoom } from "@/lib/catalogue/curation";
import { FORMAT_LABELS, formatOptions, measureLine, plankFormat } from "@/lib/catalogue/format";
import type { CatalogueImage } from "@/lib/catalogue/types";
import { colourFamilyLabel } from "@/lib/config";

export const metadata: Metadata = {
  title: "Explore the finishes",
  description:
    "Every Duratek finish, full screen: swipe between them, switch between the room and the grain, and order free samples.",
};

export default async function ExplorePage() {
  const all = byTone(await getFinishes());
  const finishes: ExplorerFinish[] = all.map((f) => {
    const format = plankFormat(f.specs);
    return {
      id: f.id,
      slug: f.slug,
      name: f.name,
      style: f.style,
      colourFamily: f.colourFamily,
      format,
      detail: [colourFamilyLabel(f.colourFamily), format && FORMAT_LABELS[format]].filter(Boolean).join(" · "),
      measures: measureLine(f.specs),
      sampleAvailable: f.sampleAvailable,
      grain: grainImage(f),
      // A floor-led room only: no bathrooms or playrooms in the explorer.
      room: imagesOfKind(f, "room").find((i) => !isSecondaryRoom(i)),
      swatch: imagesOfKind(f, "swatch")[0] ?? grainImage(f),
    };
  });

  const colourSwatches: Record<string, CatalogueImage | undefined> = {};
  for (const f of finishes) colourSwatches[f.colourFamily] ??= f.swatch;

  return (
    <PageTransition>
      {/* Reads the finish, view and filters from the URL; the fallback is the
          first finish, so the page renders fully without script. */}
      <Suspense fallback={<FinishExplorerFallback finish={finishes[0]} />}>
        <FinishExplorer finishes={finishes} formats={formatOptions(all)} colourSwatches={colourSwatches} />
      </Suspense>
    </PageTransition>
  );
}

function FinishExplorerFallback({ finish }: { finish?: ExplorerFinish }) {
  return (
    <div className="relative h-[calc(100svh-var(--spacing-header)-var(--spacing-bottom-bar))] bg-navy lg:h-[calc(100svh-var(--spacing-header))]">
      {finish && <h1 className="sr-only">{finish.name}</h1>}
    </div>
  );
}
