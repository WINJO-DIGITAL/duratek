import { FinishImage } from "@/components/finish/finish-image";
import type { CatalogueImage } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";

/**
 * A page's opening photograph, like the home page's: full bleed, starting at
 * the very top of the screen with the header over it, tall enough to fill the
 * first screen, with the page title set on the picture in light type. Shaded
 * from the top and from the bottom so the header and the title read on any
 * photograph. With no photograph it is a plain navy panel, so the header is
 * still legible.
 */
export function PageHero({
  image,
  children,
  focus = "object-[50%_60%]",
  className,
}: {
  image?: CatalogueImage;
  children: React.ReactNode;
  /** Focal point of the crop, as an object-position class: for portrait or wide photographs. */
  focus?: string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "on-dark relative isolate -mt-[var(--spacing-header)] flex min-h-[calc(100svh-var(--spacing-bottom-bar))] flex-col justify-end overflow-hidden bg-navy lg:min-h-[88svh]",
        className,
      )}
    >
      {image && (
        <div aria-hidden="true" className="absolute inset-0 -z-20">
          <FinishImage image={image} sizes="100vw" priority quality={80} className={focus} />
        </div>
      )}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-black/40 to-transparent" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/30 via-50% to-transparent to-80%" />
      <div className="container-page relative pb-10 pt-40 sm:pb-14 lg:pb-16">{children}</div>
    </section>
  );
}
