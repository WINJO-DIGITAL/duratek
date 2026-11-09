"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { FinishImage } from "@/components/finish/finish-image";
import { ButtonLink } from "@/components/ui/button";
import { AddToSamplesButton } from "@/components/samples/add-to-samples-button";
import type { CatalogueImage } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";
import { boardAt, pressIntent } from "@/lib/floor-library";

export interface LibraryBoard {
  id: string;
  slug: string;
  name: string;
  detail: string;
  measures: string;
  sampleAvailable?: boolean;
  swatch?: CatalogueImage;
}

/**
 * Every finish as a board, side by side, light to dark. Drag a finger (or
 * the mouse) across the strip and the board underneath widens as you go,
 * like running a hand along a row of samples; tap, click, hover or the arrow
 * keys work too. The open board carries its name, and the card below gives
 * its format, measurements and the sample action.
 */
export function FloorLibrary({ boards }: { boards: LibraryBoard[] }) {
  const [active, setActive] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const press = useRef<{ x: number; y: number; id: number; intent: "scrub" | "scroll" | null } | null>(null);
  // A scrub ends with a click on whichever board the finger left; ignore it.
  const swallowClick = useRef(false);
  const current = boards[active];
  if (!current) return null;

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setActive(boardAt(e.clientX, r.left, r.width, boards.length));
  };

  return (
    <div>
      <div
        role="group"
        aria-label="Finishes, light to dark"
        // pan-y: vertical movement stays the page's scroll; sideways is ours.
        className="frame flex h-[clamp(13rem,38svh,24rem)] touch-pan-y select-none gap-[2px] shadow-card sm:h-[30rem] lg:h-[36rem]"
        onPointerDown={(e) => {
          // A new press: any click left over from a previous scrub no longer applies.
          swallowClick.current = false;
          press.current = { x: e.clientX, y: e.clientY, id: e.pointerId, intent: null };
        }}
        // Mouse drags scrub too: don't let the browser start dragging a photo.
        onDragStart={(e) => e.preventDefault()}
        onPointerMove={(e) => {
          const p = press.current;
          if (!p || p.id !== e.pointerId) return;
          if (p.intent === null) {
            p.intent = pressIntent(e.clientX - p.x, e.clientY - p.y);
            if (p.intent === "scrub") {
              e.currentTarget.setPointerCapture(e.pointerId);
              setScrubbing(true);
            }
          }
          if (p.intent === "scrub") pick(e);
        }}
        onPointerUp={(e) => {
          const p = press.current;
          press.current = null;
          if (p?.intent === "scrub") {
            swallowClick.current = true;
            setScrubbing(false);
            if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
          }
        }}
        onPointerCancel={() => {
          press.current = null;
          setScrubbing(false);
        }}
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          e.preventDefault();
          const next = Math.max(0, Math.min(boards.length - 1, active + (e.key === "ArrowRight" ? 1 : -1)));
          setActive(next);
          (e.currentTarget.children[next] as HTMLElement | undefined)?.focus();
        }}
      >
        {boards.map((b, i) => {
          const on = i === active;
          return (
            <button
              key={b.id}
              type="button"
              aria-pressed={on}
              aria-label={b.name}
              onPointerEnter={(e) => e.pointerType === "mouse" && !press.current && setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => {
                if (swallowClick.current) {
                  swallowClick.current = false;
                  return;
                }
                setActive(i);
              }}
              style={{ "--grow": on ? 7 : 1 } as CSSProperties}
              className={cn(
                "relative min-w-0 grow-[var(--grow)] basis-0 overflow-hidden bg-line transition-[flex-grow] ease-calm motion-reduce:transition-none",
                // Quick while a finger scrubs, so the strip keeps up; calm otherwise.
                scrubbing ? "duration-200" : "duration-700",
                !on && "after:absolute after:inset-0 after:bg-black/10 after:transition-opacity after:duration-500 hover:after:opacity-0",
              )}
            >
              {b.swatch && <FinishImage image={{ ...b.swatch, alt: "" }} sizes="(min-width: 1024px) 45vw, 50vw" />}
              {/* The open board names itself: on phones the card below can be out of view. */}
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-3 pb-3 pt-10 text-left font-display text-[0.9375rem] leading-tight text-white transition-opacity duration-500 lg:hidden",
                  on ? "opacity-100" : "opacity-0",
                )}
              >
                {b.name}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 px-1 text-[0.8125rem] text-ink-muted">
        <span className="[@media(hover:hover)]:hidden">Swipe or tap to compare finishes</span>
        <span className="hidden [@media(hover:hover)]:inline">Hover or click to compare finishes</span>
      </p>

      <div className="card mt-3 grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-5 sm:p-6 lg:px-8">
        <div aria-live="polite">
          <p key={current.id} className="animate-[label-in_600ms_var(--ease-calm)] text-display-sm text-navy">
            {current.name}
          </p>
          <p className="mt-1 text-[0.9375rem] text-ink-muted">{current.detail}</p>
          {current.measures && <p className="data mt-1 text-[0.8125rem] text-ink-muted">{current.measures}</p>}
        </div>
        <div className="flex flex-wrap items-start gap-x-8 gap-y-2">
          <AddToSamplesButton key={current.id} finish={{ id: current.id, slug: current.slug, name: current.name, unavailable: current.sampleAvailable === false }} />
          <ButtonLink href={`/range/${current.slug}`} variant="quiet">
            View finish
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
