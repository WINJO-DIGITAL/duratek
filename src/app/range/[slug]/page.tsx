import type { Metadata } from "next";
import { PageTransition } from "@/components/layout/page-transition";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, ViewTransition } from "react";
import { WarrantyDisclaimer } from "@/components/content/warranty";
import { FinishCard } from "@/components/finish/finish-card";
import { ColourSwatches } from "@/components/finish/colour-swatches";
import { FinishGallery } from "@/components/finish/finish-gallery";
import { AddToSamplesButton } from "@/components/samples/add-to-samples-button";
import { ButtonLink } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check } from "@/components/ui/icons";
import { getFinish, getFinishes, imagesOfKind, specRows } from "@/lib/catalogue";
import type { Finish } from "@/lib/catalogue/types";
import { JsonLd } from "@/components/seo/json-ld";
import { colourFamilyLabel, STYLE_LABELS } from "@/lib/config";
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

function related(all: Finish[], finish: Finish, n = 4): Finish[] {
  const others = all.filter((f) => f.id !== finish.id);
  const same = others.filter((f) => f.colourFamily === finish.colourFamily);
  const rest = others.filter((f) => f.colourFamily !== finish.colourFamily);
  return [...same, ...rest].slice(0, n);
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

  // Room scenes first (the card photo morphs into the first), then grain.
  const gallery = [
    ...imagesOfKind(finish, "room"),
    ...imagesOfKind(finish, "closeup"),
    ...imagesOfKind(finish, "swatch"),
  ];
  const specs = specRows(finish.specs);
  const keySpecs = specs.filter((r) => ["Plank size", "Thickness", "Wear layer", "Pack coverage"].includes(r.label));
  const sample = { id: finish.id, slug: finish.slug, name: finish.name };

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
              image: gallery.slice(0, 6).map((i) => i.src),
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
      {/* Gallery beside a sticky information panel */}
      <div className="container-page grid gap-8 pt-4 sm:pt-8 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-7">
          <ViewTransition name={`finish-${finish.slug}`} share="finish-morph" default="none">
            <div>
              <FinishGallery images={gallery} name={finish.name} />
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
            <p className="mt-1 font-display text-display-sm text-ink-muted">
              {STYLE_LABELS[finish.style]} · {colourFamilyLabel(finish.colourFamily)}
            </p>

            <div className="mt-6">
              <ColourSwatches
                current={finish.slug}
                options={all.map((f) => ({ slug: f.slug, name: f.name, swatch: imagesOfKind(f, "swatch")[0] }))}
              />
            </div>

            <dl className="mt-8 border-t border-line">
              {keySpecs.map((r) => (
                <div key={r.label} className="flex justify-between gap-4 border-b border-line py-3 text-[0.9375rem]">
                  <dt className="text-ink-muted">{r.label}</dt>
                  <dd className="text-right text-navy">{r.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex flex-wrap items-start gap-x-8 gap-y-3">
              <AddToSamplesButton finish={sample} />
              <ButtonLink href="/where-to-buy" variant="quiet" arrow={false}>
                Where to buy
              </ButtonLink>
            </div>

            <ul className="mt-8 grid gap-3 text-[0.875rem] text-navy sm:grid-cols-2">
              {[
                "Up to 3 free samples",
                "Waterproof rigid SPC core",
                "Scratch Shield surface protection",
                "Residential lifetime warranty",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <Check size={16} className="mt-0.5 shrink-0 text-green-ink" />
                  {b}
                </li>
              ))}
            </ul>
            <WarrantyDisclaimer className="mt-4 text-[0.75rem]" />
          </div>
        </aside>
      </div>

      {/* About and full specification */}
      <section aria-labelledby="about-heading" className="py-section">
        <div className="container-page grid gap-10 lg:grid-cols-12 lg:gap-14">
          <h2 id="about-heading" className="text-display-lg text-navy lg:col-span-5">
            About {finish.name}
          </h2>
          <div className="space-y-4 text-lede text-ink-muted lg:col-span-7">
            {finish.description.split(/\n\n+/).map((p) => (
              <p key={p.slice(0, 32)}>{p}</p>
            ))}
          </div>

          <div className="lg:col-span-7 lg:col-start-6">
            <h3 className="eyebrow font-sans">Specification</h3>
            <dl className="mt-4 grid border-t border-line sm:grid-cols-2 sm:gap-x-10">
              {specs.map((r) => (
                <div key={r.label} className="flex justify-between gap-4 border-b border-line py-3 text-[0.9375rem]">
                  <dt className="text-ink-muted">{r.label}</dt>
                  <dd className="text-right text-navy">{r.value}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 border-b border-line py-3 text-[0.9375rem]">
                <dt className="text-ink-muted">Warranty</dt>
                <dd className="text-right text-navy">
                  <Link href="/warranty" className="underline underline-offset-4 hover:text-green-ink">
                    Residential lifetime, 10 year commercial
                  </Link>
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-[0.8125rem] text-ink-muted">
              Always follow the product&apos;s installation and care guidance, including subfloor preparation.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="related-heading" className="py-section">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
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
          <ul className="mt-10 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {related(all, finish).map((f) => (
              <li key={f.id}>
                <FinishCard finish={f} sizes="(min-width: 1024px) 23vw, (min-width: 640px) 48vw, 100vw" />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </article>
  );
}
