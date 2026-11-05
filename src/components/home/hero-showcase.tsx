"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CatalogueImage } from "@/lib/catalogue/types";

export interface HeroSlide {
  image: CatalogueImage;
  name: string;
  slug: string;
  swatch?: CatalogueImage;
}

/** How long each photograph holds, and how long the cross-fade takes. */
const HOLD_MS = 7000;
const FADE_MS = 1600;

/**
 * The hero photographs. Each holds, still and uncropped by motion, then
 * cross-fades slowly to the next finish. The circle names the finish shown
 * and a fine ring traces the time to the next one. Pauses on hover or focus,
 * when the tab is hidden or the hero is off screen, and on request; with
 * reduced motion it stays on the first photograph.
 */
export function HeroShowcase({ slides, children }: { slides: HeroSlide[]; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  // The outgoing photograph stays fully opaque beneath the incoming one, so
  // the change is a clean dissolve rather than a see-through double exposure.
  const [previous, setPrevious] = useState<number | null>(null);
  // Photographs are mounted as they are needed: the current one and the next.
  const [loaded, setLoaded] = useState(() => new Set([0, 1]));
  const [userPaused, setUserPaused] = useState(false);
  const [held, setHeld] = useState(false); // hover or focus
  const [hidden, setHidden] = useState(false); // tab hidden or hero off screen
  const [reduced, setReduced] = useState(false);
  const many = slides.length > 1;
  const running = many && !userPaused && !held && !hidden && !reduced;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    let offscreen = false;
    const sync = () => setHidden(document.hidden || offscreen);
    const io = new IntersectionObserver(([e]) => {
      offscreen = !e.isIntersecting;
      sync();
    });
    // The wrapper has no box of its own (display: contents): watch the hero.
    const hero = root.current?.parentElement;
    if (hero) io.observe(hero);
    document.addEventListener("visibilitychange", sync);
    return () => {
      mq.removeEventListener("change", update);
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  // Advance after a full hold. Restarting the timer on resume keeps the ring
  // (a CSS animation keyed to the slide) and the change in step.
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => {
      const next = (index + 1) % slides.length;
      setLoaded((s) => new Set(s).add(next).add((next + 1) % slides.length));
      setPrevious(index);
      setIndex(next);
    }, HOLD_MS);
    return () => clearTimeout(t);
  }, [running, index, slides.length]);

  const current = slides[index];
  if (!current) return null;

  return (
    <div ref={root} className="contents">
      <div aria-hidden="true" className="absolute inset-0 -z-20">
        {slides.map((s, i) =>
          loaded.has(i) ? (
            <div
              key={s.image.src}
              className="absolute inset-0 ease-in-out motion-reduce:transition-none"
              style={{
                opacity: i === index || i === previous ? 1 : 0,
                zIndex: i === index ? 2 : i === previous ? 1 : 0,
                // Only the incoming photograph animates; the rest switch instantly underneath.
                transition: i === index ? `opacity ${FADE_MS}ms ease-in-out` : "none",
              }}
            >
              <Image
                src={s.image.src}
                alt=""
                fill
                sizes="100vw"
                quality={80}
                priority={i === 0}
                fetchPriority={i === 0 ? "high" : "low"}
                placeholder={s.image.blurDataURL ? "blur" : "empty"}
                blurDataURL={s.image.blurDataURL}
                className="object-cover object-[50%_75%]"
              />
            </div>
          ) : null,
        )}
      </div>

      <div className="container-page grid gap-10 pb-10 pt-40 sm:pb-14 lg:grid-cols-[1fr_auto] lg:items-end lg:pb-16">
        {children}

        <div
          className="flex items-center gap-1 self-end lg:justify-self-end"
          onPointerEnter={(e) => e.pointerType === "mouse" && setHeld(true)}
          onPointerLeave={() => setHeld(false)}
          onFocus={() => setHeld(true)}
          onBlur={() => setHeld(false)}
        >
          <Link href={`/range/${current.slug}`} className="group flex min-h-tap items-center gap-3 text-on-dark">
            <span className="relative block size-11 shrink-0">
              {/* Progress ring: traces the hold, restarts with each photograph. */}
              {many && (
                <svg viewBox="0 0 44 44" aria-hidden="true" className="absolute inset-0 -rotate-90">
                  <circle cx="22" cy="22" r="21" fill="none" stroke="rgb(255 255 255 / 0.25)" strokeWidth="1" />
                  {!reduced && (
                    <circle
                      key={index}
                      cx="22"
                      cy="22"
                      r="21"
                      fill="none"
                      stroke="white"
                      strokeWidth="1"
                      pathLength={100}
                      strokeDasharray={100}
                      strokeDashoffset={100}
                      className="hero-ring"
                      style={{ animationDuration: `${HOLD_MS}ms`, animationPlayState: running ? "running" : "paused" }}
                    />
                  )}
                </svg>
              )}
              <span className="absolute inset-[5px] overflow-hidden rounded-full">
                {slides.map((s, i) =>
                  s.swatch ? (
                    <Image
                      key={s.slug}
                      src={s.swatch.src}
                      alt=""
                      fill
                      sizes="34px"
                      quality={70}
                      className="object-cover transition-opacity duration-700 motion-reduce:transition-none"
                      style={{ opacity: i === index ? 1 : 0 }}
                    />
                  ) : null,
                )}
              </span>
            </span>
            <span className="leading-tight">
              <span className="block text-[0.6875rem] uppercase tracking-[0.16em] text-on-dark/70">Shown</span>
              <span
                key={current.slug}
                aria-live={running ? "off" : "polite"}
                className="animate-[label-in_700ms_var(--ease-calm)] text-[0.9375rem] underline-offset-4 group-hover:underline"
              >
                {current.name}
              </span>
            </span>
          </Link>
          {many && !reduced && (
            <button
              type="button"
              onClick={() => setUserPaused((p) => !p)}
              aria-pressed={userPaused}
              className="flex size-tap items-center justify-center text-on-dark/70 transition-colors hover:text-on-dark"
            >
              {userPaused ? (
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M3.5 2v10l8-5z" fill="currentColor" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M4 2.5v9M10 2.5v9" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              )}
              <span className="sr-only">{userPaused ? "Play the photographs" : "Pause the photographs"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
