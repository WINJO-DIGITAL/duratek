import Link from "next/link";
import { PageTransition } from "@/components/layout/page-transition";
import { AudienceSwitch } from "@/components/audience/audience-switch";
import { ClosingCtaActions } from "@/components/audience/closing-cta";
import { LayerBreakdown } from "@/components/content/layer-breakdown";
import { PostcodeBand } from "@/components/content/postcode-band";
import { SectionIntro } from "@/components/content/section-intro";
import { SpecStrip } from "@/components/content/spec-strip";
import { ScratchShieldBadge, WarrantyBadges, WarrantyDisclaimer } from "@/components/content/warranty";
import { FinishCard } from "@/components/finish/finish-card";
import { FinishImage } from "@/components/finish/finish-image";
import { ColourIndex, type ColourIndexItem } from "@/components/home/colour-index";
import { HeroCarousel, type HeroSlide } from "@/components/home/hero-carousel";
import { HowItWorks, type Step } from "@/components/home/how-it-works";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRight } from "@/components/ui/icons";
import { getFinishes, imagesOfKind, leadImage } from "@/lib/catalogue";
import { distinct } from "@/lib/catalogue/filter";
import { colourFamilyLabel, STYLE_LABELS } from "@/lib/config";
import { imagePool, takeFrom } from "@/lib/catalogue/image-pool";
import type { Finish, FinishStyle } from "@/lib/catalogue/types";

const POPULAR_COUNT = 8;

const STYLE_COPY: Record<FinishStyle, { title: string; body: string; cta: string }> = {
  plank: {
    title: "Straight plank",
    body: "Long boards laid end to end. The simplest layout, and the one that makes a room look biggest.",
    cta: "Explore straight plank",
  },
  herringbone: {
    title: "Herringbone",
    body: "Short blocks laid in a zigzag, as in a parquet floor. More pattern, more movement.",
    cta: "Explore herringbone",
  },
};

