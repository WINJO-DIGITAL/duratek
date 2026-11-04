import Link from "next/link";
import { AudienceSwitch } from "@/components/audience/audience-switch";
import { ClosingCtaActions } from "@/components/audience/closing-cta";
import { LayerBreakdown } from "@/components/content/layer-breakdown";
import { PostcodeBand } from "@/components/content/postcode-band";
import { SectionIntro } from "@/components/content/section-intro";
import { SpecStrip } from "@/components/content/spec-strip";
import { ScratchShieldBadge, WarrantyBadges, WarrantyDisclaimer } from "@/components/content/warranty";
import { FinishCard } from "@/components/finish/finish-card";
import { FinishImage } from "@/components/finish/finish-image";
import { Wordmark } from "@/components/brand/wordmark";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRight } from "@/components/ui/icons";
import { getFinishes, imagesOfKind } from "@/lib/catalogue";
import { imagePool, takeFrom } from "@/lib/catalogue/image-pool";
import type { Finish, FinishStyle } from "@/lib/catalogue/types";

const POPULAR_COUNT = 8;

const STYLE_COPY: Record<FinishStyle, { title: string; body: string; cta: string }> = {
  plank: {
    title: "Straight plank",
    body: "Quietly contemporary. Elegant wood-effect planks create a calm, uninterrupted flow throughout the home.",
    cta: "Explore straight plank",
  },
  herringbone: {
    title: "Herringbone",
    body: "Tradition reimagined. The familiar rhythm of parquet brings character, movement and architectural interest.",
    cta: "Explore herringbone",
  },
};

