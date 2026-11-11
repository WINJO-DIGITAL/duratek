import type { ComponentType } from "react";
import { LayerBreakdown } from "@/components/content/layer-breakdown";
import { SectionIntro } from "@/components/content/section-intro";
import { WarrantyDisclaimer } from "@/components/content/warranty";
import { FinishImage } from "@/components/finish/finish-image";
import { ButtonLink } from "@/components/ui/button";
import { ClickIcon, DropIcon, LayersIcon, ShieldIcon } from "@/components/ui/icons";
import type { CatalogueImage } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";

const FACTS: { value: string; label: string; icon: ComponentType<{ size?: number; className?: string }>; data?: boolean }[] = [
  { value: "0.55mm", label: "Protective wear layer", icon: LayersIcon, data: true },
  { value: "Scratch Shield", label: "Scratch-resistant surface finish", icon: ShieldIcon },
  { value: "Waterproof", label: "Rigid SPC core", icon: DropIcon },
  { value: "Unilin", label: "Click-lock, floating installation", icon: ClickIcon },
];

/**
 * The page's one navy moment, as a rounded panel inset in the page: the
 * layer diagram, the four facts as soft cards, and the warranty.
 */
export function FiveLayers({ woodImage, closeUp }: { woodImage?: CatalogueImage; closeUp?: { image: CatalogueImage; name: string } }) {
  return (
    <section aria-labelledby="layers-heading" className="py-section-sm">
      <div className="container-page">
        <div className="on-dark rounded-card bg-navy px-5 py-section-sm sm:px-10 lg:px-16">
          <SectionIntro rule title={<span id="layers-heading">Five layers, one floor.</span>} tone="dark" />
          <div className="mt-stack">
            <LayerBreakdown woodImage={woodImage} />
          </div>

          {closeUp && (
            <figure className="mt-14 lg:mt-20">
              <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-white/10 sm:aspect-[16/7]">
                <FinishImage image={closeUp.image} sizes="(min-width: 1024px) 80vw, 100vw" quality={80} />
              </div>
              <figcaption className="data mt-3 text-[0.8125rem] text-on-dark/70">{closeUp.name}, up close</figcaption>
            </figure>
          )}

          <ul className={cn("grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4", closeUp ? "mt-6 lg:mt-8" : "mt-14 lg:mt-20")}>
            {FACTS.map(({ value, label, icon: IconC, data }) => (
              <li key={value} className="flex flex-col rounded-card border border-white/10 bg-white/[0.05] p-4 sm:p-6">
                <IconC size={26} className="text-green-on-navy" />
                <p className={cn("mt-6 text-on-dark", data ? "data text-[1.375rem]" : "font-display text-[1.25rem] sm:text-display-sm")}>
                  {value}
                </p>
                <p className="mt-1 text-[0.875rem] text-on-dark/80">{label}</p>
              </li>
            ))}
          </ul>

          <div className="mt-10 grid gap-6 border-t border-white/15 pt-8 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-16">
            <div>
              <p className="text-lede text-on-dark">
                Residential lifetime warranty. 10 years commercial, in light and medium traffic areas.
              </p>
              <WarrantyDisclaimer tone="dark" className="mt-3 max-w-3xl text-[0.75rem]" />
            </div>
            <ButtonLink href="/technology" variant="quiet-on-dark">
              Inside a Duratek plank
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