export default async function HomePage() {
  const finishes = await getFinishes();
  // Every pooled photo used on the page, so the colour index can avoid repeats.
  const usedSrcs = new Set<string>();
  const takeRoom = takeFrom(imagePool(finishes, "room"));
  const nextRoom = () => {
    const next = takeRoom();
    if (next) usedSrcs.add(next.image.src);
    return next;
  };
  const hero = nextRoom();
  // Hero carousel: the hero photo plus the next four from the pool, so no
  // later section repeats a hero image.
  const heroSlides: HeroSlide[] = [hero, nextRoom(), nextRoom(), nextRoom(), nextRoom()]
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .map(({ image, finish }) => ({
      image,
      swatch: imagesOfKind(finish, "swatch")[0],
      name: finish.name,
      slug: finish.slug,
    }));
  const styles = (["plank", "herringbone"] as const).filter((s) => finishes.some((f) => f.style === s));
  const styleImages = styles.map(() => nextRoom());
  const lifeImage = nextRoom();
  const wearGrain = finishes.map((f) => ({ image: imagesOfKind(f, "swatch")[0], finish: f })).find((x) => x.image);
  const fittingImage = nextRoom();
  const consideredA = nextRoom();
  const consideredB = nextRoom();
  const closingImage = nextRoom();
  // A different finish's swatch from the one in the wear-layer section.
  const woodSwatch = finishes
    .filter((f) => f.id !== wearGrain?.finish.id)
    .map((f) => imagesOfKind(f, "swatch")[0])
    .find(Boolean);

  const steps: Step[] = [
    {
      title: "Discover",
      body: `Look through all ${finishes.length} finishes and the photos of each one in real rooms.`,
      href: "/range",
      cta: "Explore the range",
      image: nextRoom()?.image,
    },
    {
      title: "Shortlist",
      body: "Filter by colour, then open a finish for close-ups of the grain and the full specification.",
      href: "/range",
      cta: "Browse by colour",
      image: nextRoom()?.image,
    },
    {
      title: "Sample",
      body: "Order up to three samples, free. Put them down in the room they’re for and look at them in daylight and in the evening.",
      href: "/samples",
      cta: "Order free samples",
      image: nextRoom()?.image,
    },
    {
      title: "Buy",
      body: "Buy from a stockist near you, or order online.",
      href: "/where-to-buy",
      cta: "Where to buy",
      image: nextRoom()?.image,
    },
  ];

  const colourItems: ColourIndexItem[] = distinct(finishes.map((f) => f.colourFamily)).map((c) => {
    const inFamily = finishes.filter((f) => f.colourFamily === c);
    return {
      id: c,
      label: colourFamilyLabel(c),
      swatch: imagesOfKind(inFamily[0], "swatch")[0],
      count: inFamily.length,
      href: `/range?colour=${c}`,
      // First room scene not already used elsewhere on the page.
      image:
        inFamily.flatMap((f) => imagesOfKind(f, "room")).find((img) => !usedSrcs.has(img.src)) ??
        leadImage(inFamily[0]),
    };
  });

  return (
    <PageTransition>
      <>
        {/* 1. Hero */}
        <section className="on-dark relative isolate -mt-[var(--spacing-header)] flex min-h-[calc(100svh-var(--spacing-bottom-bar))] items-end overflow-hidden bg-navy lg:min-h-svh">
          <HeroCarousel slides={heroSlides} />
          <div
            className="absolute inset-0 -z-10 bg-gradient-to-t from-navy/95 via-navy/75 to-navy/30 lg:bg-gradient-to-r lg:from-navy/85 lg:via-navy/40 lg:to-navy/0"
            aria-hidden="true"
          />
          <div className="container-page pb-28 pt-32 sm:pb-32 lg:pb-36">
            <p className="eyebrow text-green-on-navy">The performance collection</p>
            <h1 className="mt-4 max-w-[14ch] text-display-xl text-on-dark">
              Beautifully considered. <span className="font-light">Built to perform.</span>
            </h1>
            <p className="mt-6 max-w-md text-lede text-on-dark-muted">
              Oak-look click flooring with a waterproof rigid core, a 0.55mm wear layer and a scratch-resistant finish.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3">
              <ButtonLink href="/range" variant="on-dark">
                Explore the range
              </ButtonLink>
              <ButtonLink href="/samples" variant="quiet-on-dark" arrow={false}>
                Order free samples
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* 2. Spec strip */}
        <section aria-label="Key specifications" className="container-page">
          <SpecStrip />
        </section>

        {/* 3. A style for every space */}
        <section className="bg-white py-section">
          <div className="container-page">
            {styles.length > 1 ? (
              <>
                <SectionIntro eyebrow="Two timeless expressions" title="A style for every space." />
                <div className="mt-12 grid gap-6 md:grid-cols-2">
                  {styles.map((s, i) => (
                    <StyleTile key={s} style={s} image={styleImages[i]} />
                  ))}
                </div>
              </>
            ) : (
              styles[0] && (
                <>
                  <div className="flex flex-wrap items-end justify-between gap-6">
                    <SectionIntro title="Start with colour.">
                      <p>
                        {finishes.length} {STYLE_LABELS[styles[0]].toLowerCase()} finishes in {colourItems.length} colour
                        families.
                      </p>
                    </SectionIntro>
                  </div>
                  <div className="mt-12">
                    <ColourIndex items={colourItems} />
                  </div>
                </>
              )
            )}
          </div>
        </section>

        {/* 4. Popular finishes */}
        <PopularFinishes finishes={finishes.slice(0, POPULAR_COUNT)} total={finishes.length} />

        {/* How it works: the homeowner journey */}
        <section className="border-t border-line py-section" aria-labelledby="how-heading">
          <div className="container-page">
            <h2 id="how-heading" className="reveal text-display-md text-navy">
              How it works
            </h2>
            <div className="mt-12">
              <HowItWorks steps={steps} />
            </div>
          </div>
        </section>

        {/* 5. Made for life as it happens: full-bleed with inset panel */}
        <section className="relative isolate">
          <div className="relative aspect-[4/5] sm:aspect-[16/10] lg:aspect-[21/9]">
            {lifeImage && <FinishImage image={lifeImage.image} sizes="100vw" className="object-[50%_70%]" />}
          </div>
          <div className="container-page relative -mt-24 sm:-mt-40 lg:absolute lg:inset-x-0 lg:bottom-16 lg:mt-0">
            <div className="max-w-xl bg-off-white p-6 sm:p-10 lg:ml-auto">
              <div className="grid grid-cols-[1fr_auto] items-start gap-6">
                <h2 className="reveal text-display-md text-navy">Made for life as it happens.</h2>
                <ScratchShieldBadge className="hidden w-28! sm:flex" />
              </div>
              <p className="mt-5 text-ink-muted">
                Scratch Shield is the clear finish on top of every Duratek plank. It helps the floor stand up to chair
                legs, dropped keys and grit walked in on shoes, and you can’t see it once it’s down.
              </p>
            </div>
          </div>
        </section>

        {/* 6. Protection you can feel confident in: split */}
        <section className="py-section">
          <div className="container-page grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
            <div className="order-2 lg:order-1">
              <p className="font-display text-[clamp(5rem,3rem+9vw,10rem)] leading-[0.85] tracking-[-0.04em] text-navy">
                0.55<span className="ml-2 text-[0.35em] tracking-normal text-ink-muted">mm</span>
              </p>
              <h2 className="reveal mt-8 text-display-md text-navy">Protection you can feel confident in.</h2>
              <p className="mt-5 max-w-prose text-lede text-ink-muted">
                Under the finish is a clear wear layer that protects the printed wood design. Ours is 0.55mm thick.
                It’s the layer that takes the foot traffic in a hallway or kitchen, and the number worth comparing when
                you look at other floors.
              </p>
            </div>
            {wearGrain && (
              <figure className="order-1 lg:order-2">
                <div className="reveal-img relative aspect-[4/5] overflow-hidden bg-line">
                  <FinishImage image={wearGrain.image} sizes="(min-width: 1024px) 45vw, 100vw" />
                </div>
                <figcaption className="mt-3 text-[0.8125rem] text-ink-muted">
                  {wearGrain.finish.name}, grain detail
                </figcaption>
              </figure>
            )}
          </div>
        </section>

        {/* 7. Performance beneath the surface: dark, interactive */}
        <section className="on-dark bg-navy py-section">
          <div className="container-page">
            <SectionIntro eyebrow="Five layers" title="Performance beneath the surface." tone="dark" />
            <div className="mt-12 lg:mt-16">
              <LayerBreakdown woodImage={woodSwatch} />
            </div>
          </div>
        </section>

        {/* 8. Beautifully fitted: inset image */}
        <section className="py-section">
          <div className="container-page grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <SectionIntro eyebrow="Fitting" title="Beautifully fitted. Effortlessly finished.">
                <p>
                  The planks use Unilin’s click-lock joint. Each one locks into the next along its edges, and the floor
                  floats over the subfloor rather than being glued down, which makes for a quick install when you follow
                  the fitting instructions.
                </p>
              </SectionIntro>
            </div>
            {fittingImage && (
              <div className="lg:col-span-6 lg:col-start-7">
                <div className="reveal-img relative ml-auto aspect-[3/2] w-full overflow-hidden bg-line sm:w-4/5">
                  <FinishImage image={fittingImage.image} sizes="(min-width: 1024px) 40vw, 80vw" />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 9. Homeowner / Trade */}
        <section className="border-t border-line py-section" aria-labelledby="audience-heading">
          <div className="container-page">
            <h2 id="audience-heading" className="reveal text-display-md text-navy">
              What describes you best?
            </h2>
            <div className="mt-8">
              <AudienceSwitch />
            </div>
          </div>
        </section>

        {/* 10. Considered from every angle */}
        <section className="bg-white py-section">
          <div className="container-page grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
            <div className="grid grid-cols-5 gap-4">
              {consideredA && (
                <div className="reveal-img relative col-span-3 aspect-[3/4] overflow-hidden bg-line">
                  <FinishImage image={consideredA.image} sizes="(min-width: 1024px) 28vw, 60vw" />
                </div>
              )}
              {consideredB && (
                <div className="reveal-img relative col-span-2 mt-16 aspect-[3/4] self-start overflow-hidden bg-line">
                  <FinishImage image={consideredB.image} sizes="(min-width: 1024px) 18vw, 40vw" />
                </div>
              )}
            </div>
            <SectionIntro title="Considered from every angle.">
              <p>
                We would rather you had the facts than a slogan. Ask for the technical sheet, the warranty terms and the
                test certificates for the finish you’re looking at, and we’ll send them over.
              </p>
              <p className="font-medium text-navy">
                Scratch-resistant does not mean scratch-proof.
              </p>
              <p>
                <Link
                  href="/technology"
                  className="inline-flex min-h-tap items-center gap-2 text-navy underline-offset-4 hover:underline"
                >
                  What’s inside a plank <ArrowRight size={16} />
                </Link>
              </p>
            </SectionIntro>
          </div>
        </section>

        {/* 11. Confidence for years to come */}
        <section className="py-section">
          <div className="container-page grid gap-10 lg:grid-cols-2 lg:items-end">
            <SectionIntro eyebrow="Duratek warranty" title="Confidence for years to come.">
              <p>Lifetime cover in the home, defined as 25 years, and 10 years in light and medium commercial use.</p>
            </SectionIntro>
            <div className="lg:justify-self-end">
              <WarrantyBadges />
            </div>
            <div className="border-t border-line pt-6 lg:col-span-2">
              <WarrantyDisclaimer />
              <Link
                href="/warranty"
                className="mt-2 inline-flex min-h-tap items-center gap-2 text-[0.9375rem] text-navy underline-offset-4 hover:underline"
              >
                Warranty details <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* 12. Where to buy */}
        <section className="bg-white py-section-sm">
          <div className="container-page">
            <PostcodeBand />
          </div>
        </section>

        {/* 13. Closing */}
        <section className="on-dark relative isolate overflow-hidden bg-navy">
          {closingImage && <FinishImage image={closingImage.image} sizes="100vw" className="-z-20" />}
          <div
            className="absolute inset-0 -z-10 bg-gradient-to-r from-navy/90 via-navy/70 to-navy/30"
            aria-hidden="true"
          />
          <div className="container-page py-section">
            <h2 className="max-w-[16ch] text-display-lg text-on-dark">
              Timeless in style. <span className="font-light">Resilient by design.</span>
            </h2>
            <p className="mt-5 max-w-md text-lede text-on-dark-muted">
              {finishes.length} finishes. Up to three samples, free.
            </p>
            <div className="mt-10">
              <ClosingCtaActions />
            </div>
          </div>
        </section>
      </>
    </PageTransition>
  );
}

