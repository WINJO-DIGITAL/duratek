"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "@/components/ui/icons";
import type { CatalogueImage } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";

export interface ColourIndexItem {
  id: string;
  label: string;
  count: number;
  href: string;
  image?: CatalogueImage;
}

/**
 * Numbered, typographic index of the range by colour. Hovering or focusing a
 * row crossfades the photograph beside it (desktop); phones get thumbnails.
 */
export function ColourIndex({ items }: { items: ColourIndexItem[] }) {
  const [active, setActive] = useState(0);

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
      <ol className="border-t border-line lg:col-span-7">
        {items.map((item, i) => (
          <li key={item.id} className="border-b border-line">
            <Link
              href={item.href}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className="group grid min-h-20 grid-cols-[3rem_1fr_auto] items-center gap-4 py-4 sm:min-h-24 sm:grid-cols-[5rem_1fr_auto] lg:min-h-28"
            >
              <span
                className={cn(
                  "font-display text-display-sm tabular-nums transition-colors duration-500",
                  active === i ? "text-green-ink" : "text-ink-muted",
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "font-display text-display-md transition-[color,translate] duration-500 ease-calm lg:text-display-lg",
                  active === i ? "translate-x-1 text-navy" : "text-ink-muted group-hover:text-navy",
                )}
              >
                {item.label}
              </span>
              <span className="flex items-center gap-4">
                <span className="hidden text-[0.875rem] text-ink-muted sm:inline">
                  {item.count} {item.count === 1 ? "finish" : "finishes"}
                </span>
                {/* Phones: small thumbnail instead of the large photo. */}
                {item.image && (
                  <span className="relative size-14 overflow-hidden bg-line lg:hidden">
                    <Image src={item.image.src} alt="" fill sizes="56px" quality={70} className="object-cover" />
                  </span>
                )}
                <ArrowRight
                  size={20}
                  className={cn(
                    "hidden text-green transition-[opacity,translate] duration-500 ease-calm lg:block",
                    active === i ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0",
                  )}
                />
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <div className="relative hidden aspect-[5/4] self-center overflow-hidden bg-line lg:col-span-5 lg:block" aria-hidden="true">
        {items.map((item, i) =>
          item.image ? (
            <Image
              key={item.id}
              src={item.image.src}
              alt=""
              fill
              sizes="40vw"
              quality={70}
              placeholder={item.image.blurDataURL ? "blur" : "empty"}
              blurDataURL={item.image.blurDataURL}
              className={cn(
                "object-cover transition-[opacity,scale] duration-[900ms] ease-calm",
                active === i ? "scale-100 opacity-100" : "scale-[1.04] opacity-0",
              )}
            />
          ) : null,
        )}
      </div>
    </div>
  );
}