export default async function HomePage() {
  const finishes = await getFinishes();
  const nextRoom = takeFrom(imagePool(finishes, "room"));
  const hero = nextRoom();
  // Close-ups from finishes other than the hero's, so sections stay varied.
  const nextCloseup = takeFrom(imagePool(finishes, "closeup").filter((c) => c.finish.id !== hero?.finish.id));
  const styles = (["plank", "herringbone"] as const).filter((s) => finishes.some((f) => f.style === s));
  const styleImages = styles.map(() => nextRoom());
  const lifeImage = nextRoom();
  const wearGrain = finishes.map((f) => ({ image: imagesOfKind(f, "swatch")[0], finish: f })).find((x) => x.image);
  const unilinCloseup = nextCloseup();
  const consideredA = nextRoom();
  const consideredB = nextRoom();
  const closingImage = nextRoom();
  const woodSwatch = finishes.map((f) => imagesOfKind(f, "swatch")[0]).find(Boolean);


  return (
    <>
      {/* 1. Hero */}
      <section className="on-dark relative isolate flex min-h-[calc(100svh-var(--spacing-header)-var(--spacing-bottom-bar))] items-end overflow-hidden bg-navy lg:min-h-[calc(100svh-var(--spacing-header))]">
        {hero && <FinishImage image={hero.image} sizes="100vw" priority quality={80} className="-z-10" />}
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-deep/95 via-navy-deep/65 to-navy-deep/10 lg:bg-gradient-to-r lg:from-navy-deep/85 lg:via-navy-deep/40 lg:to-navy-deep/0"
          aria-hidden="true"
        />
        <div className="container-page pb-12 pt-32 sm:pb-16 lg:pb-24">
          <Wordmark tone="dark" className="hidden text-[2.5rem] sm:inline" />
          <p className="eyebrow text-green-light sm:mt-8">The performance collection</p>
          <h1 className="mt-4 max-w-[14ch] text-display-xl text-on-dark">
            Beautifully considered. <em className="italic">Built to perform.</em>
          </h1>
          <p className="mt-6 max-w-md text-lede text-on-dark-muted">
            Refined wood-inspired design meets the quiet confidence of advanced flooring technology.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3">
            <ButtonLink href="/range" variant="on-dark">
              Explore the range
            </ButtonLink>
            <ButtonLink href="/samples" variant="quiet-on-dark" arrow={false}>
              Order free samples
            </ButtonLink>
          </div>
          {hero && (
            <p className="mt-10 text-[0.8125rem] text-on-dark-muted">
              Shown:{" "}
              <Link href={`/range/${hero.finish.slug}`} className="underline underline-offset-4 hover:text-white">
                {hero.finish.name}
              </Link>
            </p>
          )}
        </div>
      </section>

      {/* 2. Spec strip */}
      <section aria-label="Key specifications" className="container-page">
        <SpecStrip />
      </section>

      {/* 3. A style for every space */}
      <section className="bg-sage py-section">
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
            styles[0] && <SingleStyle style={styles[0]} image={styleImages[0]} />
          )}
        </div>
      </section>

      {/* 4. Popular finishes */}
      <PopularFinishes finishes={finishes.slice(0, POPULAR_COUNT)} />

      {/* 5. Made for life as it happens: full-bleed with inset panel */}
      <section className="relative isolate">
        <div className="relative aspect-[4/5] sm:aspect-[16/10] lg:aspect-[21/9]">
          {lifeImage && <FinishImage image={lifeImage.image} sizes="100vw" />}
        </div>
        <div className="container-page relative -mt-24 sm:-mt-40 lg:absolute lg:inset-x-0 lg:bottom-16 lg:mt-0">
          <div className="max-w-xl bg-cream p-6 sm:p-10 lg:ml-auto">
            <div className="grid grid-cols-[1fr_auto] items-start gap-6">
              <div>
                <p className="eyebrow">Duratek surface technology</p>
                <h2 className="mt-4 text-display-md text-navy">Made for life as it happens.</h2>
              </div>
              <ScratchShieldBadge className="hidden w-28! sm:flex" />
            </div>
            <p className="mt-5 text-ink-muted">
              Duratek Scratch Shield is designed to help protect the beauty of your floor from everyday scuffs, abrasion
              and surface wear. A sophisticated protective finish complements the robust wear layer beneath, without
              compromising the natural appearance of the floor.
            </p>
            <p className="mt-4 font-display text-[1.125rem] italic text-navy">
              Because the most beautiful spaces are the ones you can truly live in.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Protection you can feel confident in: split */}
      <section className="py-section">
        <div className="container-page grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
          <div className="order-2 lg:order-1">
            <p className="eyebrow">Engineered durability</p>
            <p className="mt-6 font-display text-[clamp(5rem,3rem+9vw,10rem)] leading-[0.85] tracking-[-0.04em] text-navy">
              0.55<span className="ml-2 text-[0.35em] tracking-normal text-ink-muted">mm</span>
            </p>
            <h2 className="mt-8 text-display-md text-navy">Protection you can feel confident in.</h2>
            <p className="mt-5 max-w-prose text-lede text-ink-muted">
              Our substantial 0.55mm transparent wear layer helps defend the decorative surface against daily traffic and
              abrasion. Paired with the Scratch Shield finish, it creates a resilient foundation for busy homes and
              beautiful interiors.
            </p>
          </div>
          {wearGrain && (
            <figure className="order-1 lg:order-2">
              <div className="relative aspect-[4/5] overflow-hidden bg-stone">
                <FinishImage image={wearGrain.image} sizes="(min-width: 1024px) 45vw, 100vw" />
              </div>
              <figcaption className="mt-3 text-[0.8125rem] text-ink-muted">{wearGrain.finish.name}, grain detail</figcaption>
            </figure>
          )}
        </div>
      </section>

      {/* 7. Performance beneath the surface: dark, interactive */}
      <section className="on-dark bg-navy py-section">
        <div className="container-page">
          <SectionIntro eyebrow="Thoughtful construction" title="Performance beneath the surface." tone="dark" />
          <div className="mt-12 lg:mt-16">
            <LayerBreakdown woodImage={woodSwatch} />
          </div>
        </div>
      </section>

      {/* 8. Beautifully fitted: inset image */}
      <section className="py-section">
        <div className="container-page grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <SectionIntro eyebrow="Precision in every detail" title="Beautifully fitted. Effortlessly finished.">
              <p>
                A secure floor begins with a precise connection. Duratek&apos;s Unilin click-lock system is designed to
                deliver dependable plank alignment and efficient floating installation, in accordance with the fitting
                instructions.
              </p>
            </SectionIntro>
            <p className="mt-6 font-display text-[1.125rem] italic text-navy">Engineered connections. A refined, seamless finish.</p>
          </div>
          {unilinCloseup && (
            <div className="lg:col-span-6 lg:col-start-7">
              <div className="relative ml-auto aspect-[3/2] w-full overflow-hidden bg-stone sm:w-4/5">
                <FinishImage image={unilinCloseup.image} sizes="(min-width: 1024px) 40vw, 80vw" />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 9. Homeowner / Trade */}
      <section className="border-t border-stone py-section" aria-labelledby="audience-heading">
        <div className="container-page">
          <p className="eyebrow">Two ways in</p>
          <h2 id="audience-heading" className="mt-4 text-display-md text-navy">
            What describes you best?
          </h2>
          <div className="mt-8">
            <AudienceSwitch />
          </div>
        </div>
      </section>

      {/* 10. Considered from every angle */}
      <section className="bg-sage py-section">
        <div className="container-page grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div className="grid grid-cols-5 gap-4">
            {consideredA && (
              <div className="relative col-span-3 aspect-[3/4] overflow-hidden bg-stone">
                <FinishImage image={consideredA.image} sizes="(min-width: 1024px) 28vw, 60vw" />
              </div>
            )}
            {consideredB && (
              <div className="relative col-span-2 mt-16 aspect-[3/4] self-start overflow-hidden bg-stone">
                <FinishImage image={consideredB.image} sizes="(min-width: 1024px) 18vw, 40vw" />
              </div>
            )}
          </div>
          <SectionIntro eyebrow="Quality and assurance" title="Considered from every angle.">
            <p>
              Waterproof SPC construction, a durable surface finish and a precision locking system come together in a
              flooring collection designed for lasting appeal. Ask for the exact product&apos;s technical sheet, warranty
              and applicable independent test certificates for full performance details.
            </p>
            <p className="font-display text-[1.125rem] italic text-navy">Scratch-resistant does not mean scratch-proof.</p>
            <p>
              <Link href="/technology" className="inline-flex min-h-tap items-center gap-2 text-navy underline-offset-4 hover:underline">
                How Duratek is made <ArrowRight size={16} />
              </Link>
            </p>
          </SectionIntro>
        </div>
      </section>

      {/* 11. Confidence for years to come */}
      <section className="py-section">
        <div className="container-page grid gap-10 lg:grid-cols-2 lg:items-end">
          <SectionIntro eyebrow="Duratek warranty" title="Confidence for years to come.">
            <p>A residential lifetime warranty and a 10 year commercial warranty.</p>
          </SectionIntro>
          <div className="lg:justify-self-end">
            <WarrantyBadges />
          </div>
          <div className="border-t border-stone pt-6 lg:col-span-2">
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
      <section className="bg-sage py-section-sm">
        <div className="container-page">
          <PostcodeBand />
        </div>
      </section>

      {/* 13. Closing */}
      <section className="on-dark relative isolate overflow-hidden bg-navy-deep">
        {closingImage && <FinishImage image={closingImage.image} sizes="100vw" className="-z-20" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-deep/90 via-navy-deep/70 to-navy-deep/30" aria-hidden="true" />
        <div className="container-page py-section">
          <p className="eyebrow text-green-light">Duratek performance flooring</p>
          <h2 className="mt-4 max-w-[16ch] text-display-lg text-on-dark">
            Timeless in style. <em className="italic">Resilient by design.</em>
          </h2>
          <p className="mt-5 max-w-md text-lede text-on-dark-muted">
            Explore the Duratek collection and choose your perfect finish.
          </p>
          <div className="mt-10">
            <ClosingCtaActions />
          </div>
        </div>
      </section>
    </>
  );
}

