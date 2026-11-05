"use client";

import { useState, type ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { COMPARE_LIMIT, compareHref } from "@/lib/saved/saved";
import { useSaved } from "@/lib/saved/use-saved";

export interface SavedEntry {
  id: string;
  slug: string;
  name: string;
  card: ReactNode;
}

/**
 * Finishes saved on this device, newest first. Tick up to three to compare.
 * Before the device's list is read (or without script) it shows the empty state.
 */
export function SavedList({ entries }: { entries: SavedEntry[] }) {
  const { items } = useSaved();
  const byId = new Map(entries.map((e) => [e.id, e]));
  const saved = items.map((i) => byId.get(i.id)).filter((e): e is SavedEntry => Boolean(e));
  // Ticked for comparison; defaults to the first three saved.
  const [picked, setPicked] = useState<string[] | null>(null);
  const ticked = (picked ?? saved.slice(0, COMPARE_LIMIT).map((e) => e.slug)).filter((s) =>
    saved.some((e) => e.slug === s),
  );

  if (saved.length === 0) {
    return (
      <div className="mt-12 border-t border-line pt-10">
        <h2 className="text-display-sm text-navy">Nothing saved yet.</h2>
        <p className="mt-3 max-w-md text-ink-muted">
          Use the bookmark on any finish to keep it here, on this device. Then compare up to three side by side.
        </p>
        <ButtonLink href="/range" className="mt-6">
          Browse the range
        </ButtonLink>
      </div>
    );
  }

  function toggle(slug: string) {
    const next = ticked.includes(slug) ? ticked.filter((s) => s !== slug) : [...ticked, slug];
    setPicked(next.slice(-COMPARE_LIMIT));
  }

  return (
    <div className="mt-10">
      <div className="sticky top-header z-20 -mx-[var(--spacing-gutter)] flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-y border-line bg-off-white/95 px-[var(--spacing-gutter)] py-3 backdrop-blur-sm">
        <p aria-live="polite" className="text-[0.9375rem] text-ink-muted">
          {saved.length} saved · <span className="tabular-nums text-navy">{ticked.length}</span> of {COMPARE_LIMIT} ticked to
          compare
        </p>
        {ticked.length >= 2 ? (
          <ButtonLink href={compareHref(ticked)}>Compare {ticked.length}</ButtonLink>
        ) : (
          <p className="min-h-tap content-center text-[0.875rem] text-ink-muted">Tick two or three to compare</p>
        )}
      </div>
      <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:gap-8 lg:grid-cols-3">
        {saved.map((e) => {
          const on = ticked.includes(e.slug);
          return (
            <li key={e.id} className="flex flex-col">
              {e.card}
              <label
                className={cn(
                  "mt-1 flex min-h-tap cursor-pointer items-center gap-2 self-start text-[0.875rem]",
                  on ? "text-navy" : "text-ink-muted hover:text-navy",
                )}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(e.slug)}
                  className="size-5 shrink-0 accent-green-ink"
                />
                Compare<span className="sr-only"> {e.name}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
