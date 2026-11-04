import Link from "next/link";
import { AddToSamplesButton } from "@/components/samples/add-to-samples-button";
import { leadImage } from "@/lib/catalogue/mappers";
import type { Finish } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";
import { colourFamilyLabel, STYLE_LABELS } from "@/lib/config";
import { FinishImage } from "./finish-image";

export function FinishCard({
  finish,
  sizes,
  aspect = "aspect-[4/5]",
  priority = false,
  headingLevel: H = "h3",
  className,
}: {
  finish: Finish;
  sizes: string;
  aspect?: string;
  priority?: boolean;
  headingLevel?: "h2" | "h3";
  className?: string;
}) {
  const image = leadImage(finish);
  return (
    <article className={cn("group relative flex flex-col", className)}>
      <div className={cn("relative overflow-hidden bg-stone", aspect)}>
        {image && (
          <FinishImage
            image={image}
            sizes={sizes}
            priority={priority}
            className="transition-transform duration-[1200ms] ease-calm group-hover:scale-[1.03] motion-reduce:transition-none"
          />
        )}
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <H className="text-display-sm text-navy">
            <Link href={`/range/${finish.slug}`} className="after:absolute after:inset-0 after:content-['']">
              {finish.name}
            </Link>
          </H>
          <p className="mt-1 text-[0.875rem] text-ink-muted">
            {STYLE_LABELS[finish.style]} · {colourFamilyLabel(finish.colourFamily)}
            {finish.specs.thickness_mm ? ` · ${finish.specs.thickness_mm}mm` : ""}
          </p>
        </div>
      </div>
      {/* Above the stretched link so it stays independently clickable. */}
      <AddToSamplesButton
        finish={{ id: finish.id, slug: finish.slug, name: finish.name }}
        size="compact"
        className="relative z-10 mt-1 self-start"
      />
    </article>
  );
}
