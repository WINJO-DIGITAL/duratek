"use client";

import { useActionState } from "react";
import { savePrices, type SavePricesState } from "@/app/admin/prices/actions";
import { Button } from "@/components/ui/button";
import { penceToInput } from "@/lib/money";

export interface PriceRow {
  id: string;
  name: string;
  rrp: number | null;
  tier: Record<string, number | undefined>;
}

function PriceInput({ name, label, value }: { name: string; label: string; value: string }) {
  return (
    <div className="relative">
      <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">£</span>
      <input
        name={name}
        defaultValue={value}
        aria-label={label}
        inputMode="decimal"
        autoComplete="off"
        placeholder="not set"
        className="data min-h-tap w-28 rounded-control border border-navy/25 bg-white py-2 pl-7 pr-2 text-right text-[0.9375rem] text-navy placeholder:text-ink-muted/70 focus:border-navy"
      />
    </div>
  );
}

export function PricesForm({ rows, tiers }: { rows: PriceRow[]; tiers: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(savePrices, { status: "idle" } as SavePricesState);
  return (
    <form action={action}>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left">
          <caption className="sr-only">Prices per square metre, in pounds</caption>
          <thead>
            <tr className="border-b border-line text-[0.8125rem] text-ink-muted">
              <th scope="col" className="px-5 py-3 font-medium">Finish</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">RRP (public)</th>
              {tiers.map((t) => (
                <th key={t.id} scope="col" className="px-3 py-3 text-right font-medium">
                  {t.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-b-0">
                <th scope="row" className="px-5 py-2 text-[0.9375rem] font-normal text-navy">{r.name}</th>
                <td className="px-3 py-2">
                  <div className="flex justify-end">
                    <PriceInput name={`rrp:${r.id}`} label={`RRP for ${r.name}`} value={penceToInput(r.rrp)} />
                  </div>
                </td>
                {tiers.map((t) => (
                  <td key={t.id} className="px-3 py-2">
                    <div className="flex justify-end">
                      <PriceInput name={`price:${r.id}:${t.id}`} label={`${t.name} price for ${r.name}`} value={penceToInput(r.tier[t.id])} />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save prices"}
        </Button>
        <p aria-live="polite" className="text-[0.9375rem] text-navy">
          {state.status === "saved" && "Saved. Public pages show the new RRPs within a few seconds."}
          {state.status === "error" && <span className="text-error">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}
