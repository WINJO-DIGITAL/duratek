import { OrderSamplesButton } from "@/components/samples/order-samples-button";
import { ButtonLink } from "@/components/ui/button";
import { HeroShowcase, type HeroSlide } from "./hero-showcase";

/**
 * Full-bleed, floor-led photographs (a slow cross-fade between a few curated
 * finishes). One primary action, one quiet sample link, the finish named.
 */
export function FloorHero({ slides, note }: { slides: HeroSlide[]; note?: string }) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="on-dark relative isolate -mt-[var(--spacing-header)] flex min-h-[calc(100svh-var(--spacing-bottom-bar))] flex-col justify-end overflow-hidden bg-navy lg:min-h-svh"
    >
      {/* Neutral scrims, so the floor keeps its own colour: a deeper one behind the header and the copy
          at the top, none over the floor in the lower half. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-black/50 to-transparent" />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-black/45 via-black/15 via-45% to-transparent to-60% lg:bg-[radial-gradient(ellipse_65%_60%_at_0%_0%,rgb(0_0_0/0.5),transparent)]"
      />
      <HeroShowcase slides={slides} note={note}>
        <div>
          <h1 id="hero-heading" className="text-[2.125rem] leading-[1.08] tracking-[-0.035em] text-on-dark [text-shadow:0_1px_16px_rgb(0_0_0/0.4)] sm:text-display-hero">
            <span className="block">Beautifully considered.</span>
            <span className="block font-light text-on-dark/90">Built to perform.</span>
          </h1>
          <p className="mt-5 max-w-[30rem] text-hero-lede text-on-dark/90 [text-shadow:0_1px_14px_rgb(0_0_0/0.45)] sm:mt-6">
            <span className="sm:hidden">Waterproof, scratch-resistant click flooring.</span>
            <span className="hidden sm:inline">Waterproof click flooring with a 0.55mm wear layer and a scratch-resistant finish.</span>
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-9 gap-y-3 sm:mt-10">
            <ButtonLink href="/range" variant="on-dark" size="lg">
              Explore the Range
            </ButtonLink>
            <OrderSamplesButton
              variant="quiet-on-dark"
              arrow={false}
              className="-ml-3 rounded-control bg-black/35 px-3 [text-shadow:0_1px_10px_rgb(0_0_0/0.5)] sm:ml-0 sm:bg-transparent sm:px-0"
            >
              Order free samples
            </OrderSamplesButton>
          </div>
        </div>
      </HeroShowcase>
    </section>
  );
}
