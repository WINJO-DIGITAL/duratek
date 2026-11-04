import type { Metadata } from "next";
import { PageTransition } from "@/components/layout/page-transition";
import { LayerBreakdown } from "@/components/content/layer-breakdown";
import { SectionIntro } from "@/components/content/section-intro";
import { ScratchShieldBadge } from "@/components/content/warranty";
import { FinishImage } from "@/components/finish/finish-image";
import { AskForDocuments } from "@/components/content/ask-for-documents";
import { getFinishes, imagesOfKind } from "@/lib/catalogue";
import { imagePool, takeFrom, type PooledImage } from "@/lib/catalogue/image-pool";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Technology",
  description:
    "Scratch Shield surface protection, a 0.55mm wear layer, a waterproof rigid SPC core, integrated underlay and the Unilin click-lock system.",
};

const CHAPTERS: { title: string; body: string; note?: string }[] = [
  {
    title: "Scratch Shield",
    body: "A clear protective finish over the wear layer. It helps the surface resist the scuffs and fine scratches that build up in a busy home, and it doesn’t change how the floor looks.",
    note: "Scratch-resistant does not mean scratch-proof.",
  },
  {
    title: "The 0.55mm wear layer",
    body: "The clear layer between the finish and the printed wood design. It protects that design from foot traffic and abrasion, so it’s the figure to look for when you compare one floor with another.",
  },
  {
    title: "Rigid SPC core",
    body: "SPC is stone plastic composite: a dense, rigid board that keeps each plank stable. It’s waterproof, so the same floor can run through the kitchen, the downstairs loo and the utility room.",
  },
  {
    title: "Integrated underlay",
    body: "The underlay is bonded to the back of every plank. It makes the floor more comfortable to stand on and helps cut down noise.",
  },
  {
    title: "Unilin click-lock",
    body: "Each plank clicks into the next using Unilin’s locking joint, and the finished floor floats over the subfloor instead of being glued. Follow the fitting instructions, including subfloor preparation.",
  },
];

export default async function TechnologyPage() {
  const finishes = await getFinishes();
  // Room scenes from later in the pool, so this page doesn't echo the home page.
  const next = takeFrom(imagePool(finishes, "room").slice(8));
  const chapterImages: (PooledImage | undefined)[] = CHAPTERS.map(() => next());
  const swatch = finishes.map((f) => imagesOfKind(f, "swatch")[0]).find(Boolean);

  return (
    <PageTransition>
      <>
        <header className="container-page pb-section-sm pt-12 sm:pt-16">
          <SectionIntro as="h1" size="lg" title="What’s inside a Duratek plank">
            <p>
              Five layers, from the clear finish you walk on down to the underlay that sits on your subfloor. Here’s what
              each one does.
            </p>
          </SectionIntro>
        </header>

        <section className="on-dark bg-navy py-section" aria-label="The five layers">
          <div className="container-page">
            <LayerBreakdown woodImage={swatch} />
          </div>
        </section>

        {CHAPTERS.map((c, i) => {
          const img = chapterImages[i];
          const flip = i % 2 === 1;
          return (
            <section key={c.title} className={cn("py-section", i % 2 === 1 && "bg-white")}>
              <div className="container-page grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
                <div className={cn("lg:col-span-5", flip ? "lg:order-2 lg:col-start-8" : "lg:order-1")}>
                  <SectionIntro title={c.title}>
                    <p>{c.body}</p>
                  </SectionIntro>
                  {c.note && <p className="mt-6 font-medium text-navy">{c.note}</p>}
                  {i === 0 && <ScratchShieldBadge className="mt-8" />}
                </div>
                {img && (
                  <figure
                    className={cn("lg:col-span-6", flip ? "lg:order-1 lg:col-start-1" : "lg:order-2 lg:col-start-7")}
                  >
                    <div
                      className={cn("reveal-img relative overflow-hidden bg-line", i % 3 === 0 ? "aspect-[4/5]" : "aspect-[4/3]")}
                    >
                      <FinishImage image={img.image} sizes="(min-width: 1024px) 45vw, 100vw" />
                    </div>
                    <figcaption className="mt-3 text-[0.8125rem] text-ink-muted">{img.finish.name}</figcaption>
                  </figure>
                )}
              </div>
            </section>
          );
        })}

        <section className="border-t border-line py-section">
          <div className="container-page grid gap-10 lg:grid-cols-2 lg:items-end">
            <SectionIntro title="Technical sheets and certificates">
              <p>
                Ask for the technical sheet, the warranty terms and any independent test certificates for the finish
                you’re considering, and always follow its installation and care guidance.
              </p>
            </SectionIntro>
            <div className="lg:justify-self-end">
              <AskForDocuments />
            </div>
          </div>
        </section>
      </>
    </PageTransition>
  );
}
