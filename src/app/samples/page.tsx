import type { Metadata } from "next";
import { PageHero } from "@/components/content/page-hero";
import { SectionIntro } from "@/components/content/section-intro";
import { PageTransition } from "@/components/layout/page-transition";
import { SampleRequest, type SampleFinish } from "@/components/samples/sample-request";
import { getFinishes, imagesOfKind } from "@/lib/catalogue";
import { pageHero } from "@/lib/catalogue/heroes";
import { colourFamilyLabel, SAMPLE_LIMIT, STYLE_LABELS } from "@/lib/config";
import { samplesEnabled } from "@/lib/samples/settings";

export const metadata: Metadata = {
  title: "Free samples",
  description: `Order up to ${SAMPLE_LIMIT} free Duratek samples to see the colour and feel the surface at home.`,
};

const WORDS = ["", "one", "two", "three", "four", "five"];

export default async function SamplesPage() {
  const finishes = await getFinishes();
  const byId: Record<string, SampleFinish> = Object.fromEntries(
    finishes.map((f) => [
      f.id,
      {
        name: f.name,
        slug: f.slug,
        detail: `${STYLE_LABELS[f.style]} · ${colourFamilyLabel(f.colourFamily)}`,
        swatch: imagesOfKind(f, "swatch")[0],
      },
    ]),
  );

  const hero = pageHero(finishes, "samples");
  return (
    <PageTransition>
      <>
        <PageHero image={hero?.image} focus="object-[50%_45%]">
          <SectionIntro as="h1" size="lg" tone="dark" eyebrow="Free samples" title={`Order up to ${WORDS[SAMPLE_LIMIT] ?? SAMPLE_LIMIT} free samples.`}>
            <p>See the colour in your own light and feel the surface before you choose.</p>
          </SectionIntro>
        </PageHero>
        <div className="container-page pb-section pt-10 lg:pt-14">
          <SampleRequest finishes={byId} enabled={samplesEnabled()} />
        </div>
      </>
    </PageTransition>
  );
}
