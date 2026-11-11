import { FinishImage } from "@/components/finish/finish-image";
import type { CatalogueImage } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";

/**
 * A page's opening photograph: a rounded frame with the page title set over
 * it in light type, shaded from the left and bottom so the text reads on any
 * photograph. The children are the page's own title block; the frame gives
 * them a calm place to sit, and the photograph shows what the page is about.
 */
export function PageHero({
  image,
  children,
  focus = "object-[50%_60%]",
  className,
}: {
  image: CatalogueImage;
  children: React.ReactNode;
  /** Focal point of the crop, as an object-position class: for portrait or wide photographs. */
  focus?: string;
  className?: string;
}) {
  return (
    <section className={cn("on-dark relative isolate -mx-[var(--spacing-gutter)] overflow-hidden bg-navy sm:mx-0 sm:rounded-card", className)}>
      <div className="relative aspect-[4/3] sm:aspect-[16/7] lg:aspect-[21/8]">
        <FinishImage
          image={image}
          sizes="(min-width: 1024px) 1200px, 100vw"
          priority
          quality={80}
          className={focus}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>
      <div className="absolute inset-x-0 bottom-0 pb-6 sm:pb-10 lg:pb-12"><div className="container-page">{children}</div></div>
    </section>
  );
}
