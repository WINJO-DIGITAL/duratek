import type { Metadata } from "next";
import { LayerBreakdown } from "@/components/content/layer-breakdown";
import { SectionIntro } from "@/components/content/section-intro";
import { ScratchShieldBadge } from "@/components/content/warranty";
import { FinishImage } from "@/components/finish/finish-image";
import { ButtonLink } from "@/components/ui/button";
import { getFinishes, imagesOfKind } from "@/lib/catalogue";
import { imagePool, takeFrom, type PooledImage } from "@/lib/catalogue/image-pool";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Technology",
  description:
    "Scratch Shield surface protection, a 0.55mm wear layer, a waterproof rigid SPC core, integrated underlay and the Unilin click-lock system.",
};

const CHAPTERS: { eyebrow: string; title: string; body: string[]; note?: string }[] = [
  {
    eyebrow: "Scratch Shield",
    title: "Made for life as it happens.",
    body: [
      "Duratek Scratch Shield is designed to help protect the beauty of your floor from everyday scuffs, abrasion and surface wear. A sophisticated protective finish complements the robust wear layer beneath, without compromising the natural appearance of the floor.",
    ],
    note: "Scratch-resistant does not mean scratch-proof.",
  },
  {
    eyebrow: "0.55mm wear layer",
    title: "Protection you can feel confident in.",
    body: [
      "Our substantial 0.55mm transparent wear layer helps defend the decorative surface against daily traffic and abrasion. Paired with the Scratch Shield finish, it creates a resilient foundation for busy homes and beautiful interiors.",
    ],
  },
  {
    eyebrow: "Waterproof rigid SPC core",
    title: "Stable underneath. Practical every day.",
    body: [
      "Beneath the wood-effect surface, a rigid SPC core provides stability: a waterproof, practical core for the demands of everyday living.",
    ],
  },
  {
    eyebrow: "Integrated underlay",
    title: "Comfort built in.",
    body: ["Every Duratek plank has an integrated underlay, adding comfort underfoot and reducing sound."],
  },
  {
    eyebrow: "Unilin click-lock",
    title: "Beautifully fitted. Effortlessly finished.",
    body: [
      "A secure floor begins with a precise connection. Duratek's Unilin click-lock system is designed to deliver dependable plank alignment and efficient floating installation, in accordance with the fitting instructions.",
    ],
    note: "Engineered connections. A refined, seamless finish.",
  },
];

export default async function TechnologyPage() {
  const finishes = await getFinishes();
  // Room scenes from later in the pool, so this page doesn't echo the home page.
  const next = takeFrom(imagePool(finishes, "room").slice(8));
  const chapterImages: (PooledImage | undefined)[] = CHAPTERS.map(() => next());
  const swatch = finishes.map((f) => imagesOfKind(f, "swatch")[0]).find(Boolean);

  return (
    <>
      <header className="container-page pb-section-sm pt-12 sm:pt-16">
        <SectionIntro as="h1" size="lg" eyebrow="Duratek technology" title="Performance beneath the surface.">
          <p>
            Refined wood-inspired design meets the quiet confidence of advanced flooring technology. Five layers, each
            with a job to do.
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
          <section key={c.eyebrow} className={cn("py-section", i % 2 === 1 && "bg-white")}>
            <div className="container-page grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
              <div className={cn("lg:col-span-5", flip ? "lg:order-2 lg:col-start-8" : "lg:order-1")}>
                <p className="font-display text-[0.9375rem] text-green-ink tabular-nums">{String(i + 1).padStart(2, "0")}</p>
                <SectionIntro eyebrow={c.eyebrow} title={c.title} className="mt-2">
                  {c.body.map((p) => (
                    <p key={p.slice(0, 24)}>{p}</p>
                  ))}
                </SectionIntro>
                {c.note && <p className="mt-6 font-display text-[1.125rem] italic text-navy">{c.note}</p>}
                {i === 0 && <ScratchShieldBadge className="mt-8" />}
              </div>
              {img && (
                <figure className={cn("lg:col-span-6", flip ? "lg:order-1 lg:col-start-1" : "lg:order-2 lg:col-start-7")}>
                  <div className={cn("relative overflow-hidden bg-line", i % 3 === 0 ? "aspect-[4/5]" : "aspect-[4/3]")}>
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
          <SectionIntro eyebrow="Quality and assurance" title="Considered from every angle.">
            <p>
              Ask for the exact product&apos;s technical sheet, warranty and applicable independent test certificates for
              full performance details. Always follow the product&apos;s installation and care guidance, including
              subfloor preparation.
            </p>
          </SectionIntro>
          <div className="lg:justify-self-end">
            <ButtonLink href="/samples">Order free samples</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
