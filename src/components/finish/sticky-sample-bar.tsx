"use client";

import { useEffect, useState } from "react";
import { AddToSamplesButton } from "@/components/samples/add-to-samples-button";
import type { SampleItem } from "@/lib/samples/selection";
import { cn } from "@/lib/cn";

/**
 * Phones and tablets only: once the main "Add to samples" button has scrolled
 * off the top, a slim bar above the bottom navigation keeps it one tap away.
 * It never appears while the main button is on screen, and the page reserves
 * its height so nothing is hidden underneath it.
 */
export function StickySampleBar({ finish, watch }: { finish: SampleItem; watch: string }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const target = document.getElementById(watch);
    if (!target || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => {
      // Shown only once the button is above the viewport, not below it.
      setShown(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    io.observe(target);
    return () => io.disconnect();
  }, [watch]);

  return (
    <>
      <div aria-hidden="true" className="h-sample-bar lg:hidden" />
      <div
        inert={!shown}
        className={cn(
          "fixed inset-x-0 z-30 border-t border-line bg-off-white/95 backdrop-blur-md transition-[translate,opacity] duration-500 ease-calm lg:hidden",
          "bottom-[calc(var(--spacing-bottom-bar)+env(safe-area-inset-bottom))]",
          shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
        )}
      >
        <div className="container-page flex h-sample-bar items-center justify-between gap-4">
          <p className="min-w-0 truncate font-display text-[1.0625rem] text-navy">{finish.name}</p>
          <AddToSamplesButton finish={finish} quietMessage className="shrink-0" />
        </div>
      </div>
    </>
  );
}
