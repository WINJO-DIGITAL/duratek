import type { Metadata } from "next";
import { PageTransition } from "@/components/layout/page-transition";
import Link from "next/link";
import { PageHero } from "@/components/content/page-hero";
import { SectionIntro } from "@/components/content/section-intro";
import { FinishImage } from "@/components/finish/finish-image";
import { AddToSamplesButton } from "@/components/samples/add-to-samples-button";
import { getFinishes, getInspiration } from "@/lib/catalogue";
import type { Finish, InspirationItem } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";
import { distinct } from "@/lib/catalogue/filter";
import { pageHero } from "@/lib/catalogue/heroes";

export const metadata: Metadata = {
  title: "Inspiration",
  description: "Room scenes and colour stories with Duratek flooring, grouped by mood.",
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function Story({ item, finishes, large }: { item: InspirationItem; finishes: Map<string, Finish>; large: boolean }) {
  const shown = item.finishIds.map((id) => finishes.get(id)).filter((f): f is Finish => Boolean(f));
  return (
    <figure className="flex flex-col">
      <div
        className={cn(
          "relative overflow-hidden rounded-card bg-line",
          large ? "aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5]" : "aspect-[4/5] lg:aspect-[3/2]",
        )}
      >
        <FinishImage
          image={item.image}
          sizes={large ? "(min-width: 1024px) 60vw, 100vw" : "(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"}
        />
      </div>
      <figcaption className="mt-4">
        <h3 className={cn("text-navy", large ? "text-display-sm" : "font-display text-[1.25rem]")}>{item.title}</h3>
        {shown.map((f) => (
          <div key={f.id} className="mt-1 flex flex-wrap items-center gap-x-5">
            <p className="text-[0.875rem] text-ink-muted">
              Shown:{" "}
              <Link href={`/range/${f.slug}`} className="text-navy underline underline-offset-4 hover:text-green-ink">
                {f.name}
              </Link>
            </p>
            <AddToSamplesButton finish={{ id: f.id, slug: f.slug, name: f.name, unavailable: f.sampleAvailable === false }} size="compact" />
          </div>
        ))}
      </figcaption>
    </figure>
  );
}

export default async function InspirationPage() {
  const [items, finishes] = await Promise.all([getInspiration(), getFinishes()]);
  const byId = new Map(finishes.map((f) => [f.id, f]));
  const moods = distinct(items.map((i) => i.mood));
  const hero = pageHero(finishes, "inspiration");

  return (
    <PageTransition>
      <>
        <PageHero image={hero?.image} focus="object-[50%_70%]">
          <SectionIntro as="h1" size="lg" tone="dark" title="Inspiration">
            <p>Duratek floors in real rooms, grouped by mood. Each photo tells you which finish it is.</p>
          </SectionIntro>
        </PageHero>
        <header className="container-page pb-10 pt-8 sm:pt-10">
          <nav aria-label="Moods" className="flex flex-wrap gap-2">
            {moods.map((m) => (
              <a
                key={m}
                href={`#${slugify(m)}`}
                className="inline-flex min-h-tap items-center border border-navy/20 px-4 text-[0.875rem] text-navy transition-colors hover:border-navy"
              >
                {m}
              </a>
            ))}
          </nav>
        </header>

        {moods.map((mood, mi) => {
          const group = items.filter((i) => i.mood === mood);
          const [lead, ...rest] = group;
          const flip = mi % 2 === 1;
          return (
            <section
              key={mood}
              id={slugify(mood)}
              aria-labelledby={`${slugify(mood)}-h`}
              className={cn("scroll-mt-header py-section-sm", mi % 2 === 1 && "bg-cream")}
            >
              <div className="container-page">
                <h2 id={`${slugify(mood)}-h`} className="reveal text-display-md text-navy">
                  {mood}
                </h2>
                <div className="mt-10 grid gap-x-6 gap-y-12 lg:grid-cols-12">
                  {lead && (
                    <div
                      className={cn(
                        "lg:sticky lg:top-24 lg:col-span-7 lg:self-start",
                        flip && "lg:order-2 lg:col-start-6",
                      )}
                    >
                      <Story item={lead} finishes={byId} large />
                    </div>
                  )}
                  <div
                    className={cn(
                      "grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1",
                      flip && "lg:order-1 lg:col-start-1",
                    )}
                  >
                    {rest.map((item) => (
                      <Story key={item.id} item={item} finishes={byId} large={false} />
                    ))}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </>
    </PageTransition>
  );
}
