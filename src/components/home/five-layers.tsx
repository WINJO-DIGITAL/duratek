import Image from "next/image";
import { LayerStack } from "@/components/content/layer-stack";
import { SectionIntro } from "@/components/content/section-intro";
import { WarrantyDisclaimer } from "@/components/content/warranty";
import { ButtonLink } from "@/components/ui/button";

/**
 * The page's one navy moment, as a rounded panel inset in the page: the floor
 * in section with each layer's job in plain words, the click system, and the
 * warranty. The layers carry the 0.55 mm, Scratch Shield and waterproof facts,
 * so they are not repeated in a separate list.
 */
export function FiveLayers() {
  return (
    <section aria-labelledby="layers-heading" className="py-section-sm">
      <div className="container-page">
        <div className="on-dark rounded-card bg-navy px-5 py-section-sm sm:px-10 lg:px-16">
          <SectionIntro title={<span id="layers-heading">Five layers, one floor.</span>} tone="dark">
            <p>Each layer has a job. Together they make a floor that is waterproof, scratch-resistant and quieter underfoot.</p>
          </SectionIntro>
          <div className="mt-stack">
            <LayerStack />
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-4 text-lede text-on-dark/85 lg:mt-12">
            <span className="inline-flex rounded-control bg-off-white px-4 py-2">
              <Image src="/brand/unilin-logo.png" alt="Unilin" width={752} height={185} sizes="10rem" className="h-auto w-36" />
            </span>
            <p>Fitted with Unilin click-lock, as a floating floor.</p>
          </div>

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
