import type { Metadata } from "next";
import { PageTransition } from "@/components/layout/page-transition";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, ViewTransition } from "react";
import { WarrantyDisclaimer } from "@/components/content/warranty";
import { FinishCard } from "@/components/finish/finish-card";
import { ColourSwatches } from "@/components/finish/colour-swatches";
import { FinishGallery } from "@/components/finish/finish-gallery";
import { GrainZoom } from "@/components/finish/grain-zoom";
import { PlankScale, type ScalePlank } from "@/components/finish/plank-scale";
import { StickySampleBar } from "@/components/finish/sticky-sample-bar";
import { SaveButton } from "@/components/saved/save-button";
import { AddToSamplesButton } from "@/components/samples/add-to-samples-button";
import { ButtonLink } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "@/components/ui/icons";
import { byTone, getFinish, getFinishes, grainImage, imagesOfKind, specRows } from "@/lib/catalogue";
import { FORMAT_LABELS, formatOptions, plankFormat } from "@/lib/catalogue/format";
import { relatedFinishes } from "@/lib/catalogue/related";
import { compareHref } from "@/lib/saved/saved";
import type { Finish } from "@/lib/catalogue/types";
import { JsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/cn";
import { colourFamilyLabel } from "@/lib/config";
import { countWord } from "@/lib/number-words";
import { siteUrl } from "@/lib/site";

export async function generateStaticParams() {
  const finishes = await getFinishes();
  return finishes.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: PageProps<"/range/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const finish = await getFinish(slug);
  if (!finish) return {};
  return {
    title: finish.name,
    description: finish.description.split("\n")[0],
    alternates: { canonical: `/range/${finish.slug}` },
  };
}

/** Every plank format in the range, to scale; this finish's is filled with its grain. */
function scalePlanks(all: Finish[], finish: Finish): ScalePlank[] {
  const current = plankFormat(finish.specs);
  return formatOptions(all).flatMap(({ format, label }) => {
    const specs = format === current ? finish.specs : all.find((f) => plankFormat(f.specs) === format)?.specs;
    if (!specs?.plank_width_mm || !specs.plank_length_mm) return [];
    return [
      {
        key: format,
        label,
        width_mm: specs.plank_width_mm,
        length_mm: specs.plank_length_mm,
        current: format === current,
        image: format === current ? grainImage(finish) : undefined,
      },
    ];
  });
}

const SAMPLE_BUTTON_ID = "finish-sample";

/** Rows whose values are measurements, set in the data face. */
const MEASURED = new Set(["Plank size", "Thickness", "Wear layer", "Pack coverage"]);

/** Spec table: measurements in the data face, everything else in the body face. */
function SpecList({ rows, className }: { rows: { label: string; value: React.ReactNode }[]; className?: string }) {
  return (
    <dl className={className}>
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between gap-4 border-b border-line py-3 text-[0.9375rem]">
          <dt className="text-ink-muted">{r.label}</dt>
          <dd className={cn("text-right text-navy", MEASURED.has(r.label) && "data")}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function FinishPage({ params }: PageProps<"/range/[slug]">) {
  // params are awaited inside Suspense so the skeleton can serve as the
  // instant App Shell on client navigation.
  return (
    <PageTransition>
      <Suspense fallback={<FinishSkeleton />}>
        <FinishContent params={params} />
      </Suspense>
    </PageTransition>
  );
}

function FinishSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading finish">
      <div className="aspect-[4/5] animate-pulse bg-line sm:aspect-[16/10] lg:aspect-[21/9]" />
      <div className="container-page grid gap-12 py-12 sm:py-16 lg:grid-cols-12 lg:gap-16">
        <div className="space-y-4 lg:col-span-7">
          <div className="h-4 w-40 bg-line" />
          <div className="h-12 w-3/4 bg-line" />
          <div className="h-24 w-full max-w-prose bg-line/70" />
        </div>
        <div className="h-64 bg-line/70 lg:col-span-5" />
      </div>
    </div>
  );
}

async function FinishContent({ params }: { params: PageProps<"/range/[slug]">["params"] }) {
  const { slug } = await params;
  const [finish, all] = await Promise.all([getFinish(slug), getFinishes()]);
  if (!finish) notFound();

  // The plank leads; rooms and close-ups follow in their own gallery.
  const grain = grainImage(finish);
  const gallery = [...imagesOfKind(finish, "room"), ...imagesOfKind(finish, "closeup")].filter((i) => i !== grain);
  const specs = specRows(finish.specs);
  const keySpecs = specs.filter((r) => MEASURED.has(r.label));
  const format = plankFormat(finish.specs);
  const planks = scalePlanks(all, finish);
  const sample = { id: finish.id, slug: finish.slug, name: finish.name };
  const related = relatedFinishes(all, finish);

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Product",
              name: `Duratek ${finish.name}`,
              description: finish.description,
              url: siteUrl(`/range/${finish.slug}`),
              image: [grain, ...gallery].filter(Boolean).slice(0, 6).map((i) => i!.src),
              brand: { "@type": "Brand", name: "Duratek" },
              category: "SPC click flooring",
              additionalProperty: specs.map((r) => ({ "@type": "PropertyValue", name: r.label, value: r.value })),
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
                { "@type": "ListItem", position: 2, name: "The range", item: siteUrl("/range") },
                { "@type": "ListItem", position: 3, name: finish.name, item: siteUrl(`/range/${finish.slug}`) },
              ],
            },
          ],
        }}
      />
      {/* The plank first, beside a sticky information panel */}
      <div className="container-page grid gap-8 pt-4 sm:pt-8 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-7">
          <ViewTransition name={`finish-${finish.slug}`} share="finish-morph" default="none">
            <div>
              {grain ? (
                <GrainZoom
                  image={grain}
                  name={finish.name}
                  priority
                  sizes="(min-width: 1024px) 54vw, 100vw"
                  className="aspect-[4/5] sm:aspect-[6/5]"
                />
              ) : (
                <div className="aspect-[4/5] bg-line sm:aspect-[6/5]" />
              )}
            </div>
          </ViewTransition>
        </div>

        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-[calc(var(--spacing-header)+2rem)]">
            <nav aria-label="Breadcrumb">
              <Link href="/range" className="nav-link gap-2">
                <ArrowLeft size={16} /> The range
              </Link>
            </nav>
            <h1 className="mt-5 text-display-lg text-navy">{finish.name}</h1>
            <p className="mt-2 text-[1rem] text-ink-muted">
              {colourFamilyLabel(finish.colourFamily)}
              {format && <> · {FORMAT_LABELS[format]}</>}
            </p>

            <div className="mt-6">
              <ColourSwatches
                current={finish.slug}
                options={byTone(all).map((f) => ({ slug: f.slug, name: f.name, swatch: imagesOfKind(f, "swatch")[0] }))}
              />
            </div>

            <SpecList rows={keySpecs} className="mt-8 border-t border-line" />

            <div className="mt-8 flex flex-wrap items-start gap-x-8 gap-y-3">
              <div id={SAMPLE_BUTTON_ID}>
                <AddToSamplesButton finish={sample} />
              </div>
              <ButtonLink href="/where-to-buy" variant="quiet" arrow={false}>
                Where to buy
              </ButtonLink>
              <SaveButton finish={sample} />
            </div>
            <p className="mt-6 text-[0.875rem] text-ink-muted">
              Up to three free samples, posted to you.{" "}
              <Link
                href={compareHref([finish.slug, ...related.slice(0, 2).map((f) => f.slug)])}
                className="text-navy underline underline-offset-4 hover:text-green-ink"
              >
                Compare with similar finishes
              </Link>
            </p>
          </div>
        </aside>
      </div>

      {gallery.length > 0 && (
        <section aria-labelledby="rooms-heading" className="pt-section">
          <div className="container-page">
            <h2 id="rooms-heading" className="eyebrow font-sans">
              {finish.name} in the room
            </h2>
            <div className="mt-6">
              <FinishGallery
                images={gallery}
                name={finish.name}
                aspect="aspect-[4/5] sm:aspect-[3/2] lg:aspect-[2/1]"
                sizes="(min-width: 1440px) 1360px, 100vw"
              />
            </div>
          </div>
        </section>
      )}

      {planks.length > 0 && (
        <section aria-labelledby="scale-heading" className="pt-section">
          <div className="container-page grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-4">
              <h2 id="scale-heading" className="text-display-md text-navy">
                To scale
              </h2>
              <p className="mt-4 text-ink-muted">
                {planks.length > 1
                  ? `The range comes in ${countWord(planks.length).toLowerCase()} plank sizes, drawn here to the same scale. ${finish.name} is the ${(format ? FORMAT_LABELS[format] : "").toLowerCase()}.`
                  : `${finish.name}, drawn to scale.`}
              </p>
            </div>
            <PlankScale planks={planks} className="lg:col-span-8" />
          </div>
        </section>
      )}

      {/* About and full specification */}
      <section aria-labelledby="about-heading" className="py-section">
        <div className="container-page grid gap-10 lg:grid-cols-12 lg:gap-14">
          <h2 id="about-heading" className="text-display-md text-navy lg:col-span-4">
            About {finish.name}
          </h2>
          <div className="space-y-4 text-lede text-ink-muted lg:col-span-8">
            {finish.description.split(/\n\n+/).map((p) => (
              <p key={p.slice(0, 32)}>{p}</p>
            ))}
          </div>

          <div className="lg:col-span-8 lg:col-start-5">
            <h3 className="eyebrow font-sans">Specification</h3>
            <SpecList
              className="mt-4 grid border-t border-line sm:grid-cols-2 sm:gap-x-10"
              rows={[
                ...specs,
                {
                  label: "Warranty",
                  value: (
                    <Link href="/warranty" className="underline underline-offset-4 hover:text-green-ink">
                      Residential lifetime, 10 year commercial
                    </Link>
                  ),
                },
              ]}
            />
            <WarrantyDisclaimer className="mt-4 text-[0.75rem]" />
            <p className="mt-3 text-[0.8125rem] text-ink-muted">
              Always follow the product&apos;s installation and care guidance, including subfloor preparation.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="related-heading" className="pb-section">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line pt-section-sm">
            <h2 id="related-heading" className="text-display-md text-navy">
              You might also like
            </h2>
            <Link
              href="/range"
              className="inline-flex min-h-tap items-center gap-2 text-navy underline-offset-4 hover:underline"
            >
              View all finishes <ArrowRight size={16} />
            </Link>
          </div>
          <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {related.map((f) => (
              <li key={f.id}>
                <FinishCard finish={f} sizes="(min-width: 1024px) 23vw, 48vw" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <StickySampleBar finish={sample} watch={SAMPLE_BUTTON_ID} />
    </article>
  );
}
