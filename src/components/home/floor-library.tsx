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
  /** The public RRP per m², formatted, when set. */
  rrp?: string;
  sampleAvailable?: boolean;
  swatch?: CatalogueImage;
  /** The finish in a room: shown under the strip when its board is open. */
  room?: CatalogueImage;
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
  // Room photographs load only for boards the visitor has opened.
  const [visited, setVisited] = useState<number[]>([0]);
  const select = (i: number) => {
    setActive(i);
    setVisited((v) => (v.includes(i) ? v : [...v, i]));
  };
  const [scrubbing, setScrubbing] = useState(false);
  const press = useRef<{ x: number; y: number; id: number; intent: "scrub" | "scroll" | null } | null>(null);
  // A scrub ends with a click on whichever board the finger left; ignore it.
  const swallowClick = useRef(false);
  const current = boards[active];
  if (!current) return null;

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    select(boardAt(e.clientX, r.left, r.width, boards.length));
  };

  return (
    <div>
      <div
        role="group"
        aria-label="Finishes, light to dark"
        // pan-y: vertical movement stays the page's scroll; sideways is ours.
        className="-mx-[var(--spacing-gutter)] flex h-[clamp(13rem,38svh,24rem)] touch-pan-y select-none gap-[2px] sm:h-[30rem] lg:h-[26rem]"
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
          select(next);
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
              onPointerEnter={(e) => e.pointerType === "mouse" && !press.current && select(i)}
              onFocus={() => select(i)}
              onClick={() => {
                if (swallowClick.current) {
                  swallowClick.current = false;
                  return;
                }
                select(i);
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
            </button>
          );
        })}
      </div>

      {boards.some((b) => b.room) && (
        <div className="relative -mx-[var(--spacing-gutter)] mt-[2px] aspect-[4/3] bg-line sm:aspect-[16/7] lg:aspect-[21/8]">
          {visited.map((i) => {
            const room = boards[i]?.room;
            if (!room) return null;
            return (
              <div
                key={boards[i].id}
                aria-hidden={i !== active}
                className={cn(
                  "absolute inset-0 transition-opacity duration-[900ms] ease-calm motion-reduce:transition-none",
                  i === active ? "opacity-100" : "opacity-0",
                )}
              >
                <FinishImage image={room} sizes="100vw" className="object-cover object-[50%_90%]" />
              </div>
            );
          })}
        </div>
      )}

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
          {current.rrp && (
            <p className="mt-2 text-navy">
              <span className="data text-[1.125rem] font-medium">{current.rrp}</span>{" "}
              <span className="text-[0.8125rem] text-ink-muted">RRP per m²</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-start gap-x-8 gap-y-2">
          <AddToSamplesButton key={current.id} finish={{ id: current.id, slug: current.slug, name: current.name, unavailable: current.sampleAvailable === false }} />
          <ButtonLink href={`/range/${current.slug}`} variant="quiet">
            View Finish
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
