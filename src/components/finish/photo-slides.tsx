"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { FinishImage } from "@/components/finish/finish-image";
import type { CatalogueImage } from "@/lib/catalogue/types";

/**
 * A finish's photographs as a strip you swipe through. Each photograph is a
 * link to the finish, so a tap still opens it, but a swipe only moves the
 * strip. The counter shows where you are.
 */
export function PhotoSlides({
  slides,
  name,
  href,
  sizes,
  priority = false,
  aspect,
}: {
  slides: CatalogueImage[];
  name: string;
  href: string;
  sizes: string;
  priority?: boolean;
  aspect: string;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const total = slides.length;

  function onScroll() {
    const el = strip.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    <div className={`relative overflow-hidden bg-line ${aspect}`}>
      <div
        ref={strip}
        onScroll={onScroll}
        role="region"
        aria-roledescription="carousel"
        aria-label={`${name} photographs`}
        tabIndex={0}
        className="scrollbar-none flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain touch-pan-x"
      >
        {slides.map((image, i) => (
          <Link
            key={image.src}
            href={href}
            tabIndex={-1}
            aria-label={`${name}, photograph ${i + 1} of ${total}`}
            className="relative block h-full w-full shrink-0 snap-start overflow-hidden"
          >
            <FinishImage
              image={{ ...image, alt: i === 0 ? image.alt : "" }}
              sizes={sizes}
              priority={priority && i === 0}
              className="transition-transform duration-[1200ms] ease-calm group-hover:scale-[1.03] motion-reduce:transition-none"
            />
          </Link>
        ))}
      </div>
      {total > 1 && (
        <p aria-hidden="true" className="data pointer-events-none absolute left-3 top-3 rounded-control bg-off-white/90 px-2 py-0.5 text-[0.75rem] text-navy">
          {index + 1} / {total}
        </p>
      )}
    </div>
  );
}
