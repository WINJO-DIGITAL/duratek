import type { Metadata } from "next";
import Image from "next/image";
import { PageTransition } from "@/components/layout/page-transition";
import { SectionIntro } from "@/components/content/section-intro";
import { ScratchShieldBadge, WarrantyDisclaimer } from "@/components/content/warranty";
import { FinishImage } from "@/components/finish/finish-image";
import { AskForDocuments } from "@/components/content/ask-for-documents";
import { byTone, getFinishes, grainImage } from "@/lib/catalogue";
import { pickByFileName } from "@/lib/catalogue/curation";
import { imagePool } from "@/lib/catalogue/image-pool";
import { ButtonLink } from "@/components/ui/button";
import { GENERAL_CONTACT } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Technology",
  description:
    "Scratch Shield surface protection, a 0.55mm wear layer, a waterproof rigid SPC core, integrated underlay and the Unilin click-lock system.",
};

const CHAPTERS: { title: string; body: string; note?: string; logo?: { src: string; width: number; height: number; alt: string } }[] = [
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
    body: "Each plank clicks into the next using Unilin’s locking joint, so the planks stay aligned and the finished floor floats over the subfloor instead of being glued. Follow the fitting instructions, including subfloor preparation.",
    logo: { src: "/brand/unilin-logo.png", width: 752, height: 185, alt: "Unilin" },
  },
];


export default async function TechnologyPage() {
  const finishes = byTone(await getFinishes());
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
          <SectionIntro as="h1" size="lg" eyebrow="Technology" title="What’s Inside a duratek Plank">
            <p>
              Five layers, from the clear finish you walk on down to the underlay that sits on your subfloor. Here’s what
              each one does.
            </p>
          </SectionIntro>
        </header>

        <section className="on-dark bg-navy py-section" aria-label="The five layers">
          <div className="container-page">
            {/* The same film as the home page: the layers are named in the chapters below. */}
            <div className="relative mx-auto w-full max-w-[30rem] overflow-hidden rounded-card bg-navy" aria-hidden="true">
              <video
                className="block h-auto w-full motion-reduce:hidden"
                src="/brand/layers-assemble.mp4"
                poster="/brand/layers-poster.jpg"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
              >
                <source src="/brand/layers-assemble.webm" type="video/webm" />
              </video>
              {/* eslint-disable-next-line @next/next/no-img-element -- still poster for reduced motion */}
              <img src="/brand/layers-poster.jpg" alt="" className="hidden h-auto w-full motion-reduce:block" loading="lazy" decoding="async" />
            </div>
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
              <ul className="mt-6">
                {CHAPTERS.map((c, i) => (
                  <li key={c.title} className="reveal grid gap-4 border-t border-line py-7 sm:grid-cols-[1fr_auto] sm:gap-8">
                    <div>
                      <h3 className="font-display text-display-sm text-navy">{c.title}</h3>
                      <p className="mt-3 max-w-prose text-ink-muted">{c.body}</p>
                      {c.note && <p className="mt-3 font-medium text-navy">{c.note}</p>}
                      {c.logo && <Image src={c.logo.src} alt={c.logo.alt} width={c.logo.width} height={c.logo.height} sizes="10rem" className="mt-5 h-auto w-40" />}
                    </div>
                    {i === 0 && <ScratchShieldBadge className="w-16! sm:w-20!" />}
                  </li>
                ))}
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
                <WarrantyDisclaimer className="mt-4" />
              </SectionIntro>
              <div className="lg:justify-self-end">
                <AskForDocuments />
              </div>
            </div>
          </section>
        )}
        <section className="bg-cream py-section-sm">
          <div className="container-page grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-14">
            <div className="lg:col-span-8">
              <p className="eyebrow">Straight plank or herringbone</p>
              <h2 className="mt-3 text-display-md text-navy">Timeless in style. Resilient by design.</h2>
              <p className="mt-4 max-w-[60ch] text-lede text-navy/80">
                Choose the look you want, then the tone that suits the room.
              </p>
            </div>
            <div className="lg:col-span-4 lg:justify-self-end">
              <ButtonLink href="/range">Explore the range</ButtonLink>
            </div>
          </div>
        </section>
        <div className="pb-section" />
      </>
    </PageTransition>
  );
}
