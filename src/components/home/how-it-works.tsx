"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight } from "@/components/ui/icons";
import type { CatalogueImage } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";

export interface Step {
  title: string;
  body: string;
  href: string;
  cta: string;
  image?: CatalogueImage;
}

/**
 * The homeowner journey as a step list: the selected step is large and
 * marked with an arrow; its detail and photograph fade in beside it.
 * Keyboard: arrow keys move between steps (WAI-ARIA tabs pattern).
 */
export function HowItWorks({ steps }: { steps: Step[] }) {
  const [active, setActive] = useState(0);
  const base = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const step = steps[active];

  function onKey(e: KeyboardEvent) {
    const delta = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (active + delta + steps.length) % steps.length;
    setActive(next);
    tabs.current[next]?.focus();
  }

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
      <div role="tablist" aria-orientation="vertical" aria-label="How it works" onKeyDown={onKey} className="flex flex-col lg:col-span-4">
        {steps.map((s, i) => (
          <button
            key={s.title}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            id={`${base}-tab-${i}`}
            role="tab"
            type="button"
            aria-selected={active === i}
            aria-controls={`${base}-panel`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            className="group flex min-h-tap items-center gap-3 py-1 text-left"
          >
            <ArrowRight
              size={22}
              className={cn(
                "shrink-0 text-green transition-[opacity,translate,width] duration-500 ease-calm",
                active === i ? "w-[22px] translate-x-0 opacity-100" : "w-0 -translate-x-2 opacity-0",
              )}
            />
            <span
              className={cn(
                "font-display transition-[color,font-size] duration-500 ease-calm",
                active === i ? "text-display-md text-navy" : "text-display-sm text-ink-muted group-hover:text-navy",
              )}
            >
              {s.title}
            </span>
          </button>
        ))}
      </div>

      <div
        id={`${base}-panel`}
        role="tabpanel"
        aria-labelledby={`${base}-tab-${active}`}
        className="grid gap-8 border-line sm:grid-cols-2 lg:col-span-8 lg:border-l lg:pl-16"
      >
        <div key={active} className="animate-[stagger-in_600ms_var(--ease-calm)_both] self-center">
          <p className="font-display text-[0.9375rem] tabular-nums text-green-ink">
            {String(active + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
          </p>
          <p className="mt-3 text-lede text-ink-muted">{step.body}</p>
          <Link href={step.href} className="mt-6 inline-flex min-h-tap items-center gap-2 text-navy underline-offset-4 hover:underline">
            {step.cta} <ArrowRight size={16} />
          </Link>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden bg-line">
          {steps.map((s, i) =>
            s.image ? (
              <Image
                key={s.title}
                src={s.image.src}
                alt={active === i ? s.image.alt : ""}
                fill
                sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                quality={70}
                placeholder={s.image.blurDataURL ? "blur" : "empty"}
                blurDataURL={s.image.blurDataURL}
                className={cn(
                  "object-cover transition-[opacity,scale] duration-[900ms] ease-calm",
                  active === i ? "scale-100 opacity-100" : "scale-[1.04] opacity-0",
                )}
              />
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}
