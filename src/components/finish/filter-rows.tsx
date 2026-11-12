import { cn } from "@/lib/cn";

export interface FilterOption {
  value: string | null;
  label: string;
  /** Measurement shown after the label, in the data face (e.g. a board size). */
  sub?: string;
  count: number;
}

export interface FilterRowDef {
  key: string;
  label: string;
  options: FilterOption[];
  value: string | null;
  onChange: (value: string | null) => void;
}

/**
 * One question, one row: a label, then a segmented control of its choices.
 * Each choice shows how many finishes it would leave, so nothing leads to an
 * empty grid. The selected choice is filled navy; the rest sit in one frame.
 */
export function FilterRow({ row }: { row: FilterRowDef }) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-[0.8125rem] font-medium uppercase tracking-[0.12em] text-ink-muted">{row.label}</legend>
      <div role="group" aria-label={row.label} className="mt-2.5 flex flex-wrap rounded-control border border-navy/20 bg-white p-1">
        {row.options.map((o) => {
          const selected = row.value === o.value;
          return (
            <button
              key={o.value ?? "all"}
              type="button"
              aria-pressed={selected}
              onClick={() => row.onChange(o.value)}
              className={cn(
                "flex min-h-tap min-w-0 flex-1 flex-col items-center justify-center rounded-[7px] px-3 py-1.5 text-center text-[0.9375rem] leading-snug transition-colors duration-300",
                selected ? "bg-navy text-off-white" : "text-navy hover:bg-navy/5",
              )}
            >
              <span className="flex items-baseline gap-1.5">
                {o.label}
                <span className={cn("data text-[0.75rem]", selected ? "opacity-80" : "text-ink-muted")}>{o.count}</span>
              </span>
              {o.sub && <span className={cn("data text-[0.6875rem]", selected ? "opacity-80" : "text-ink-muted")}>{o.sub}</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function FilterRows({ rows }: { rows: FilterRowDef[] }) {
  return (
    <div className="grid gap-6">
      {rows.filter((r) => r.options.length > 1).map((r) => (
        <FilterRow key={r.key} row={r} />
      ))}
    </div>
  );
}
