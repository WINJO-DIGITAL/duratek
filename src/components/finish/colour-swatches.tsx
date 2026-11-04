import Image from "next/image";
import Link from "next/link";
import type { CatalogueImage } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";

export interface SwatchOption {
  slug: string;
  name: string;
  swatch?: CatalogueImage;
}

/**
 * Round swatches for every finish; the current one is ringed. Each is a link,
 * so switching colour is a normal navigation (and morphs the gallery photo).
 */
export function ColourSwatches({ options, current }: { options: SwatchOption[]; current: string }) {
  const active = options.find((o) => o.slug === current);
  return (
    <div>
      <p className="text-[0.875rem] text-ink-muted">
        Colour: <span className="text-navy">{active?.name}</span>
      </p>
      <ul className="mt-3 grid w-fit grid-cols-6 gap-1.5" aria-label="Other colours">
        {options.map((o) => {
          const isCurrent = o.slug === current;
          return (
            <li key={o.slug}>
              <Link
                href={`/range/${o.slug}`}
                aria-current={isCurrent ? "page" : undefined}
                title={o.name}
                className="group relative flex size-tap items-center justify-center rounded-full"
              >
                <span
                  className={cn(
                    "absolute inset-0 rounded-full border transition-colors duration-300",
                    isCurrent ? "border-navy" : "border-transparent group-hover:border-line",
                  )}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "relative block size-9 overflow-hidden rounded-full bg-line shadow-[inset_0_0_0_1px_rgb(24_54_76/0.08)] transition-transform duration-500 ease-calm",
                    !isCurrent && "group-hover:scale-105",
                  )}
                >
                  {o.swatch && (
                    <Image src={o.swatch.src} alt="" fill sizes="36px" quality={70} className="object-cover" />
                  )}
                </span>
                <span className="sr-only">{o.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
