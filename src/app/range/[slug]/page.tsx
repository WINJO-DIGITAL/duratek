import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { WarrantyDisclaimer } from "@/components/content/warranty";
import { FinishCard } from "@/components/finish/finish-card";
import { FinishImage } from "@/components/finish/finish-image";
import { AddToSamplesButton } from "@/components/samples/add-to-samples-button";
import { ButtonLink } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "@/components/ui/icons";
import { getFinish, getFinishes, imagesOfKind, leadImage, specRows } from "@/lib/catalogue";
import type { Finish } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";
import { colourFamilyLabel, STYLE_LABELS } from "@/lib/config";

export async function generateStaticParams() {
  const finishes = await getFinishes();
  return finishes.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: PageProps<"/range/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const finish = await getFinish(slug);
  if (!finish) return {};
  const image = leadImage(finish);
  return {
    title: finish.name,
    description: finish.description.split("\n")[0],
    openGraph: image ? { images: [{ url: image.src, width: image.width, height: image.height, alt: image.alt }] } : undefined,
  };
}

/** Grid shape by image count, so the gallery never leaves holes. */
function galleryLayout(n: number): { grid: string; lead: string | false } {
  if (n <= 1) return { grid: "grid-cols-1", lead: "aspect-[16/9]" };
  if (n === 3) return { grid: "grid-cols-2 lg:grid-cols-3", lead: "col-span-2 aspect-square lg:row-span-2" };
  if (n === 5) return { grid: "grid-cols-2 lg:grid-cols-4", lead: "col-span-2 aspect-square lg:row-span-2" };
  return { grid: "grid-cols-2", lead: false }; // 2 or 4: equal tiles
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
    <Suspense fallback={<FinishSkeleton />}>
      <FinishContent params={params} />
    </Suspense>
  );
}

function FinishSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading finish">
      <div className="aspect-[4/5] animate-pulse bg-stone sm:aspect-[16/10] lg:aspect-[21/9]" />
      <div className="container-page grid gap-12 py-12 sm:py-16 lg:grid-cols-12 lg:gap-16">
        <div className="space-y-4 lg:col-span-7">
          <div className="h-4 w-40 bg-stone" />
          <div className="h-12 w-3/4 bg-stone" />
          <div className="h-24 w-full max-w-prose bg-stone/70" />
        </div>
        <div className="h-64 bg-stone/70 lg:col-span-5" />
      </div>
    </div>
  );
}

async function FinishContent({ params }: { params: PageProps<"/range/[slug]">["params"] }) {
  const { slug } = await params;
  const [finish, all] = await Promise.all([getFinish(slug), getFinishes()]);
  if (!finish) notFound();

  const [hero, ...moreRooms] = imagesOfKind(finish, "room");
  // Lead with the clean swatch, then close-ups and rooms. One large tile plus
  // up to four small ones fills the 2x2 + 4 pattern without gaps.
  const gallery = [...imagesOfKind(finish, "swatch"), ...imagesOfKind(finish, "closeup"), ...moreRooms].slice(0, 5);
  const specs = specRows(finish.specs);
  const sample = { id: finish.id, slug: finish.slug, name: finish.name };
  const meta = [STYLE_LABELS[finish.style], colourFamilyLabel(finish.colourFamily)].join(" · ");

  return (
    <article>
      {/* Full-bleed room scene */}
      <div className="relative aspect-[4/5] bg-stone sm:aspect-[16/10] lg:aspect-[21/9]">
        {hero && <FinishImage image={hero} sizes="100vw" priority quality={80} className="object-[50%_75%]" />}
      </div>

      <div className="container-page grid gap-12 py-12 sm:py-16 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <nav aria-label="Breadcrumb">
            <Link href="/range" className="inline-flex min-h-tap items-center gap-2 text-[0.875rem] text-ink-muted hover:text-navy">
              <ArrowLeft size={16} /> The range
            </Link>
          </nav>
          <p className="eyebrow mt-4">{meta}</p>
          <h1 className="mt-3 text-display-lg text-navy">{finish.name}</h1>
          <div className="mt-6 max-w-prose space-y-4 text-lede text-ink-muted">
            {finish.description.split(/\n\n+/).map((p) => (
              <p key={p.slice(0, 32)}>{p}</p>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-start gap-x-8 gap-y-3">
            <AddToSamplesButton finish={sample} />
            <ButtonLink href="/where-to-buy" variant="quiet" arrow={false}>
              Where to buy
            </ButtonLink>
          </div>
        </div>

        <aside className="lg:col-span-5" aria-labelledby="specs-heading">
          <h2 id="specs-heading" className="eyebrow font-sans">
            Specification
          </h2>
          <dl className="mt-4 border-t border-stone">
            {specs.map((r) => (
              <div key={r.label} className="grid grid-cols-[9rem_1fr] gap-4 border-b border-stone py-3 text-[0.9375rem]">
                <dt className="text-ink-muted">{r.label}</dt>
                <dd className="text-navy">{r.value}</dd>
              </div>
            ))}
            <div className="grid grid-cols-[9rem_1fr] gap-4 border-b border-stone py-3 text-[0.9375rem]">
              <dt className="text-ink-muted">Warranty</dt>
              <dd className="text-navy">
                Residential lifetime, 10 year commercial{" "}
                <Link href="/warranty" className="whitespace-nowrap underline underline-offset-4 hover:text-green-ink">
                  Details
                </Link>
              </dd>
            </div>
          </dl>
          <WarrantyDisclaimer className="mt-4 text-[0.75rem]" />
          <p className="mt-4 text-[0.8125rem] text-ink-muted">
            Always follow the product&apos;s installation and care guidance, including subfloor preparation.
          </p>
        </aside>
      </div>

      {gallery.length > 0 && (
        <section aria-labelledby="gallery-heading" className="bg-sage py-section-sm">
          <div className="container-page">
            <h2 id="gallery-heading" className="text-display-sm text-navy">
              In the room, and up close
            </h2>
            <ul className={cn("mt-8 grid gap-3 sm:gap-4", galleryLayout(gallery.length).grid)}>
              {gallery.map((img, i) => {
                const lead = i === 0 && galleryLayout(gallery.length).lead;
                return (
                  <li key={img.src} className={cn("relative overflow-hidden bg-stone", lead ? lead : "aspect-square")}>
                    <FinishImage image={img} sizes={lead ? "(min-width: 1024px) 60vw, 100vw" : "(min-width: 1024px) 30vw, 50vw"} />
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      <section aria-labelledby="related-heading" className="py-section">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="related-heading" className="text-display-md text-navy">
              You might also like
            </h2>
            <Link href="/range" className="inline-flex min-h-tap items-center gap-2 text-navy underline-offset-4 hover:underline">
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
