"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "@/components/ui/icons";
import type { CatalogueImage } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";

const smooth = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

/**
 * Product gallery: a scroll-snap track (native swipe on touch), arrows and a
 * counter, and thumbnails on larger screens. The first image is the room
 * scene the finish card morphs into.
 */
export function FinishGallery({
  images,
  name,
  aspect = "aspect-[4/5] sm:aspect-[6/5]",
  sizes = "(min-width: 1024px) 58vw, 100vw",
  overlay,
}: {
  images: CatalogueImage[];
  name: string;
  /** Frame proportions (Tailwind aspect classes), per breakpoint. */
  aspect?: string;
  sizes?: string;
  /** Drawn over the photograph itself, bottom right (for example the Scratch Shield seal). */
  overlay?: React.ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const go = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(images.length - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: smooth() });
  }, [images.length]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  if (images.length === 0) return <div className={cn("bg-line", aspect)} />;

  return (
    <div aria-roledescription="carousel" aria-label={`${name} photographs`}>
      <div className="relative">
        <div
          ref={track}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
            e.preventDefault();
            go(index + (e.key === "ArrowRight" ? 1 : -1));
          }}
          className={cn("scrollbar-none flex snap-x snap-mandatory overflow-x-auto rounded-card bg-line shadow-card", aspect)}
        >
          {images.map((img, i) => (
            <div
              key={img.src}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${images.length}`}
              className="relative h-full w-full shrink-0 snap-center"
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                priority={i === 0}
                sizes={sizes}
                quality={80}
                placeholder={img.blurDataURL ? "blur" : "empty"}
                blurDataURL={img.blurDataURL}
                className={cn("object-cover", img.kind === "room" && "object-[50%_70%]")}
              />
            </div>
          ))}
        </div>

        {overlay}
        {images.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
            <div className="pointer-events-auto flex items-center gap-1 rounded-control bg-off-white/90 px-1 text-navy backdrop-blur-sm">
              <button
                type="button"
                onClick={() => go(index - 1)}
                disabled={index === 0}
                className="flex size-tap items-center justify-center transition-opacity disabled:opacity-30"
              >
                <ArrowLeft size={18} />
                <span className="sr-only">Previous photograph</span>
              </button>
              <span aria-live="polite" className="min-w-12 text-center text-[0.8125rem] tabular-nums">
                {index + 1} / {images.length}
              </span>
              <button
                type="button"
                onClick={() => go(index + 1)}
                disabled={index === images.length - 1}
                className="flex size-tap items-center justify-center transition-opacity disabled:opacity-30"
              >
                <ArrowRight size={18} />
                <span className="sr-only">Next photograph</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {images.length > 1 && (
        <ul className="mt-3 hidden grid-cols-8 gap-2 sm:grid">
          {images.map((img, i) => (
            <li key={img.src}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={index === i || undefined}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden rounded-control bg-line outline-offset-2 transition-opacity duration-300",
                  index === i ? "opacity-100 ring-1 ring-navy ring-offset-2 ring-offset-off-white" : "opacity-60 hover:opacity-100",
                )}
              >
                <Image src={img.src} alt="" fill sizes="80px" quality={70} className="object-cover" />
                <span className="sr-only">Show photograph {i + 1}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
