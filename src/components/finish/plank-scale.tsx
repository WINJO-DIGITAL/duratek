import type { CatalogueImage } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";
import { FinishImage } from "./finish-image";

export interface ScalePlank {
  key: string;
  label: string;
  width_mm: number;
  length_mm: number;
  /** Grain to fill the plank with; drawn as an outline without one. */
  image?: CatalogueImage;
  /** Marks the plank as the one being viewed. */
  current?: boolean;
}

/**
 * Planks drawn to one scale, with dimension lines, like a technical drawing.
 * Built from boxes rather than SVG so the labels stay readable at any width
 * while the planks keep true proportions to each other.
 */
export function PlankScale({ planks, className }: { planks: ScalePlank[]; className?: string }) {
  const longest = Math.max(...planks.map((p) => p.length_mm));
  return (
    <div className={cn("space-y-10", className)}>
      {planks.map((p) => (
        // Right padding holds the width dimension, so percentages stay true to scale.
        <figure key={p.key} className="pr-16 sm:pr-20">
          <div style={{ width: `${(p.length_mm / longest) * 100}%` }}>
            <Dimension label={`${p.length_mm} mm`} />
            <div className="relative mt-2">
              <div
                style={{ aspectRatio: `${p.length_mm} / ${p.width_mm}` }}
                className={cn(
                  "relative overflow-hidden rounded-[3px]",
                  p.image ? "bg-line" : "border border-dashed border-navy/40",
                )}
              >
                {p.image && <FinishImage image={{ ...p.image, alt: "" }} sizes="(min-width: 1024px) 50vw, 90vw" />}
              </div>
              <WidthDimension label={`${p.width_mm} mm`} />
            </div>
          </div>
          <figcaption className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="flex items-center gap-2 text-[0.9375rem] text-navy">
              {p.current && <span aria-hidden="true" className="size-2 bg-green" />}
              {p.label}
              {p.current && <span className="sr-only">(this finish)</span>}
            </span>
            <span className="data text-[0.8125rem] text-ink-muted">
              {p.width_mm} × {p.length_mm} mm
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/** Horizontal dimension line with end ticks and a centred measurement. */
function Dimension({ label }: { label: string }) {
  return (
    <div aria-hidden="true" className="flex items-center gap-2 text-ink-muted">
      <span className="h-3 w-px bg-current" />
      <span className="h-px flex-1 bg-current opacity-60" />
      <span className="data text-[0.75rem]">{label}</span>
      <span className="h-px flex-1 bg-current opacity-60" />
      <span className="h-3 w-px bg-current" />
    </div>
  );
}

/** Vertical dimension line beside the plank, with its measurement to the right. */
function WidthDimension({ label }: { label: string }) {
  return (
    <div aria-hidden="true" className="absolute inset-y-0 left-full ml-2 flex items-stretch gap-1.5 text-ink-muted">
      <div className="flex flex-col items-center">
        <span className="h-px w-3 bg-current" />
        <span className="w-px flex-1 bg-current opacity-60" />
        <span className="h-px w-3 bg-current" />
      </div>
      <span className="data self-center whitespace-nowrap text-[0.75rem]">{label}</span>
    </div>
  );
}
