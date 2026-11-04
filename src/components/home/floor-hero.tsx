import Image from "next/image";
import Link from "next/link";
import { FinishImage } from "@/components/finish/finish-image";
import { ButtonLink } from "@/components/ui/button";
import type { CatalogueImage } from "@/lib/catalogue/types";

/**
 * One full-bleed photograph with the floor filling the frame. One primary
 * action, one quiet sample link, and the finish in the photograph named.
 */
export function FloorHero({
  image,
  finish,
}: {
  image?: CatalogueImage;
  finish?: { name: string; slug: string; swatch?: CatalogueImage };
}) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="on-dark relative isolate -mt-[var(--spacing-header)] flex min-h-[calc(100svh-var(--spacing-bottom-bar))] items-end overflow-hidden bg-navy lg:min-h-svh"
    >
      {image && (
        <FinishImage image={image} sizes="100vw" priority quality={80} className="-z-20 object-[50%_75%]" />
      )}
      {/* Neutral scrims, so the floor keeps its own colour: a light one under
          the header, a deeper one behind the copy in the lower left only. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-black/35 to-transparent" />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/25 via-45% to-transparent to-70% lg:bg-[radial-gradient(ellipse_70%_60%_at_0%_100%,rgb(0_0_0/0.6),transparent)]"
      />

      <div className="container-page grid gap-10 pb-10 pt-40 sm:pb-14 lg:grid-cols-[1fr_auto] lg:items-end lg:pb-16">
        <div>
          <h1 id="hero-heading" className="max-w-[13ch] text-display-hero font-light text-on-dark sm:max-w-none">
            <span className="sm:block">Beautifully considered.</span> <span className="sm:block">Built to perform.</span>
          </h1>
          <div className="mt-9 flex flex-wrap items-center gap-x-9 gap-y-3">
            <ButtonLink href="/range" variant="on-dark" size="lg">
              Explore the range
            </ButtonLink>
            <ButtonLink
              href="/samples"
              variant="quiet-on-dark"
              arrow={false}
              className="underline decoration-white/40 decoration-1 hover:decoration-white"
            >
              Order free samples
            </ButtonLink>
          </div>
        </div>

        {finish && (
          <Link
            href={`/range/${finish.slug}`}
            className="group flex min-h-tap items-center gap-3 self-end text-on-dark lg:justify-self-end"
          >
            {finish.swatch && (
              <span className="relative block size-9 shrink-0 overflow-hidden rounded-full ring-1 ring-white/40">
                <Image src={finish.swatch.src} alt="" fill sizes="36px" quality={70} className="object-cover" />
              </span>
            )}
            <span className="leading-tight">
              <span className="block text-[0.6875rem] uppercase tracking-[0.16em] text-on-dark/70">Shown</span>
              <span className="text-[0.9375rem] underline-offset-4 group-hover:underline">{finish.name}</span>
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}
