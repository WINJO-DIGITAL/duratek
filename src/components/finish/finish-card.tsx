import Link from "next/link";
import { ViewTransition } from "react";
import { SaveButton } from "@/components/saved/save-button";
import { AddToSamplesButton } from "@/components/samples/add-to-samples-button";
import { FORMAT_LABELS, measureLine, plankFormat } from "@/lib/catalogue/format";
import { grainImage, leadImage } from "@/lib/catalogue/mappers";
import type { Finish } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";
import { colourFamilyLabel } from "@/lib/config";
import { FinishImage } from "./finish-image";

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
  className,
}: {
  finish: Finish;
  sizes: string;
  aspect?: string;
  /** "texture" leads with the plank grain and reveals the room scene on hover. */
  media?: "room" | "texture";
  priority?: boolean;
  headingLevel?: "h2" | "h3";
  className?: string;
}) {
  const room = finish.images.find((i) => i.kind === "room");
  const grain = grainImage(finish);
  const primary = media === "texture" ? (grain ?? leadImage(finish)) : (room ?? leadImage(finish));
  const reveal = media === "texture" && room && room !== primary ? room : undefined;
  const format = plankFormat(finish.specs);
  const measures = measureLine(finish.specs);

  return (
    <article className={cn("reveal group relative flex flex-col", className)}>
      {/* Same name as the detail page hero: the photo morphs into it on click. */}
      <ViewTransition name={`finish-${finish.slug}`} share="finish-morph" default="none">
        <div className={cn("relative overflow-hidden bg-line", aspect)}>
          {primary && (
            <FinishImage
              image={primary}
              sizes={sizes}
              priority={priority}
              className="transition-transform duration-[1200ms] ease-calm group-hover:scale-[1.03] motion-reduce:transition-none"
            />
          )}
          {reveal && (
            // Room scene fades in over the grain on devices that can hover.
            <div className="absolute inset-0 hidden opacity-0 transition-opacity duration-700 ease-calm [@media(hover:hover)]:block [@media(hover:hover)]:group-hover:opacity-100">
              <FinishImage image={reveal} sizes={sizes} className="scale-[1.03]" />
            </div>
          )}
        </div>
      </ViewTransition>
      {/* Above the stretched link, in the photo's corner. */}
      <SaveButton
        finish={{ id: finish.id, slug: finish.slug, name: finish.name }}
        variant="overlay"
        className="absolute right-2 top-2 z-10"
      />

      <div className="mt-4 border-t border-navy/15 pt-3">
        <H className="text-[1.3125rem] font-normal leading-tight tracking-[-0.01em] text-navy sm:text-[1.5rem]">
          <Link href={`/range/${finish.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {finish.name}
          </Link>
        </H>
        <p className="mt-1 text-[0.875rem] text-ink-muted">
          {colourFamilyLabel(finish.colourFamily)}
          {format && <> · {FORMAT_LABELS[format]}</>}
        </p>
        {measures && <p className="data mt-1.5 text-[0.8125rem] text-ink-muted">{measures}</p>}
      </div>

      {/* Above the stretched link so it stays independently clickable. */}
      <AddToSamplesButton
        finish={{ id: finish.id, slug: finish.slug, name: finish.name }}
        size="compact"
        className="relative z-10 mt-1 self-start"
      />
    </article>
  );
}
