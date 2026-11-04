import Link from "next/link";
import { FinishImage } from "@/components/finish/finish-image";
import { AddToSamplesButton } from "@/components/samples/add-to-samples-button";
import { ArrowRight } from "@/components/ui/icons";
import type { CatalogueImage } from "@/lib/catalogue/types";

/** A single editorial photograph, captioned with the finish, with Add sample. */
export function OneRoom({
  image,
  finish,
}: {
  image: CatalogueImage;
  finish: { id: string; slug: string; name: string; detail: string; measures: string; room?: string };
}) {
  return (
    <figure className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-14">
      <div className="reveal-img relative -mx-[var(--spacing-gutter)] aspect-[4/5] overflow-hidden bg-line sm:mx-0 lg:col-span-7">
        <FinishImage image={image} sizes="(min-width: 1024px) 55vw, 100vw" quality={80} className="object-[50%_70%]" />
      </div>
      <figcaption className="lg:col-span-4 lg:col-start-9 lg:pb-4">
        <p className="eyebrow">{finish.room ? `In a ${finish.room}` : "In the room"}</p>
        <h2 className="mt-4 text-display-lg text-navy">{finish.name}</h2>
        <p className="mt-3 text-ink-muted">{finish.detail}</p>
        {finish.measures && <p className="data mt-1 text-[0.8125rem] text-ink-muted">{finish.measures}</p>}
        <div className="mt-8 flex flex-wrap items-start gap-x-8 gap-y-2">
          <AddToSamplesButton finish={{ id: finish.id, slug: finish.slug, name: finish.name }} />
          <Link
            href={`/range/${finish.slug}`}
            className="inline-flex min-h-tap items-center gap-2 text-[0.9375rem] text-navy underline-offset-4 hover:underline"
          >
            View finish <ArrowRight size={16} />
          </Link>
        </div>
      </figcaption>
    </figure>
  );
}
