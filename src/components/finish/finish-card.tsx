import Link from "next/link";
import { SaveButton } from "@/components/saved/save-button";
import { AddToSamplesButton } from "@/components/samples/add-to-samples-button";
import { measureLine } from "@/lib/catalogue/format";
import { grainImage, leadImage } from "@/lib/catalogue/mappers";
import type { Finish } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";
import { formatPence } from "@/lib/money";
import { isSecondaryRoom } from "@/lib/catalogue/curation";
import { PhotoSlides } from "./photo-slides";

/**
 * A finish, photograph first: the name and the RRP sit on the picture like a
 * gallery caption, and one quiet row under it carries the board size and the
 * "Add to samples" button.
 */
export function FinishCard({
  finish,
  sizes,
  aspect = "aspect-[3/4]",
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
  const measures = measureLine(finish.specs);

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
        {/* The name and price, set like a gallery caption on the photograph. Only the name links to the finish, so the photograph can be swiped. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-4 pb-3.5 pt-20 sm:px-5 sm:pb-4">
          <H className="font-display text-[1.375rem] font-normal leading-[1.02] tracking-[-0.035em] text-white sm:text-[1.625rem]">
            <Link href={`/range/${finish.slug}`} className="pointer-events-auto underline-offset-4 hover:underline">
              {finish.name}
            </Link>
          </H>
          {showPrice && finish.rrpPence !== undefined && (
            <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-white">
              {finish.offerPence !== undefined ? (
                <>
                  <span className="data text-[1.0625rem] font-medium">{formatPence(finish.offerPence)}</span>
                  <span className="data text-[0.8125rem] text-white/70 line-through">{formatPence(finish.rrpPence)}</span>
                </>
              ) : (
                <>
                  <span className="data text-[1.0625rem] font-medium">{formatPence(finish.rrpPence)}</span>
                </>
              )}
              <span className="text-[0.8125rem] text-white/80">per m²</span>
            </p>
          )}
        </div>
      </div>
      {/* Above the stretched link, in the photo's corner. */}
      <SaveButton
        finish={{ id: finish.id, slug: finish.slug, name: finish.name, unavailable: finish.sampleAvailable === false }}
        variant="overlay"
        className="absolute right-3 top-3 z-10"
      />

      {/* One quiet row: the board size on the left, the sample action on the right. */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 pb-4 pt-3 sm:px-5">
        {measures && <p className="data min-w-0 text-[0.8125rem] leading-snug text-ink-muted">{measures}</p>}
        <div className="shrink-0">
          <AddToSamplesButton finish={{ id: finish.id, slug: finish.slug, name: finish.name, unavailable: finish.sampleAvailable === false }} size="compact" />
        </div>
      </div>
    </article>
  );
}
