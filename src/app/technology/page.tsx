import type { Metadata } from "next";
import { PageTransition } from "@/components/layout/page-transition";
import { LayerBreakdown } from "@/components/content/layer-breakdown";
import { SectionIntro } from "@/components/content/section-intro";
import { ScratchShieldBadge } from "@/components/content/warranty";
import { FinishImage } from "@/components/finish/finish-image";
import { AskForDocuments } from "@/components/content/ask-for-documents";
import { byTone, getFinishes, grainImage, imagesOfKind } from "@/lib/catalogue";
import { pickByFileName } from "@/lib/catalogue/curation";
import { imagePool } from "@/lib/catalogue/image-pool";
import { GENERAL_CONTACT } from "@/lib/contact";
import { ClickIcon, DropIcon, LayersIcon, ShieldIcon, UnderlayIcon } from "@/components/ui/icons";

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

/** One icon per chapter, in CHAPTERS order. */
const CHAPTER_ICONS = [ShieldIcon, LayersIcon, DropIcon, UnderlayIcon, ClickIcon];

export default async function TechnologyPage() {
  const finishes = byTone(await getFinishes());
  const swatch = finishes.map((f) => imagesOfKind(f, "swatch")[0]).find(Boolean);
  // The grain held beside the chapters: a mid-tone finish, so the detail reads.
  const grainFinish = finishes[Math.floor(finishes.length / 2)];
  const grain = grainFinish && grainImage(grainFinish);
  // One room photograph to close, not used on the home page.
  const room = pickByFileName(imagePool(finishes, "room"), [
    "Fellside_Oak_XL_Luxury_Click_Vinyl_Flooring_7mm_kitchen_2.png",
    "Cartmel_Oak_Lounge.png",
  ]);

  return (
    <PageTransition>
      <>
        <header className="container-page pb-section-sm pt-12 sm:pt-16">
          <SectionIntro as="h1" size="lg" eyebrow="Technology" title="What’s Inside a Duratek Plank">
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

        <section aria-labelledby="detail-heading" className="py-section">
          <div className="container-page grid gap-12 lg:grid-cols-12 lg:gap-16">
            {grain && (
              <figure className="lg:col-span-5">
                <div className="lg:sticky lg:top-[calc(var(--spacing-header)+2rem)]">
                  <div className="reveal-img frame relative aspect-[4/5] bg-line shadow-card">
                    <FinishImage image={grain} sizes="(min-width: 1024px) 38vw, 100vw" />
                  </div>
                  <figcaption className="mt-3 text-[0.8125rem] text-ink-muted">{grainFinish.name}, the surface up close</figcaption>
                </div>
              </figure>
            )}
            <div className="lg:col-span-6 lg:col-start-7">
              <h2 id="detail-heading" className="eyebrow font-sans">
                Layer by Layer
              </h2>
              <ul className="mt-6 space-y-3 sm:space-y-4">
                {CHAPTERS.map((c, i) => {
                  const IconC = CHAPTER_ICONS[i] ?? LayersIcon;
                  return (
                    <li key={c.title} className="card reveal p-6 sm:p-8">
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex items-center gap-3">
                          <IconC size={24} className="shrink-0 text-oak" />
                          <h3 className="text-display-sm text-navy">{c.title}</h3>
                        </div>
                        {i === 0 && <ScratchShieldBadge className="w-16! shrink-0 sm:w-20!" />}
                      </div>
                      <p className="mt-3 max-w-prose text-ink-muted">{c.body}</p>
                      {c.note && <p className="mt-4 font-medium text-navy">{c.note}</p>}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>

        {room && (
          <figure className="relative">
            <div className="relative aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9]">
              <FinishImage image={room.image} sizes="100vw" className="object-[50%_70%]" />
            </div>
            <figcaption className="container-page mt-3 text-[0.8125rem] text-ink-muted">{room.finish.name}</figcaption>
          </figure>
        )}

        {GENERAL_CONTACT.email && (
          <section className="py-section">
            <div className="container-page grid gap-10 lg:grid-cols-2 lg:items-end">
              <SectionIntro title="Technical Sheets and Certificates">
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
        )}
        <div className="pb-section" />
      </>
    </PageTransition>
  );
}
