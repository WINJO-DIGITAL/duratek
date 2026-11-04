"use client";

import Link from "next/link";
import { FinishImage } from "@/components/finish/finish-image";
import { ButtonLink } from "@/components/ui/button";
import type { CatalogueImage } from "@/lib/catalogue/types";
import { useSamples } from "@/lib/samples/use-samples";

/**
 * The sample tray made visible: one slot per free sample, filling as
 * finishes are added anywhere on the site.
 */
export function SampleSlots({ swatches }: { swatches: Record<string, CatalogueImage | undefined> }) {
  const { items, limit, count, remove } = useSamples();
  const slots = Array.from({ length: limit }, (_, i) => items[i]);

  return (
    <div>
      <ul className="grid grid-cols-3 gap-3 sm:gap-6">
        {slots.map((item, i) =>
          item ? (
            <li key={item.id}>
              <Link href={`/range/${item.slug}`} className="group block">
                <div className="relative aspect-square overflow-hidden bg-line">
                  {swatches[item.id] && <FinishImage image={{ ...swatches[item.id]!, alt: "" }} sizes="(min-width: 1024px) 20vw, 30vw" />}
                </div>
                <p className="mt-3 text-[0.9375rem] leading-tight text-navy group-hover:underline group-hover:underline-offset-4">
                  {item.name}
                </p>
              </Link>
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="-ml-1 min-h-tap px-1 text-[0.8125rem] text-ink-muted hover:text-navy"
              >
                Remove<span className="sr-only"> {item.name}</span>
              </button>
            </li>
          ) : (
            <li key={`empty-${i}`}>
              <Link
                href="#floor-library"
                className="flex aspect-square flex-col items-center justify-center gap-2 border border-dashed border-navy/30 text-ink-muted transition-colors duration-300 hover:border-navy hover:text-navy"
              >
                <span aria-hidden="true" className="text-2xl font-light leading-none">+</span>
                <span className="px-2 text-center text-[0.8125rem]">Choose a finish</span>
              </Link>
            </li>
          ),
        )}
      </ul>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        <p aria-live="polite" className="text-ink-muted">
          <span className="tabular-nums text-navy">
            {count} of {limit}
          </span>{" "}
          samples chosen
        </p>
        {count > 0 ? (
          <ButtonLink href="/samples">Request your samples</ButtonLink>
        ) : (
          <ButtonLink href="/range" variant="outline">
            Choose from the range
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
