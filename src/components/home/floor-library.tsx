"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { FinishImage } from "@/components/finish/finish-image";
import { AddToSamplesButton } from "@/components/samples/add-to-samples-button";
import { ArrowRight } from "@/components/ui/icons";
import type { CatalogueImage } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";

export interface LibraryBoard {
  id: string;
  slug: string;
  name: string;
  detail: string;
  measures: string;
  swatch?: CatalogueImage;
}

/**
 * Every finish as a board, side by side, light to dark. Hovering, focusing
 * or tapping a board widens it; the label below names it, with its format,
 * measurements and the sample action.
 */
export function FloorLibrary({ boards }: { boards: LibraryBoard[] }) {
  const [active, setActive] = useState(0);
  const current = boards[active];
  if (!current) return null;

  return (
    <div>
      <div
        role="group"
        aria-label="Finishes, light to dark"
        className="flex h-[24rem] gap-[2px] sm:h-[30rem] lg:h-[36rem]"
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
              onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              style={{ "--grow": on ? 7 : 1 } as CSSProperties}
              className={cn(
                "relative min-w-0 grow-[var(--grow)] basis-0 overflow-hidden bg-line transition-[flex-grow] duration-700 ease-calm motion-reduce:transition-none",
                !on && "after:absolute after:inset-0 after:bg-black/10 after:transition-opacity after:duration-500 hover:after:opacity-0",
              )}
            >
              {b.swatch && <FinishImage image={{ ...b.swatch, alt: "" }} sizes="(min-width: 1024px) 45vw, 50vw" />}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 border-t border-navy/15 pt-5 sm:grid-cols-[1fr_auto] sm:items-start">
        <div aria-live="polite">
          <p key={current.id} className="animate-[label-in_600ms_var(--ease-calm)] text-display-sm text-navy">
            {current.name}
          </p>
          <p className="mt-1 text-[0.9375rem] text-ink-muted">{current.detail}</p>
          {current.measures && <p className="data mt-1 text-[0.8125rem] text-ink-muted">{current.measures}</p>}
        </div>
        <div className="flex flex-wrap items-start gap-x-8 gap-y-2">
          <AddToSamplesButton key={current.id} finish={{ id: current.id, slug: current.slug, name: current.name }} />
          <Link
            href={`/range/${current.slug}`}
            className="inline-flex min-h-tap items-center gap-2 text-[0.9375rem] text-navy underline-offset-4 hover:underline"
          >
            View finish <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
