"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { PRICE_DOMAIN, type PriceRange } from "@/lib/catalogue/filter";

const { min: LO, max: HI } = PRICE_DOMAIN;

const percent = (v: number) => ((v - LO) / (HI - LO)) * 100;

/**
 * A price filter in pounds per m²: a two-handle slider to drag, and two fields
 * to type into. A typed value is applied when the field is left or Enter is
 * pressed, so "2" on the way to "25" never snaps to the domain's edge.
 * Unset ends mean "no limit" on that side.
 */
export function PriceRangeFilter({
  min,
  max,
  count,
  onChange,
}: {
  min: number | null;
  max: number | null;
  /** How many finishes fall in the range as it stands, with the other filters applied. */
  count: number;
  onChange: (range: PriceRange) => void;
}) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const low = min ?? LO;
  const high = max ?? HI;

  function apply(nextLow: number, nextHigh: number) {
    if (nextLow > nextHigh) {
      setError("From must be lower than To.");
      return false;
    }
    setError(null);
    onChange({
      min: nextLow <= LO ? null : nextLow,
      max: nextHigh >= HI ? null : nextHigh,
    });
    return true;
  }

  function commitField(which: "from" | "to", raw: string, input: HTMLInputElement) {
    const n = Number(raw.replace(/[£\s]/g, ""));
    const current = which === "from" ? low : high;
    if (raw.trim() === "" || !Number.isFinite(n)) {
      input.value = String(current);
      setError("Enter a price in pounds.");
      return;
    }
    const clamped = Math.min(HI, Math.max(LO, Math.round(n)));
    input.value = String(clamped);
    const ok = which === "from" ? apply(clamped, high) : apply(low, clamped);
    if (!ok) input.value = String(current);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") e.currentTarget.blur();
  }

  const summary =
    min === null && max === null
      ? "Any price"
      : min === null
        ? `Up to £${high}`
        : max === null
          ? `£${low} and above`
          : `£${low} to £${high}`;

  return (
    <fieldset className="min-w-0">
      <legend className="text-[0.8125rem] font-medium uppercase tracking-[0.12em] text-ink-muted">Price per m²</legend>

      <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="data text-[1rem] text-navy" aria-live="polite">
          {summary}
        </p>
        <p className="text-[0.875rem] text-ink-muted">
          {count} {count === 1 ? "finish" : "finishes"}
        </p>
      </div>

      <div className="price-range mt-3">
        <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line" />
        <div
          aria-hidden="true"
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-green-ink"
          style={{ left: `${percent(low)}%`, right: `${100 - percent(high)}%` }}
        />
        <input
          id={`${id}-low`}
          type="range"
          aria-label="Lowest price per m²"
          min={LO}
          max={HI}
          step={1}
          value={low}
          onChange={(e) => apply(Math.min(Number(e.target.value), high), high)}
        />
        <input
          id={`${id}-high`}
          type="range"
          aria-label="Highest price per m²"
          min={LO}
          max={HI}
          step={1}
          value={high}
          onChange={(e) => apply(low, Math.max(Number(e.target.value), low))}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label htmlFor={`${id}-from`} className="block">
          <span className="text-[0.8125rem] text-ink-muted">From</span>
          <span className="mt-1 flex min-h-tap items-center rounded-control border border-navy/20 bg-white px-3 focus-within:border-navy">
            <span className="text-navy">£</span>
            <input
              key={`from-${low}`}
              id={`${id}-from`}
              type="text"
              inputMode="numeric"
              defaultValue={low}
              onBlur={(e) => commitField("from", e.currentTarget.value, e.currentTarget)}
              onKeyDown={onKey}
              className="data w-full min-w-0 bg-transparent px-2 text-[1rem] text-navy outline-none"
            />
          </span>
        </label>
        <label htmlFor={`${id}-to`} className="block">
          <span className="text-[0.8125rem] text-ink-muted">To</span>
          <span className="mt-1 flex min-h-tap items-center rounded-control border border-navy/20 bg-white px-3 focus-within:border-navy">
            <span className="text-navy">£</span>
            <input
              key={`to-${high}`}
              id={`${id}-to`}
              type="text"
              inputMode="numeric"
              defaultValue={high}
              onBlur={(e) => commitField("to", e.currentTarget.value, e.currentTarget)}
              onKeyDown={onKey}
              className="data w-full min-w-0 bg-transparent px-2 text-[1rem] text-navy outline-none"
            />
          </span>
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[0.875rem] text-navy">
          {error}
        </p>
      )}
    </fieldset>
  );
}