function StyleTile({ style, image }: { style: FinishStyle; image?: { image: Finish["images"][number] } }) {
  const copy = STYLE_COPY[style];
  return (
    <Link href={`/range?style=${style}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-stone sm:aspect-[5/4]">
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

function SingleStyle({ style, image }: { style: FinishStyle; image?: { image: Finish["images"][number] } }) {
  const copy = STYLE_COPY[style];
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
      <div className="relative aspect-[4/5] overflow-hidden bg-stone sm:aspect-[16/10] lg:col-span-7">
        {image && <FinishImage image={image.image} sizes="(min-width: 1024px) 58vw, 100vw" />}
      </div>
      <div className="lg:col-span-4 lg:col-start-9">
        <SectionIntro eyebrow="The Duratek collection" title={copy.title}>
          <p>{copy.body}</p>
        </SectionIntro>
        <ButtonLink href={`/range?style=${style}`} variant="outline" className="mt-8">
          {copy.cta}
        </ButtonLink>
      </div>
    </div>
  );
}

function PopularFinishes({ finishes }: { finishes: Finish[] }) {
  return (
    <section className="py-section" aria-labelledby="popular-heading">
      <div className="container-page flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">The collection</p>
          <h2 id="popular-heading" className="mt-4 text-display-md text-navy">
            Popular finishes
          </h2>
        </div>
        <Link href="/range" className="inline-flex min-h-tap items-center gap-2 text-navy underline-offset-4 hover:underline">
          View all finishes <ArrowRight size={16} />
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