function StyleTile({ style, image }: { style: FinishStyle; image?: { image: Finish["images"][number] } }) {
  const copy = STYLE_COPY[style];
  return (
    <Link href={`/range?style=${style}`} className="group block">
      <div className="reveal-img relative aspect-[4/5] overflow-hidden bg-line sm:aspect-[5/4]">
        {image && (
          <FinishImage
            image={image.image}
            sizes="(min-width: 768px) 50vw, 100vw"
            className="transition-transform duration-[1200ms] ease-calm group-hover:scale-[1.03]"
          />
        )}
      </div>
      <h3 className="mt-5 text-display-sm text-navy">{copy.title}</h3>
      <p className="mt-2 max-w-md text-ink-muted">{copy.body}</p>
      <span className="mt-3 inline-flex min-h-tap items-center gap-2 text-navy group-hover:underline group-hover:underline-offset-4">
        {copy.cta} <ArrowRight size={16} />
      </span>
    </Link>
  );
}

function PopularFinishes({ finishes, total }: { finishes: Finish[]; total: number }) {
  return (
    <section className="py-section" aria-labelledby="popular-heading">
      <div className="container-page flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="popular-heading" className="reveal text-display-md text-navy">
            In the range
          </h2>
        </div>
        <Link
          href="/range"
          className="inline-flex min-h-tap items-center gap-2 text-navy underline-offset-4 hover:underline"
        >
          All {total} finishes <ArrowRight size={16} />
        </Link>
      </div>
      <ul
        className="scrollbar-none mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-[var(--spacing-gutter)] px-[var(--spacing-gutter)] pb-2 xl:px-[max(var(--spacing-gutter),calc((100vw-var(--container-page))/2+var(--spacing-gutter)))]"
        aria-label="Popular finishes, scroll sideways for more"
      >
        {finishes.map((f) => (
          <li key={f.id} className="w-[72vw] max-w-80 shrink-0 snap-start sm:w-[42vw] lg:w-[24vw]">
            <FinishCard finish={f} sizes="(min-width: 1024px) 24vw, (min-width: 640px) 42vw, 72vw" />
          </li>
        ))}
      </ul>
    </section>
  );
}
