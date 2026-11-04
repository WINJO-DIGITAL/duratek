import type { Metadata } from "next";
import { SectionIntro } from "@/components/content/section-intro";
import { FinishCard } from "@/components/finish/finish-card";
import { PageTransition } from "@/components/layout/page-transition";
import { SavedList, type SavedEntry } from "@/components/saved/saved-list";
import { getFinishes } from "@/lib/catalogue";

export const metadata: Metadata = {
  title: "Saved finishes",
  description: "The Duratek finishes you have saved on this device. Compare up to three side by side.",
  robots: { index: false },
};

export default async function SavedPage() {
  const finishes = await getFinishes();
  const entries: SavedEntry[] = finishes.map((f) => ({
    id: f.id,
    slug: f.slug,
    name: f.name,
    card: <FinishCard finish={f} headingLevel="h2" sizes="(min-width: 1024px) 31vw, 48vw" />,
  }));
  return (
    <PageTransition>
      <div className="container-page pb-section pt-12 sm:pt-16">
        <SectionIntro as="h1" size="lg" eyebrow="Saved" title="Your saved finishes.">
          <p>Kept on this device. Compare up to three, then order free samples of the ones you like.</p>
        </SectionIntro>
        <SavedList entries={entries} />
      </div>
    </PageTransition>
  );
}
