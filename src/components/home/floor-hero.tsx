import { OrderSamplesButton } from "@/components/samples/order-samples-button";
import { ButtonLink } from "@/components/ui/button";
import { HeroShowcase, type HeroSlide } from "./hero-showcase";

/**
 * Full-bleed, floor-led photographs (a slow cross-fade between a few curated
 * finishes). One primary action, one quiet sample link, the finish named.
 */
export function FloorHero({ slides }: { slides: HeroSlide[] }) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="on-dark relative isolate -mt-[var(--spacing-header)] flex min-h-[calc(100svh-var(--spacing-bottom-bar))] flex-col justify-end overflow-hidden bg-navy lg:min-h-svh"
    >
      {/* Neutral scrims, so the floor keeps its own colour: a light one under
          the header, a deeper one behind the copy in the lower left only. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-black/35 to-transparent" />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/25 via-45% to-transparent to-70% lg:bg-[radial-gradient(ellipse_70%_60%_at_0%_100%,rgb(0_0_0/0.6),transparent)]"
      />
      <HeroShowcase slides={slides}>
        <div>
          <h1 id="hero-heading" className="max-w-[13ch] text-display-hero text-on-dark sm:max-w-none">
            <span className="sm:block">Beautifully considered.</span>{" "}
            <span className="font-light text-on-dark/90 sm:block">Built to perform.</span>
          </h1>
          <p className="mt-5 max-w-[30rem] text-hero-lede text-on-dark/85 sm:mt-6">
            Waterproof click flooring with a 0.55mm wear layer and a scratch-resistant finish.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-9 gap-y-3 sm:mt-10">
            <ButtonLink href="/range" variant="on-dark" size="lg">
              Explore the range
            </ButtonLink>
            <OrderSamplesButton
              variant="quiet-on-dark"
              arrow={false}
              className="underline decoration-white/40 decoration-1 hover:decoration-white"
            >
              Order free samples
            </OrderSamplesButton>
          </div>
        </div>
      </HeroShowcase>
    </section>
  );
}
