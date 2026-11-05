"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Close, Search } from "@/components/ui/icons";
import {
  distinct,
  filtersToQuery,
  isFiltered,
  matches,
  NO_FILTERS,
  readFilters,
  type FilterableFinish,
  type RangeFilters,
} from "@/lib/catalogue/filter";
import type { FormatOption } from "@/lib/catalogue/format";
import { cn } from "@/lib/cn";
import { colourFamilyLabel, STYLE_LABELS } from "@/lib/config";

export interface RangeItem extends FilterableFinish {
  card: ReactNode;
}

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "min-h-tap shrink-0 rounded-control border px-4 text-[0.875rem] transition-colors duration-300",
        pressed ? "border-navy bg-navy text-off-white" : "border-navy/20 text-navy hover:border-navy",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Filters for the range grid, kept in the URL so links like
 * /range?style=plank and the header search work and are shareable.
 */
export function RangeBrowser({
  items,
  formats = [],
  colourSwatches = {},
}: {
  items: RangeItem[];
  /** Plank formats with their dimensions; shown when there is more than one. */
  formats?: FormatOption[];
  colourSwatches?: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = readFilters(params);

  const styles = distinct(items.map((i) => i.style));
  const colours = distinct(items.map((i) => i.colourFamily));
  const visible = items.filter((i) => matches(i, filters));
  const active = isFiltered(filters);
  const [view, setView] = useState<GridView>("large");
  // Raw text as typed (the URL holds the trimmed query).
  const [text, setText] = useState(filters.q);
  const [lastQ, setLastQ] = useState(filters.q);
  if (filters.q !== lastQ) {
    // The query changed elsewhere (header search, Clear filters): follow it.
    setLastQ(filters.q);
    if (filters.q !== text.trim()) setText(filters.q);
  }

  function update(next: Partial<RangeFilters>) {
    const qs = filtersToQuery({ ...filters, ...next });
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <>
      <div className="sticky top-header z-30 -mx-[var(--spacing-gutter)] border-y border-line bg-off-white/95 px-[var(--spacing-gutter)] py-3 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div
            role="group"
            aria-label="Filter finishes"
            className="scrollbar-none flex min-w-0 flex-1 items-center gap-2 overflow-x-auto"
          >
            {styles.length > 1 &&
              styles.map((s) => (
                <Chip
                  key={s}
                  pressed={filters.style === s}
                  onClick={() => update({ style: filters.style === s ? null : s })}
                >
                  {STYLE_LABELS[s as keyof typeof STYLE_LABELS] ?? s}
                </Chip>
              ))}
            {styles.length > 1 && <Divider />}
            {formats.length > 1 && (
              <>
                {formats.map((f) => (
                  <Chip
                    key={f.format}
                    pressed={filters.format === f.format}
                    onClick={() => update({ format: filters.format === f.format ? null : f.format })}
                  >
                    <span className="flex items-baseline gap-2 whitespace-nowrap">
                      {f.label}
                      {f.size && <span className="data text-[0.75rem] opacity-70">{f.size}</span>}
                    </span>
                  </Chip>
                ))}
                <Divider />
              </>
            )}
            <Chip pressed={!filters.colour} onClick={() => update({ colour: null })}>
              All colours
            </Chip>
            {colours.map((c) => (
              <Chip
                key={c}
                pressed={filters.colour === c}
                onClick={() => update({ colour: filters.colour === c ? null : c })}
              >
                <span className="flex items-center gap-2">
                  {colourSwatches[c] && (
                    <span className="relative block size-5 shrink-0 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgb(24_54_76/0.1)]">
                      <Image src={colourSwatches[c]} alt="" fill sizes="20px" quality={70} className="object-cover" />
                    </span>
                  )}
                  {colourFamilyLabel(c)}
                </span>
              </Chip>
            ))}
          </div>
          <div role="group" aria-label="Grid size" className="hidden shrink-0 items-center gap-1 lg:flex">
            {(["large", "small"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={cn(
                  "flex min-h-tap items-center gap-2 px-3 text-[0.875rem] capitalize transition-colors duration-300",
                  view === v ? "text-navy" : "text-ink-muted hover:text-navy",
                )}
              >
                <GridIcon dense={v === "small"} />
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex min-h-tap flex-wrap items-center gap-x-6 gap-y-3">
        <SearchField
          value={text}
          onChange={(v) => {
            setText(v);
            update({ q: v.trim() });
          }}
          className="flex w-full sm:order-last sm:ml-auto sm:w-64"
        />
        <p aria-live="polite" className="text-[0.9375rem] text-ink-muted">
          {visible.length} {visible.length === 1 ? "finish" : "finishes"}
          {filters.q && (
            <>
              {" "}
              matching “<span className="text-navy">{filters.q}</span>”
            </>
          )}
        </p>
        {active && (
          <button
            type="button"
            onClick={() => update(NO_FILTERS)}
            className="min-h-tap text-[0.9375rem] text-navy underline underline-offset-4"
          >
            Clear filters
          </button>
        )}
      </div>

      {visible.length > 0 ? (
        <RangeGrid items={visible} view={view} />
      ) : (
        <div className="card mt-10 p-8 sm:p-12">
          <h2 className="text-display-sm text-navy">No finishes match those filters.</h2>
          <p className="mt-3 text-ink-muted">Try another colour, or clear the filters to see the full range.</p>
        </div>
      )}
    </>
  );
}

function SearchField({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div role="search" className={cn("relative shrink-0 items-center", className)}>
      <Search size={18} className="pointer-events-none absolute left-3 text-ink-muted" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search finishes"
        aria-label="Search finishes"
        enterKeyHint="search"
        className="min-h-tap w-full rounded-control border border-navy/20 bg-white pl-10 pr-10 text-[0.9375rem] text-navy placeholder:text-ink-muted focus:border-navy [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-0 flex size-tap items-center justify-center text-ink-muted hover:text-navy"
        >
          <Close size={16} />
          <span className="sr-only">Clear search</span>
        </button>
      )}
    </div>
  );
}

function Divider() {
  return <span className="mx-2 h-6 w-px shrink-0 bg-line" aria-hidden="true" />;
}

export type GridView = "large" | "small";

function GridIcon({ dense }: { dense: boolean }) {
  const n = dense ? 3 : 2;
  const size = dense ? 4 : 6;
  const gap = dense ? 1.5 : 2;
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
      {Array.from({ length: n * n }, (_, i) => (
        <rect
          key={i}
          x={1 + (i % n) * (size + gap)}
          y={1 + Math.floor(i / n) * (size + gap)}
          width={size}
          height={size}
        />
      ))}
    </svg>
  );
}

export function RangeGrid({ items, view = "large" }: { items: { id: string; card: ReactNode }[]; view?: GridView }) {
  return (
    <ul
      className={cn(
        "mt-6 grid grid-cols-2 gap-3 transition-[gap] sm:gap-6 lg:gap-8",
        view === "large" ? "lg:grid-cols-3" : "lg:grid-cols-4 lg:gap-6",
      )}
    >
      {items.map((i) => (
        <li key={i.id}>{i.card}</li>
      ))}
    </ul>
  );
}
