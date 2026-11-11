import { LayerStory } from "@/components/content/layer-story";
import { SectionIntro } from "@/components/content/section-intro";
import { WarrantyDisclaimer } from "@/components/content/warranty";
import { FinishImage } from "@/components/finish/finish-image";
import { ButtonLink } from "@/components/ui/button";
import type { CatalogueImage } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";

const FACTS: { value: string; label: string; data?: boolean }[] = [
  { value: "0.55mm", label: "Protective wear layer", data: true },
  { value: "Scratch Shield", label: "Scratch-resistant surface finish" },
  { value: "Waterproof", label: "Rigid SPC core" },
  { value: "Unilin", label: "Click-lock, floating installation" },
];

/**
 * The page's one navy moment, as a rounded panel inset in the page: the
 * layer diagram, the four facts as a ruled list, and the warranty.
 */
export function FiveLayers({ woodImage, closeUp }: { woodImage?: CatalogueImage; closeUp?: { image: CatalogueImage; name: string } }) {
  return (
    <section aria-labelledby="layers-heading" className="py-section-sm">
      <div className="container-page">
        <div className="on-dark rounded-card bg-navy px-5 py-section-sm sm:px-10 lg:px-16">
          <SectionIntro title={<span id="layers-heading">Five layers, one floor.</span>} tone="dark" />
          <div className="mt-stack">
            <LayerStory woodImage={woodImage} />
          </div>

          {closeUp && (
            <figure className="mt-14 lg:mt-20">
              <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-white/10 sm:aspect-[16/7]">
                <FinishImage image={closeUp.image} sizes="(min-width: 1024px) 80vw, 100vw" quality={80} />
              </div>
              <figcaption className="data mt-3 text-[0.8125rem] text-on-dark/70">{closeUp.name}, up close</figcaption>
            </figure>
          )}

          <dl className={cn("grid grid-cols-2 gap-x-6 gap-y-8 border-t border-white/15 pt-8 sm:grid-cols-4", closeUp ? "mt-10 lg:mt-12" : "mt-14 lg:mt-20")}>
            {FACTS.map(({ value, label, data }) => (
              <div key={value} className="flex min-w-0 flex-col-reverse">
                <dt className="mt-2 text-[0.875rem] text-on-dark/75">{label}</dt>
                <dd className={cn("m-0 text-on-dark", data ? "data text-[1.375rem]" : "font-display text-[1.25rem] tracking-[-0.02em] sm:text-[1.375rem]")}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-10 grid gap-6 border-t border-white/15 pt-8 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-16">
            <div>
              <p className="text-lede text-on-dark">
                Residential lifetime warranty. 10 years commercial, in light and medium traffic areas.
              </p>
              <WarrantyDisclaimer tone="dark" className="mt-3 max-w-3xl text-[0.75rem]" />
            </div>
            <ButtonLink href="/technology" variant="quiet-on-dark">
              Inside a duratek Plank
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
