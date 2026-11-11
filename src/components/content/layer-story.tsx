"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LAYERS, LayerBreakdown, SLAB_STYLES } from "@/components/content/layer-breakdown";
import { ScratchShieldBadge } from "@/components/content/warranty";
import type { CatalogueImage } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";

const QUERY = "(prefers-reduced-motion: reduce)";
const subscribe = (notify: () => void) => {
  const m = window.matchMedia(QUERY);
  m.addEventListener("change", notify);
  return () => m.removeEventListener("change", notify);
};
const motionAllowed = () => !window.matchMedia(QUERY).matches;

/**
 * The five layers, told by scrolling: the stack stays in view while each layer
 * lifts away in turn, top to bottom, and the text beside it names the layer in
 * one line. Server rendering, no-JavaScript visitors and anyone who prefers
 * reduced motion get the plain list (LayerBreakdown) instead.
 */
export function LayerStory({ woodImage }: { woodImage?: CatalogueImage }) {
  const motionOk = useSyncExternalStore(subscribe, motionAllowed, () => false);
  if (!motionOk) return <LayerBreakdown woodImage={woodImage} />;
  return <Story woodImage={woodImage} />;
}

function Story({ woodImage }: { woodImage?: CatalogueImage }) {
  const track = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const t = track.current;
      const p = pin.current;
      if (!t || !p) return;
      const stickyTop = parseFloat(getComputedStyle(p).top) || 0;
      const range = t.offsetHeight - p.offsetHeight;
      if (range <= 0) return;
      const progress = Math.min(1, Math.max(0, (stickyTop - t.getBoundingClientRect().top) / range));
      setActive(Math.min(LAYERS.length - 1, Math.floor(progress * LAYERS.length)));
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const layer = LAYERS[active];

  return (
    <div>
      {/* The same list, for screen readers: the pinned view below is a picture of it. */}
      <ol className="sr-only">
        {LAYERS.map((l) => (
          <li key={l.name}>
            {l.name}. {l.detail}
          </li>
        ))}
      </ol>

      {/* A tall track: scrolling through it moves the story on. */}
      <div ref={track} aria-hidden="true" className="relative" style={{ height: `calc(${LAYERS.length * 55}svh + 70svh)` }}>
        <div
          ref={pin}
          className="sticky top-[calc(var(--spacing-header)+0.5rem)] grid h-[calc(100svh-var(--spacing-header)-var(--spacing-bottom-bar)-1.5rem)] max-h-[44rem] grid-rows-[minmax(0,1fr)_auto] items-center gap-4 lg:h-[calc(100svh-var(--spacing-header)-2rem)] lg:grid-cols-[1.1fr_1fr] lg:grid-rows-1 lg:gap-16"
        >
          <div className="relative mx-auto aspect-square h-full max-h-[26rem] min-h-0 max-w-full [perspective:1800px] lg:h-auto lg:w-full lg:max-w-[28rem]">
            <div className="absolute inset-0 [transform-style:preserve-3d] [transform:rotateX(58deg)_rotateZ(-36deg)]">
              {LAYERS.map((l, i) => {
                const fromBottom = LAYERS.length - 1 - i;
                const peeled = i < active;
                const lift = fromBottom * 34 + (peeled ? 150 : i === active ? 26 : 0);
                return (
                  <div
                    key={l.name}
                    className={cn(
                      "absolute inset-[16%] overflow-hidden shadow-[0_30px_40px_-20px_rgb(12_33_64/0.45)] transition-[transform,opacity] duration-700 ease-calm motion-reduce:transition-none",
                      peeled ? "opacity-0" : i === active ? "opacity-100" : "opacity-45",
                    )}
                    style={{ transform: `translateZ(${lift}px)`, ...SLAB_STYLES[i] }}
                  >
                    {i === 2 &&
                      (woodImage ? (
                        <Image src={woodImage.src} alt="" fill sizes="400px" quality={70} loading="eager" className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-navy/30" />
                      ))}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="min-w-0">
            <div key={active} className="animate-[label-in_600ms_var(--ease-calm)]">
              <p className="data text-[0.8125rem] text-on-dark/60">
                {active + 1} / {LAYERS.length}
              </p>
              <p className="mt-2 font-display text-display-md text-on-dark">{layer.name}</p>
              <p className="mt-2 max-w-[28ch] text-lede text-on-dark/85">{layer.detail}</p>
              {active === 0 && <ScratchShieldBadge className="mt-4 w-20! lg:mt-6 lg:w-28!" />}
            </div>
            {/* Where you are: one mark per layer. */}
            <div className="mt-5 flex items-center gap-2 lg:mt-8">
              {LAYERS.map((l, i) => (
                <span key={l.name} className={cn("h-[2px] w-8 transition-colors duration-500", i <= active ? "bg-green-on-navy" : "bg-white/20")} />
              ))}
            </div>
            <p className={cn("mt-3 text-[0.8125rem] text-on-dark/60 transition-opacity duration-500", active === 0 ? "opacity-100" : "opacity-0")}>
              Keep scrolling to lift each layer away.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
