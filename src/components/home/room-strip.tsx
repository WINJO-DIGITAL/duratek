import Link from "next/link";
import { FinishImage } from "@/components/finish/finish-image";
import { DropIcon, LayersIcon } from "@/components/ui/icons";
import type { CatalogueImage } from "@/lib/catalogue/types";

export interface StripRoom {
  image: CatalogueImage;
  slug: string;
  name: string;
  /** "kitchen", "hallway": shown under the finish name. */
  room?: string;
}

/**
 * A row of room photographs, one per finish, scrolled sideways. Photography
 * carries the section: the only text is the finish and the room. Each card
 * opens the finish. Plain CSS scroll-snap, no script.
 */
export function RoomStrip({ rooms }: { rooms: StripRoom[] }) {
  if (rooms.length < 3) return null;
  return (
    <div className="mt-stack">
      <div className="container-page">
        <h2 className="title-rule text-display-sm text-navy">More rooms</h2>
      </div>
      <ul
        role="list"
        className="scrollbar-none mt-5 flex snap-x snap-mandatory scroll-px-[var(--spacing-gutter)] gap-4 overflow-x-auto px-[var(--spacing-gutter)] pb-2 lg:gap-6"
      >
        {rooms.map((r) => (
          <li key={r.image.src} className="w-[74vw] shrink-0 snap-start sm:w-[42vw] lg:w-[30vw]">
            <Link href={`/range/${r.slug}`} className="group block">
              <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-line">
                <FinishImage
                  image={r.image}
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 42vw, 74vw"
                  className="object-[50%_70%] transition-transform duration-[1200ms] ease-calm group-hover:scale-[1.02] motion-reduce:transition-none"
                />
              </div>
              <p className="mt-4 font-display text-[1.375rem] leading-tight tracking-[-0.02em] text-navy group-hover:underline group-hover:underline-offset-4">
                {r.name}
              </p>
              {r.room && <p className="data mt-1 text-[0.8125rem] text-ink-muted">{r.room}</p>}
              {/* Facts every Duratek floor carries, so each photograph reassures, not only the seal. */}
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-ink-muted">
                <span className="inline-flex items-center gap-1.5">
                  <DropIcon size={16} className="shrink-0 text-oak" />
                  Waterproof
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <LayersIcon size={16} className="shrink-0 text-oak" />
                  0.55 mm wear layer
                </span>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
