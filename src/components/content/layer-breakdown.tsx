"use client";

import Image from "next/image";
import { useId, useState, type CSSProperties } from "react";
import type { CatalogueImage } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";

const LAYERS = [
  { name: "Protective top finish", detail: "Scratch Shield. Helps resist scuffs and scratches." },
  { name: "0.55mm wear layer", detail: "Clear, and protects the design from wear." },
  { name: "Decorative layer", detail: "The printed oak pattern you see." },
  { name: "SPC rigid core", detail: "Rigid, stable and waterproof." },
  { name: "Integrated underlay", detail: "Comfort underfoot, and less noise." },
] as const;

const SLAB_STYLES: CSSProperties[] = [
  {
    background: "linear-gradient(135deg, rgb(255 255 255 / 0.55), rgb(255 255 255 / 0.12) 55%, rgb(255 255 255 / 0.4))",
    border: "1px solid rgb(255 255 255 / 0.85)",
  },
  {
    background: "linear-gradient(135deg, rgb(214 228 236 / 0.6), rgb(247 246 242 / 0.35))",
    border: "1px solid rgb(255 255 255 / 0.6)",
  },
  {},
  {
    backgroundColor: "#a9b3ba",
    backgroundImage:
      "radial-gradient(rgb(255 255 255 / 0.25) 1px, transparent 1.5px), radial-gradient(rgb(0 0 0 / 0.12) 1px, transparent 1.5px)",
    backgroundSize: "7px 7px, 11px 11px",
    backgroundPosition: "0 0, 3px 4px",
  },
  {
    backgroundColor: "#4e6577",
    backgroundImage: "repeating-linear-gradient(45deg, rgb(255 255 255 / 0.05) 0 2px, transparent 2px 6px)",
  },
];

export function LayerBreakdown({ woodImage, tone = "dark" }: { woodImage?: CatalogueImage; tone?: "light" | "dark" }) {
  const [active, setActive] = useState<number | null>(null);
  const listId = useId();
  const dark = tone === "dark";

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
      <div className="relative mx-auto aspect-square w-full max-w-[28rem] overflow-hidden [perspective:1800px]" aria-hidden="true">
        <div className="absolute inset-0 [transform-style:preserve-3d] [transform:rotateX(58deg)_rotateZ(-36deg)]">
          {LAYERS.map((layer, i) => {
            const fromBottom = LAYERS.length - 1 - i;
            const lift = active === null ? fromBottom * 34 : fromBottom * 34 + (active === i ? 26 : 0);
            return (
              <div
                key={layer.name}
                className={cn(
                  "absolute inset-[16%] overflow-hidden shadow-[0_30px_40px_-20px_rgb(12_33_64/0.45)] transition-[transform,opacity] duration-700 ease-calm",
                  active !== null && active !== i && "opacity-35",
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

      <ol id={listId} className={cn("border-t", dark ? "border-white/15" : "border-line")} onMouseLeave={() => setActive(null)}>
        {LAYERS.map((layer, i) => (
          <li key={layer.name} className={cn("border-b", dark ? "border-white/15" : "border-line")}>
            <button
              type="button"
              aria-pressed={active === i}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(active === i ? null : i)}
              className={cn(
                "flex w-full items-baseline gap-5 py-4 text-left transition-colors duration-300 min-h-tap",
                dark ? "text-on-dark-muted hover:text-on-dark" : "text-ink-muted hover:text-navy",
                active === i && (dark ? "text-on-dark" : "text-navy"),
              )}
            >
              <span className={cn("font-display text-[0.9375rem] tabular-nums", dark ? "text-green-on-navy" : "text-green-ink")}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>
                <span className={cn("block font-display text-display-sm", dark ? "text-on-dark" : "text-navy")}>{layer.name}</span>
                <span className="mt-1 block text-[0.9375rem]">{layer.detail}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
