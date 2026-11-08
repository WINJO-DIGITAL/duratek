"use client";

import { useActionState } from "react";
import { saveBasePrices, type SavePricesState } from "@/app/admin/prices/actions";
import { Button } from "@/components/ui/button";
import { penceToInput } from "@/lib/money";

export interface BaseColumn {
  listId: string;
  label: string;
  vat: "inc VAT" | "ex VAT";
}

export interface BaseRow {
  variantId: string;
  name: string;
  sku: string;
  /** Current base price (pence per m²) by list id. */
  prices: Record<string, number | undefined>;
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

/** Base prices per m² for every finish: the RRP, standard trade and each tier. */
export function PricesForm({ rows, columns }: { rows: BaseRow[]; columns: BaseColumn[] }) {
  const [state, action, pending] = useActionState(saveBasePrices, { status: "idle" } as SavePricesState);
  return (
    <form action={action}>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left">
          <caption className="sr-only">Base prices per square metre, in pounds</caption>
          <thead>
            <tr className="border-b border-line text-[0.8125rem] text-ink-muted">
              <th scope="col" className="px-5 py-3 font-medium">Finish</th>
              {columns.map((c) => (
                <th key={c.listId} scope="col" className="px-3 py-3 text-right font-medium">
                  {c.label}
                  <span className="block font-normal">{c.vat}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.variantId} className="border-b border-line last:border-b-0">
                <th scope="row" className="px-5 py-2 text-[0.9375rem] font-normal text-navy">
                  {r.name}
                  <span className="data block text-[0.75rem] text-ink-muted">{r.sku}</span>
                </th>
                {columns.map((c) => (
                  <td key={c.listId} className="px-3 py-2">
                    <div className="flex justify-end">
                      <PriceInput name={`base:${c.listId}:${r.variantId}`} label={`${c.label} for ${r.name}`} value={penceToInput(r.prices[c.listId])} />
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
          {state.status === "saved" && (state.count === 0 ? "Nothing changed." : `Saved ${state.count} ${state.count === 1 ? "change" : "changes"}. Public pages update within a few seconds.`)}
          {state.status === "error" && <span className="text-error">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}
