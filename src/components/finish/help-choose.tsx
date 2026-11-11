"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { filtersToQuery, NO_FILTERS, type RangeFilters } from "@/lib/catalogue/filter";
import { cn } from "@/lib/cn";
import { colourFamilyLabel } from "@/lib/config";

/** One question: a row of choices, each a set of filter values. Only real filters, so every answer finds finishes. */
function Question({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: { label: string; value: string }[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-[0.875rem] text-ink-muted">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(value === o.value ? null : o.value)}
            className={cn(
              "min-h-tap rounded-control border px-4 text-[0.9375rem] transition-colors duration-300",
              value === o.value ? "border-navy bg-navy text-off-white" : "border-navy/20 text-navy hover:border-navy",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * "Help me choose": three questions that set the range filters and show the
 * matching finishes. Answers are the same filters the range already has, so
 * nothing here is a separate catalogue or a promise the range can't keep.
 */
export function HelpChoose({ styles, colours, formats }: { styles: string[]; colours: string[]; formats: string[] }) {
  const router = useRouter();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [pattern, setPattern] = useState<string | null>(null);
  const [tone, setTone] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);

  const patternOptions = styles.map((s) => ({ value: s, label: s === "herringbone" ? "Herringbone" : "Straight plank" }));
  const toneOptions = colours.map((c) => ({ value: c, label: colourFamilyLabel(c) }));
  const sizeOptions = formats.map((f) => ({ value: f, label: f === "extra-long" ? "Extra-long, 228 mm" : "Standard, 181 mm" }));
  const showSize = pattern === null || pattern === "plank";

  function show(): void {
    const filters: RangeFilters = {
      ...NO_FILTERS,
      style: pattern,
      colour: tone,
      format: showSize ? size : null,
    };
    const qs = filtersToQuery(filters);
    router.push(qs ? `/range?${qs}#finishes` : "/range#finishes");
    setOpen(false);
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="min-h-tap text-[0.9375rem] text-navy underline underline-offset-4 hover:text-green-ink"
      >
        {open ? "Close" : "Help me choose"}
      </button>

      {open && (
        <div id={panelId} className="mt-4 grid gap-6 rounded-card border border-line bg-cream p-5 sm:p-6">
          <Question legend="Pattern" options={patternOptions} value={pattern} onChange={setPattern} />
          <Question legend="Tone" options={toneOptions} value={tone} onChange={setTone} />
          {showSize && <Question legend="Plank size" options={sizeOptions} value={size} onChange={setSize} />}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
            <button
              type="button"
              onClick={show}
              className="min-h-tap rounded-control bg-green-ink px-5 text-[0.9375rem] font-medium text-white transition-colors duration-300 hover:bg-navy"
            >
              Show my finishes
            </button>
            <p className="text-[0.875rem] text-ink-muted">Choose as many or as few as you like.</p>
          </div>
        </div>
      )}
    </div>
  );
}
