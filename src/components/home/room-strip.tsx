import Link from "next/link";
import { FinishImage } from "@/components/finish/finish-image";
import { ScratchShieldBadge } from "@/components/content/warranty";
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
      <p className="eyebrow container-page">More rooms</p>
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
                {/* The seal in the bottom-right corner, as on the finish page. */}
                <ScratchShieldBadge className="pointer-events-none absolute bottom-3 right-3 w-16! drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)] sm:w-20!" />
              </div>
              <p className="mt-4 font-display text-[1.375rem] leading-tight tracking-[-0.02em] text-navy group-hover:underline group-hover:underline-offset-4">
                {r.name}
              </p>
              {r.room && <p className="data mt-1 text-[0.8125rem] text-ink-muted">{r.room}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
