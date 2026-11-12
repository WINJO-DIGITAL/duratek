import Link from "next/link";
import { SaveButton } from "@/components/saved/save-button";
import { AddToSamplesButton } from "@/components/samples/add-to-samples-button";
import { FORMAT_LABELS, measureLine, plankFormat } from "@/lib/catalogue/format";
import { grainImage, leadImage } from "@/lib/catalogue/mappers";
import type { Finish } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";
import { colourFamilyLabel } from "@/lib/config";
import { formatPence } from "@/lib/money";
import { isSecondaryRoom } from "@/lib/catalogue/curation";
import { PhotoSlides } from "./photo-slides";

/**
 * A finish, labelled like a piece in a gallery: the plank first, the name in
 * display type, then colour family, format and measurements (in the data face).
 */
export function FinishCard({
  finish,
  sizes,
  aspect = "aspect-[4/5]",
  media = "texture",
  priority = false,
  headingLevel: H = "h3",
  showPrice = true,
  className,
}: {
  finish: Finish;
  sizes: string;
  aspect?: string;
  /** "texture" leads with the plank grain and reveals the room scene on hover. */
  media?: "room" | "texture";
  priority?: boolean;
  headingLevel?: "h2" | "h3";
  /** Off on a trader's shared shortlist, which never shows prices. */
  showPrice?: boolean;
  className?: string;
}) {
  const grain = grainImage(finish);
  const primary = media === "texture" ? (grain ?? leadImage(finish)) : (finish.images.find((i) => i.kind === "room") ?? leadImage(finish));
  // The strip: the lead photograph, then the other floor-led scenes and close-ups, swipeable.
  const others = finish.images.filter((i) => (i.kind === "room" || i.kind === "closeup") && !isSecondaryRoom(i) && i !== primary);
  const photos = [primary, ...others].filter((i): i is NonNullable<typeof i> => Boolean(i)).slice(0, 5);
  const format = plankFormat(finish.specs);
  const measures = [measureLine(finish.specs), finish.specs.wear_layer_mm && `${finish.specs.wear_layer_mm} mm wear layer`]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      className={cn(
        "card reveal group relative flex flex-col overflow-hidden transition-shadow duration-500 ease-calm hover:shadow-card-hover",
        className,
      )}
    >
      <div className={cn("relative", aspect)}>
        {photos.length > 0 && (
          <PhotoSlides
            slides={photos}
            name={finish.name}
            href={`/range/${finish.slug}`}
            sizes={sizes}
            priority={priority}
            aspect="h-full w-full"
          />
        )}
        {/* The name, set like a gallery caption on the photograph. Only the name is a link to the finish here, so the photograph can be swiped. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent px-4 pb-3.5 pt-16 sm:px-5 sm:pb-4">
          <H className="font-display text-[1.5rem] font-normal leading-[1.02] tracking-[-0.035em] text-white sm:text-[1.75rem]">
            <Link href={`/range/${finish.slug}`} className="pointer-events-auto underline-offset-4 hover:underline">
              {finish.name}
            </Link>
          </H>
        </div>
      </div>
      {/* Above the stretched link, in the photo's corner. */}
      <SaveButton
        finish={{ id: finish.id, slug: finish.slug, name: finish.name, unavailable: finish.sampleAvailable === false }}
        variant="overlay"
        className="absolute right-3 top-3 z-10"
      />

      <div className="flex flex-1 flex-col px-4 pb-2 pt-3.5 sm:px-5 sm:pt-4">
        <p className="text-[0.875rem] text-ink-muted">
          {colourFamilyLabel(finish.colourFamily)}
          {format && <> · {FORMAT_LABELS[format]}</>}
        </p>
        {measures && <p className="data mt-1 text-[0.8125rem] text-ink-muted">{measures}</p>}
        {showPrice && finish.rrpPence !== undefined && (
          <p className="mt-2.5 flex flex-wrap items-baseline gap-x-2 text-navy">
            {finish.offerPence !== undefined ? (
              <>
                <span className="data text-[1.125rem] font-medium">{formatPence(finish.offerPence)}</span>
                <span className="data text-[0.875rem] text-ink-muted line-through">{formatPence(finish.rrpPence)}</span>
                <span className="text-[0.8125rem] text-ink-muted">per m²</span>
              </>
            ) : (
              <>
                <span className="text-[0.8125rem] font-medium uppercase tracking-[0.12em] text-ink-muted">RRP</span>
                <span className="data text-[1.125rem] font-medium">{formatPence(finish.rrpPence)}</span>
                <span className="text-[0.8125rem] text-ink-muted">per m²</span>
              </>
            )}
          </p>
        )}

        {/* Above the stretched link so it stays independently clickable. */}
        <div className="relative z-10 mt-auto pt-3">
          <div className="border-t border-line pt-1">
            <AddToSamplesButton finish={{ id: finish.id, slug: finish.slug, name: finish.name, unavailable: finish.sampleAvailable === false }} size="compact" />
          </div>
        </div>
      </div>
    </article>
  );
}
