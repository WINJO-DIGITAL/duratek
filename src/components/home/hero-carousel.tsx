"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CatalogueImage } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";

export interface HeroSlide {
  image: CatalogueImage;
  swatch?: CatalogueImage;
  name: string;
  slug: string;
}

const INTERVAL = 7000; // ms per slide: slow enough to look at the room

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const getReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Full-bleed hero: room scenes crossfade with a slow, slight zoom. Round finish
 * swatches pick the slide (and pause it there); the active swatch has a fine
 * ring that fills as it plays.
 * Pauses on hover/focus and has a visible pause control (WCAG 2.2.2).
 * Reduced motion: no autoplay and no zoom.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const reduced = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false); // user pressed pause
  const [held, setHeld] = useState(false); // hover or focus inside
  const [loaded, setLoaded] = useState(1); // slides mounted so far (lazy beyond the first)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const playing = !reduced && !paused && !held && slides.length > 1;

  const go = useCallback(
    (i: number) => {
      const next = (i + slides.length) % slides.length;
      setLoaded((n) => Math.max(n, next + 1));
      setIndex(next);
    },
    [slides.length],
  );

  // Load the next slide's image ahead of time once the first has shown.
  useEffect(() => {
    const t = setTimeout(() => setLoaded((n) => Math.max(n, Math.min(slides.length, index + 2))), 1200);
    return () => clearTimeout(t);
  }, [index, slides.length]);

  useEffect(() => {
    if (!playing) return;
    timer.current = setTimeout(() => go(index + 1), INTERVAL);
    return () => clearTimeout(timer.current);
  }, [playing, index, go]);

  const current = slides[index];

  return (
    <>
      {/* Slides sit behind the hero copy */}
      <div aria-roledescription="carousel" aria-label="Duratek finishes in real rooms" className="absolute inset-0 -z-20">
        {slides.slice(0, loaded).map((s, i) => (
          <div
            key={s.slug}
            aria-hidden={i !== index}
            className={cn(
              "absolute inset-0 transition-opacity duration-[1400ms] ease-calm",
              i === index ? "opacity-100" : "opacity-0",
            )}
          >
            <Image
              src={s.image.src}
              alt={i === index ? s.image.alt : ""}
              fill
              sizes="100vw"
              priority={i === 0}
              quality={80}
              placeholder={s.image.blurDataURL ? "blur" : "empty"}
              blurDataURL={s.image.blurDataURL}
              className={cn(
                "object-cover object-[50%_70%]",
                !reduced && "transition-transform ease-linear",
                !reduced && (i === index ? "scale-[1.04] duration-[9000ms]" : "scale-100 duration-0"),
              )}
            />
          </div>
        ))}
      </div>

      {/* Controls: bottom-right on desktop, bottom row on phones */}
      {slides.length > 1 && (
        <div
          className="on-dark absolute inset-x-0 bottom-0 z-10"
          onMouseEnter={() => setHeld(true)}
          onMouseLeave={() => setHeld(false)}
          onFocus={() => setHeld(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setHeld(false);
          }}
        >
          <div className="container-page flex items-center justify-end gap-4 pb-5 sm:pb-8">
            <Link
              href={`/range/${current.slug}`}
              className="mr-auto hidden text-[0.8125rem] text-on-dark-muted underline-offset-4 hover:text-white hover:underline sm:block lg:mr-0"
            >
              Shown: <span className="text-white">{current.name}</span>
            </Link>
            <ul className="flex items-center gap-1" aria-label="Choose a finish">
              {slides.map((s, i) => (
                <li key={s.slug}>
                  <button
                    type="button"
                    onClick={() => {
                      go(i);
                      // A chosen floor stays on screen until play is pressed.
                      setPaused(true);
                    }}
                    aria-pressed={i === index}
                    className="group relative flex size-tap items-center justify-center rounded-full"
                  >
                    {/* Active swatch only: a fine ring with a gap, which fills
                        as the slide plays and is solid when paused. */}
                    {i === index && (
                      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
                        <circle cx="22" cy="22" r="18" fill="none" stroke="rgb(255 255 255 / 0.35)" strokeWidth="1.25" />
                        <circle
                          key={`${index}-${playing}`}
                          cx="22"
                          cy="22"
                          r="18"
                          fill="none"
                          stroke="white"
                          strokeWidth="1.25"
                          strokeDasharray="113.1"
                          strokeDashoffset={playing ? 113.1 : 0}
                          style={playing ? { animation: `hero-ring ${INTERVAL}ms linear forwards` } : undefined}
                        />
                      </svg>
                    )}
                    <span
                      className={cn(
                        "relative block size-[1.625rem] overflow-hidden rounded-full ring-1 ring-white/25 transition-opacity duration-300 ease-calm",
                        i === index ? "opacity-100" : "opacity-70 group-hover:opacity-100",
                      )}
                    >
                      {s.swatch ? (
                        <Image src={s.swatch.src} alt="" fill sizes="26px" quality={70} className="object-cover" />
                      ) : (
                        <span className="absolute inset-0 bg-white/40" />
                      )}
                    </span>
                    <span className="sr-only">Show {s.name}</span>
                  </button>
                </li>
              ))}
            </ul>
            {!reduced && (
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className="flex size-tap items-center justify-center text-white/85 hover:text-white"
              >
                {paused ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                    <path d="M3 1.5v11l9-5.5z" fill="currentColor" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                    <path d="M3 1.5h2.5v11H3zM8.5 1.5H11v11H8.5z" fill="currentColor" />
                  </svg>
                )}
                <span className="sr-only">{paused ? "Play slideshow" : "Pause slideshow"}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
