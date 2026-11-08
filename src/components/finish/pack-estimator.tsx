"use client";

import { useId, useState } from "react";
import { formatPence } from "@/lib/money";
import { DEFAULT_WASTAGE_PCT, packsPrice, planPacks } from "@/lib/pricing";

/** "How many packs?" for a homeowner: area in, packs out (with 10% for cuts), and the RRP for them. */
export function PackEstimator({ coverageM2, rrpPence }: { coverageM2: number; rrpPence?: number }) {
  const id = useId();
  const [area, setArea] = useState("");
  const n = Number(area.replace(/,/g, "").trim());
  const plan = n > 0 && n <= 100000 ? planPacks(n, DEFAULT_WASTAGE_PCT, coverageM2) : null;
  return (
    <details className="group border-b border-line">
      <summary className="flex min-h-tap cursor-pointer list-none items-center justify-between py-3 text-[0.9375rem] text-navy [&::-webkit-details-marker]:hidden">
        How many packs do I need?
        <span aria-hidden="true" className="text-ink-muted transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none">+</span>
      </summary>
      <div className="pb-4">
        <label htmlFor={id} className="text-[0.875rem] text-ink-muted">Floor area in m² (length × width)</label>
        <div className="mt-2 flex items-center gap-3">
          <input
            id={id}
            inputMode="decimal"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="18.5"
            className="data min-h-tap w-32 rounded-control border border-navy/25 bg-white px-3 text-base text-navy focus:border-navy"
          />
          <p aria-live="polite" className="text-[0.9375rem] text-navy">
            {plan ? (
              <>
                <span className="data font-medium">{plan.packs}</span> {plan.packs === 1 ? "pack" : "packs"}
                <span className="data text-ink-muted"> · {plan.suppliedM2} m²</span>
                {rrpPence !== undefined && <span className="data text-ink-muted"> · {formatPence(packsPrice(plan.packs, coverageM2, rrpPence))} RRP</span>}
              </>
            ) : (
              <span className="text-ink-muted">{coverageM2} m² per pack</span>
            )}
          </p>
        </div>
        <p className="mt-2 text-[0.8125rem] text-ink-muted">Includes {DEFAULT_WASTAGE_PCT}% extra for cuts. Your fitter will confirm.</p>
      </div>
    </details>
  );
}
