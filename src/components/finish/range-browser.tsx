"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { Close, Search } from "@/components/ui/icons";
import {
  distinct,
  filtersToQuery,
  isFiltered,
  matches,
  NO_FILTERS,
  PRICE_BANDS,
  priceBandOf,
  readFilters,
  TONE_GROUPS,
  type FilterableFinish,
  type RangeFilters,
} from "@/lib/catalogue/filter";
import type { FormatOption } from "@/lib/catalogue/format";
import { cn } from "@/lib/cn";
import { STYLE_LABELS } from "@/lib/config";
import { FilterRows, type FilterOption, type FilterRowDef } from "./filter-rows";

export interface RangeItem extends FilterableFinish {
  card: ReactNode;
}

/**
 * Filters for the range grid, kept in the URL so links like
 * /range?style=plank and the header search work and are shareable.
 */
export function RangeBrowser({
  items,
  formats = [],
}: {
  items: RangeItem[];
  /** Plank formats with their dimensions; shown when there is more than one. */
  formats?: FormatOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = readFilters(params);

  const styles = distinct(items.map((i) => i.style));
  // Light, mid and dark, each with how many finishes it holds; empty groups are not shown.
  const tones = TONE_GROUPS.map((t) => ({ ...t, count: items.filter((i) => i.toneGroup === t.id).length })).filter(
    (t) => t.count > 0,
  );
  // Only the price bands that at least one finish falls in.
  const bands = PRICE_BANDS.filter((b) => items.some((i) => priceBandOf(i.rrpPence) === b.id));
  const visible = items.filter((i) => matches(i, filters));
  const sheet = useRef<HTMLDialogElement>(null);
  // How many finishes each choice would leave, with the other filters still applied.
  const countWith = (key: keyof RangeFilters, value: string | null) =>
    items.filter((i) => matches(i, { ...filters, [key]: value } as RangeFilters)).length;
  const activeCount = [filters.style, filters.format, filters.tone, filters.price].filter(Boolean).length;
  const option = (key: keyof RangeFilters, value: string | null, label: string, sub?: string): FilterOption => ({
    value,
    label,
    sub,
    count: countWith(key, value),
  });
  const rows: FilterRowDef[] = [
    {
      key: "style",
      label: "Look",
      value: filters.style,
      onChange: (v) => update({ style: v }),
      options: [option("style", null, "All"), ...styles.map((s) => option("style", s, STYLE_LABELS[s as keyof typeof STYLE_LABELS] ?? s))],
    },
    {
      key: "format",
      label: "Board size",
      value: filters.format,
      onChange: (v) => update({ format: v }),
      options: [option("format", null, "All"), ...formats.map((f) => option("format", f.format, f.label, f.size))],
    },
    {
      key: "tone",
      label: "Tone",
      value: filters.tone,
      onChange: (v) => update({ tone: v as RangeFilters["tone"] }),
      options: [option("tone", null, "All"), ...tones.map((t) => option("tone", t.id, t.label))],
    },
    {
      key: "price",
      label: "Price per m²",
      value: filters.price,
      onChange: (v) => update({ price: v as RangeFilters["price"] }),
      options: [option("price", null, "All"), ...bands.map((b) => option("price", b.id, b.label))],
    },
  ];
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
      {/* Phones and tablets: every filter lives in one sheet, opened from this bar. */}
      <div className="sticky top-header z-30 -mx-[var(--spacing-gutter)] flex items-center justify-between gap-4 border-y border-line bg-off-white/95 px-[var(--spacing-gutter)] py-3 backdrop-blur-sm lg:hidden">
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => sheet.current?.showModal()}
          className="min-h-tap rounded-control border border-navy/20 bg-white px-4 text-[0.9375rem] text-navy"
        >
          Filters
          {activeCount > 0 && <span className="data ml-2 text-[0.8125rem] text-ink-muted">{activeCount}</span>}
        </button>
        <span className="text-[0.9375rem] text-ink-muted">
          {visible.length} {visible.length === 1 ? "finish" : "finishes"}
        </span>
      </div>

      {/* Desktop: every filter in view, above the grid, with the grid size beside it. */}
      <div className="hidden gap-8 lg:flex lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <FilterRows rows={rows} />
        </div>
        <div role="group" aria-label="Grid size" className="flex shrink-0 items-center gap-1 pt-6">
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

      <dialog
        ref={sheet}
        aria-labelledby="filter-title"
        className="filter-sheet"
        onClick={(e) => {
          // A tap on the backdrop closes the sheet; a tap inside it does not.
          if (e.target === e.currentTarget) sheet.current?.close();
        }}
      >
        <div className="px-[var(--spacing-gutter)] pb-8 pt-5">
          <div className="flex items-center justify-between">
            <h2 id="filter-title" className="font-display text-[1.5rem] font-normal text-navy">
              Filters
            </h2>
            <button type="button" onClick={() => sheet.current?.close()} className="flex size-tap items-center justify-center text-navy">
              <Close size={20} />
              <span className="sr-only">Close filters</span>
            </button>
          </div>
          <div className="mt-6">
            <FilterRows rows={rows} />
          </div>
          <div className="mt-8 flex items-center justify-between gap-4">
            {active ? (
              <button type="button" onClick={() => update(NO_FILTERS)} className="min-h-tap text-[0.9375rem] text-navy underline underline-offset-4">
                Clear all
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => sheet.current?.close()}
              className="min-h-tap rounded-control bg-green-ink px-6 text-[0.9375rem] font-medium text-white transition-colors duration-300 hover:bg-navy"
            >
              Show {visible.length} {visible.length === 1 ? "finish" : "finishes"}
            </button>
          </div>
        </div>
      </dialog>

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
          <h2 className="text-display-sm text-navy">No Finishes Match Those Filters.</h2>
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
