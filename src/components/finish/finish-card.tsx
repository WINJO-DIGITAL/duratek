import Link from "next/link";
import { ViewTransition } from "react";
import { AddToSamplesButton } from "@/components/samples/add-to-samples-button";
import { grainImage, imagesOfKind, leadImage } from "@/lib/catalogue/mappers";
import type { Finish } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";
import { colourFamilyLabel, STYLE_LABELS } from "@/lib/config";
import { FinishImage } from "./finish-image";

/** Small square tag for finish attributes. */
function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center border border-line px-2 text-[0.75rem] text-ink-muted">{children}</span>
  );
}

export function FinishCard({
  finish,
  sizes,
  aspect = "aspect-[4/5]",
  media = "room",
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
  const room = leadImage(finish);
  // Clean swatch first: it shows the grain without a room in the way.
  const grain = imagesOfKind(finish, "swatch")[0] ?? grainImage(finish);
  const primary = media === "texture" ? (grain ?? room) : room;
  const reveal = media === "texture" && grain && room && room !== grain ? room : undefined;

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
            // Room scene fades in over the texture on devices that can hover.
            <div className="absolute inset-0 hidden opacity-0 transition-opacity duration-700 ease-calm [@media(hover:hover)]:block [@media(hover:hover)]:group-hover:opacity-100">
              <FinishImage image={reveal} sizes={sizes} className="scale-[1.03]" />
            </div>
          )}
        </div>
      </ViewTransition>
      <div className="mt-4">
        <H className="text-display-sm leading-tight text-navy">
          <Link href={`/range/${finish.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {finish.name}
          </Link>
        </H>
        <p className="mt-0.5 text-[0.9375rem] text-ink-muted">{STYLE_LABELS[finish.style]}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Tag>{colourFamilyLabel(finish.colourFamily)}</Tag>
          {finish.specs.thickness_mm ? <Tag>{finish.specs.thickness_mm}mm</Tag> : null}
          {finish.specs.plank_length_mm && finish.specs.plank_length_mm > 1400 ? <Tag>Extra long</Tag> : null}
        </div>
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
