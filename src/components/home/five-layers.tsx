import { LayerBreakdown } from "@/components/content/layer-breakdown";
import { SectionIntro } from "@/components/content/section-intro";
import { WarrantyDisclaimer } from "@/components/content/warranty";
import { ButtonLink } from "@/components/ui/button";
import type { CatalogueImage } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";

const FACTS = [
  { value: "0.55mm", label: "Protective wear layer", data: true },
  { value: "Scratch Shield", label: "Scratch-resistant surface finish" },
  { value: "Waterproof", label: "Rigid SPC core" },
  { value: "Unilin", label: "Click-lock, floating installation" },
] as const;

/** The page's one navy section: the layer diagram, four facts and the warranty. */
export function FiveLayers({ woodImage }: { woodImage?: CatalogueImage }) {
  return (
    <section aria-labelledby="layers-heading" className="on-dark bg-navy py-section">
      <div className="container-page">
        <SectionIntro eyebrow="Five layers" title={<span id="layers-heading">Five layers, one floor.</span>} tone="dark" />
        <div className="mt-12 lg:mt-16">
          <LayerBreakdown woodImage={woodImage} />
        </div>

        <dl className="mt-16 grid grid-cols-2 border-t border-white/15 lg:mt-20 lg:grid-cols-4">
          {FACTS.map((f, i) => (
            <div
              key={f.value}
              className={cn(
                "flex flex-col-reverse gap-1 border-white/15 py-6 pr-4",
                i % 2 === 1 && "border-l pl-4 lg:pl-8",
                i >= 2 && "border-t lg:border-t-0",
                i === 2 && "lg:border-l lg:pl-8",
              )}
            >
              <dt className="text-[0.875rem] text-on-dark-muted">{f.label}</dt>
              <dd className={cn("text-on-dark", "data" in f ? "data text-[1.5rem]" : "font-display text-display-sm")}>
                {f.value}
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
            Inside a Duratek plank
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
