"use client";

import { useId, useState } from "react";
import { formatPence, inputToPence, penceToInput } from "@/lib/money";
import { formatBp, perPackPence, sellFromMarkup, unitProfit, vatOn } from "@/lib/pricing";

/**
 * Profit on one finish, per m² and per pack, with a selling price the trader
 * can change. Gross figures only: overheads, tax and wastage aren't deducted.
 * The buying price arrives from the server, and only in trade mode.
 */
export function ProfitPanel({
  buyNetPerM2,
  rrpGrossPerM2,
  coverageM2,
  defaultMarkupBp,
  vatRateBp = 2000,
}: {
  buyNetPerM2: number;
  rrpGrossPerM2?: number;
  coverageM2?: number;
  defaultMarkupBp: number;
  vatRateBp?: number;
}) {
  const id = useId();
  const suggested = sellFromMarkup(buyNetPerM2, defaultMarkupBp);
  const [sell, setSell] = useState(penceToInput(suggested));
  const sellNet = inputToPence(sell);
  const valid = typeof sellNet === "number" && sellNet > 0;
  const p = valid ? unitProfit(buyNetPerM2, sellNet) : null;
  const rrpNet = rrpGrossPerM2 !== undefined ? Math.round((rrpGrossPerM2 * 10000) / (10000 + vatRateBp)) : undefined;

  return (
    <div className="card p-5 sm:p-6">
      <h2 className="text-[1.125rem] text-navy">Your Profit on This Finish</h2>
      <dl className="mt-4">
        {rrpGrossPerM2 !== undefined && (
          <Row label="RRP per m²" value={`${formatPence(rrpGrossPerM2)} inc VAT`} sub={rrpNet !== undefined ? `${formatPence(rrpNet)} ex VAT` : undefined} />
        )}
        <Row label="Your buying price per m²" value={`${formatPence(buyNetPerM2)} ex VAT`} />
      </dl>
      <div className="mt-4">
        <label htmlFor={`${id}-sell`} className="text-[0.9375rem] font-medium text-navy">Your selling price per m², ex VAT</label>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="relative">
            <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">£</span>
            <input
              id={`${id}-sell`}
              inputMode="decimal"
              value={sell}
              onChange={(e) => setSell(e.target.value)}
              aria-invalid={!valid}
              className="data min-h-14 w-36 rounded-control border border-navy/25 bg-white py-2 pl-7 pr-3 text-right text-base text-navy focus:border-navy"
            />
          </div>
          <button type="button" onClick={() => setSell(penceToInput(suggested))} className="min-h-tap text-[0.875rem] text-navy underline underline-offset-4">
            Your markup ({formatBp(defaultMarkupBp)})
          </button>
          {rrpNet !== undefined && (
            <button type="button" onClick={() => setSell(penceToInput(rrpNet))} className="min-h-tap text-[0.875rem] text-navy underline underline-offset-4">
              Sell at RRP
            </button>
          )}
        </div>
        {!valid && <p className="mt-2 text-[0.875rem] text-error">Enter a price, like 31.50.</p>}
      </div>

      {p && valid && (
        <dl aria-live="polite" className="mt-5 rounded-control border border-line bg-white/60 px-4 py-2">
          <Row label="Customer pays per m²" value={`${formatPence(sellNet + vatOn(sellNet, vatRateBp))} inc VAT`} />
          <Row label="Gross profit per m²" value={formatPence(p.grossProfitPence)} strong negative={p.grossProfitPence < 0} />
          {coverageM2 && (
            <Row
              label={`Gross profit per pack (${coverageM2} m²)`}
              value={formatPence(perPackPence(coverageM2, sellNet) - perPackPence(coverageM2, buyNetPerM2))}
              negative={p.grossProfitPence < 0}
            />
          )}
          <Row label="Gross margin" value={formatBp(p.grossMarginBp)} sub="gross profit ÷ selling price" />
          <Row label="Markup" value={formatBp(p.markupBp)} sub="gross profit ÷ buying price" />
        </dl>
      )}
      <p className="mt-3 text-[0.8125rem] text-ink-muted">
        All before VAT. Gross profit is before your overheads, wastage and tax, so it isn’t net profit. Margin and markup describe the same profit two ways: a 40% markup is a 28.6% margin.
      </p>
    </div>
  );
}

function Row({ label, value, sub, strong = false, negative = false }: { label: string; value: string; sub?: string; strong?: boolean; negative?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-b-0">
      <dt className="text-[0.9375rem] text-ink-muted">
        {label}
        {sub && <span className="block text-[0.75rem]">{sub}</span>}
      </dt>
      <dd className={`data text-right ${strong ? "font-medium" : ""} ${negative ? "text-error" : "text-navy"}`}>{value}</dd>
    </div>
  );
}
