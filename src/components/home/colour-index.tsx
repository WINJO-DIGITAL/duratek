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
  swatch?: CatalogueImage;
}

/**
 * The range by colour.
 * Phones and tablets: a 2x2 grid of plank close-ups (the grain is what sells
 * a colour), each with its name, finish count and an arrow. No hover state,
 * so nothing looks "selected" or greyed out on touch.
 * Desktop: a typographic index; hovering or focusing a row crossfades a room
 * photograph beside it.
 */
export function ColourIndex({ items }: { items: ColourIndexItem[] }) {
  return (
    <>
      <ColourTiles items={items} />
      <ColourList items={items} />
    </>
  );
}

function finishCount(n: number) {
  return `${n} ${n === 1 ? "finish" : "finishes"}`;
}

function ColourTiles({ items }: { items: ColourIndexItem[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 lg:hidden">
      {items.map((item) => {
        const img = item.swatch ?? item.image;
        return (
          <li key={item.id}>
            <Link href={item.href} className="group block">
              <span className="relative block aspect-square overflow-hidden bg-line">
                {img && (
                  <Image
                    src={img.src}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 45vw, 50vw"
                    quality={75}
                    placeholder={img.blurDataURL ? "blur" : "empty"}
                    blurDataURL={img.blurDataURL}
                    className="object-cover transition-transform duration-700 ease-calm group-hover:scale-[1.04] motion-reduce:transition-none"
                  />
                )}
              </span>
              <span className="mt-3 block font-display text-display-sm text-navy">{item.label}</span>
              <span className="mt-1 flex items-center justify-between gap-2 text-[0.875rem] text-ink-muted">
                {finishCount(item.count)}
                <ArrowRight size={18} className="text-green-ink transition-transform duration-300 ease-calm group-hover:translate-x-1" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ColourList({ items }: { items: ColourIndexItem[] }) {
  const [active, setActive] = useState(0);

  return (
    <div className="hidden gap-16 lg:grid lg:grid-cols-12">
      <ol className="border-t border-line lg:col-span-7">
        {items.map((item, i) => (
          <li key={item.id} className="border-b border-line">
            <Link
              href={item.href}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className="group grid min-h-28 grid-cols-[5rem_1fr_auto] items-center gap-4 py-4"
            >
              {/* Round colour swatch in place of a number */}
              <span
                aria-hidden="true"
                className={cn(
                  "relative block size-10 overflow-hidden rounded-full bg-line ring-offset-2 ring-offset-white transition-[box-shadow,scale] duration-500 ease-calm",
                  active === i ? "scale-100 ring-1 ring-navy" : "scale-90",
                )}
              >
                {item.swatch && <Image src={item.swatch.src} alt="" fill sizes="40px" quality={70} className="object-cover" />}
              </span>
              <span
                className={cn(
                  "font-display text-display-lg transition-[color,translate] duration-500 ease-calm",
                  active === i ? "translate-x-1 text-navy" : "text-ink-muted group-hover:text-navy",
                )}
              >
                {item.label}
              </span>
              <span className="flex items-center gap-4">
                <span className="text-[0.875rem] text-ink-muted">{finishCount(item.count)}</span>
                <ArrowRight
                  size={20}
                  className={cn(
                    "text-green transition-[opacity,translate] duration-500 ease-calm",
                    active === i ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0",
                  )}
                />
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <div className="relative aspect-[5/4] self-center overflow-hidden bg-line lg:col-span-5" aria-hidden="true">
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
