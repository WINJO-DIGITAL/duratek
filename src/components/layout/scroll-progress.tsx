"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

const EASE = 0.14; // share of the remaining distance covered per frame: a soft glide
const SETTLE = 0.0005; // close enough to stop the loop

/**
 * Hairline under the header that draws across as the page scrolls down and
 * retracts as it scrolls up. Script-driven (not a CSS scroll timeline) so it
 * works in every browser, iOS Safari included. It glides towards the scroll
 * position rather than jumping; with reduced motion it tracks exactly.
 * Hidden on pages too short to scroll.
 */
export function ScrollProgress({ onDark = false }: { onDark?: boolean }) {
  const bar = useRef<HTMLSpanElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let current = 0;
    let target = 0;
    let frame = 0;

    const measure = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      el.toggleAttribute("data-empty", max < 80);
      target = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };
    const paint = () => {
      el.style.transform = `scaleX(${current})`;
    };
    const tick = () => {
      current += (target - current) * EASE;
      if (Math.abs(target - current) < SETTLE) current = target;
      paint();
      frame = current === target ? 0 : requestAnimationFrame(tick);
    };
    const update = () => {
      measure();
      if (reduced.matches) {
        current = target;
        paint();
      } else if (!frame) {
        frame = requestAnimationFrame(tick);
      }
    };

    // A new page starts at the top: snap to its position instead of retracting.
    measure();
    current = target;
    paint();

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    // Content (images, filters) can change the page height without a scroll.
    const ro = new ResizeObserver(update);
    ro.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, [pathname]);

  return (
    <span
      ref={bar}
      aria-hidden="true"
      style={{ transform: "scaleX(0)" }}
      className={cn(
        "pointer-events-none absolute inset-x-0 -bottom-px h-0.5 origin-left will-change-transform data-empty:hidden",
        onDark ? "bg-green-on-navy" : "bg-green",
      )}
    />
  );
}
