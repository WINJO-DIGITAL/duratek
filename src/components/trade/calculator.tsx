"use client";

import { useId, useMemo, useState } from "react";
import { formatPence, inputToPence } from "@/lib/money";
import {
  formatBp,
  packsPrice,
  percentToBp,
  planPacks,
  sellFromMargin,
  sellFromMarkup,
  totalArea,
  unitProfit,
  vatOn,
  WASTAGE_OPTIONS,
  type Room,
} from "@/lib/pricing";

export interface CalcFinish {
  id: string;
  name: string;
  coverageM2: number;
  rrpPence?: number;
  /** Present only for an approved trader outside Customer view. */
  tradePence?: number;
}

const inputClass =
  "data mt-2 min-h-14 w-full rounded-control border border-navy/25 bg-white px-4 text-base text-navy transition-colors focus:border-navy";
const labelClass = "text-[0.9375rem] font-medium text-navy";

const num = (s: string) => {
  const n = Number(s.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : Number.NaN;
};

interface Extra {
  kind: "underlay" | "trim" | "adhesive" | "accessory";
  desc: string;
  qty: string;
  cost: string;
  price: string;
}

const EXTRA_KINDS = [
  { value: "underlay", label: "Underlay" },
  { value: "trim", label: "Trim" },
  { value: "adhesive", label: "Adhesive" },
  { value: "accessory", label: "Accessory" },
] as const;

export function Calculator({
  finishes,
  showTrade,
  defaultMarkupBp,
  defaultWastagePct,
  vatRegistered,
}: {
  finishes: CalcFinish[];
  showTrade: boolean;
  defaultMarkupBp: number;
  defaultWastagePct: number;
  vatRegistered: boolean;
}) {
  const uid = useId();
  const [finishId, setFinishId] = useState(finishes[0]?.id ?? "");
  const [rooms, setRooms] = useState<{ length: string; width: string }[]>([{ length: "", width: "" }]);
  const [wastage, setWastage] = useState(String(defaultWastagePct));
  const [mode, setMode] = useState<"markup" | "margin">("markup");
  const [rate, setRate] = useState(String(defaultMarkupBp / 100));
  const [costOverride, setCostOverride] = useState("");
  const [extras, setExtras] = useState<Extra[]>([]);
  const extraTotals = extras.reduce(
    (t, x) => {
      const q = num(x.qty);
      const c = inputToPence(x.cost);
      const p = inputToPence(x.price);
      if (!(q > 0)) return t;
      return {
        cost: t.cost + (typeof c === "number" ? Math.round(q * c) : 0),
        price: t.price + (typeof p === "number" ? Math.round(q * p) : 0),
      };
    },
    { cost: 0, price: 0 },
  );

  const finish = finishes.find((f) => f.id === finishId);
  const parsedRooms: Room[] = rooms.map((r) => ({ lengthM: num(r.length), widthM: num(r.width) }));
  const area = totalArea(parsedRooms);
  const plan = finish ? planPacks(area, num(wastage), finish.coverageM2) : null;

  const trade = useMemo(() => {
    if (!showTrade || !finish || !plan) return null;
    const typed = costOverride.trim() ? inputToPence(costOverride) : undefined;
    const costPerM2 = typed ?? finish.tradePence;
    if (costPerM2 == null) return null;
    const bp = percentToBp(rate, { min: 0, max: mode === "margin" ? 99.99 : 1000 });
    if (bp == null) return { costPerM2, error: mode === "margin" ? "Margin is 0 to 99.99%." : "Markup is 0 to 1000%." } as const;
    const sellPerM2 = mode === "markup" ? sellFromMarkup(costPerM2, bp) : sellFromMargin(costPerM2, bp);
    if (sellPerM2 == null) return { costPerM2, error: "Margin must be under 100%." } as const;
    const flooringCost = packsPrice(plan.packs, finish.coverageM2, costPerM2);
    const flooringSell = packsPrice(plan.packs, finish.coverageM2, sellPerM2);
    const cost = flooringCost + extraTotals.cost;
    const sell = flooringSell + extraTotals.price;
    const profit = unitProfit(cost, sell);
    return {
      costPerM2,
      sellPerM2,
      flooringCost,
      flooringSell,
      cost,
      sell,
      profit: profit.grossProfitPence,
      margin: profit.grossMarginBp,
      markup: profit.markupBp,
      vat: vatRegistered ? vatOn(sell, 2000) : 0,
    } as const;
  }, [showTrade, finish, plan, costOverride, rate, mode, vatRegistered, extraTotals.cost, extraTotals.price]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start">
      <div className="card space-y-8 p-5 sm:p-8">
        <div>
          <label htmlFor={`${uid}-finish`} className={labelClass}>Finish</label>
          <select id={`${uid}-finish`} value={finishId} onChange={(e) => setFinishId(e.target.value)} className={inputClass.replace("data ", "")}>
            {finishes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} · {f.coverageM2} m² per pack
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className={labelClass}>Rooms, in metres</legend>
          <ul className="mt-2 space-y-3">
            {rooms.map((r, i) => (
              <li key={i} className="flex items-end gap-3">
                <div className="flex-1">
                  <label htmlFor={`${uid}-l${i}`} className="text-[0.8125rem] text-ink-muted">Length</label>
                  <input id={`${uid}-l${i}`} inputMode="decimal" value={r.length} onChange={(e) => setRooms(rooms.map((x, j) => (j === i ? { ...x, length: e.target.value } : x)))} className={inputClass} />
                </div>
                <span aria-hidden="true" className="pb-4 text-ink-muted">×</span>
                <div className="flex-1">
                  <label htmlFor={`${uid}-w${i}`} className="text-[0.8125rem] text-ink-muted">Width</label>
                  <input id={`${uid}-w${i}`} inputMode="decimal" value={r.width} onChange={(e) => setRooms(rooms.map((x, j) => (j === i ? { ...x, width: e.target.value } : x)))} className={inputClass} />
                </div>
                {rooms.length > 1 && (
                  <button type="button" onClick={() => setRooms(rooms.filter((_, j) => j !== i))} className="min-h-14 px-2 text-[0.875rem] text-ink-muted underline underline-offset-4 hover:text-error">
                    Remove<span className="sr-only"> room {i + 1}</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setRooms([...rooms, { length: "", width: "" }])} className="mt-3 min-h-tap text-[0.9375rem] text-navy underline decoration-green underline-offset-4">
            Add another room
          </button>
        </fieldset>

        <div>
          <label htmlFor={`${uid}-wastage`} className={labelClass}>Wastage allowance</label>
          <select id={`${uid}-wastage`} value={wastage} onChange={(e) => setWastage(e.target.value)} className={inputClass.replace("data ", "")}>
            {[...new Set([...WASTAGE_OPTIONS, defaultWastagePct])].sort((a, b) => a - b).map((w) => (
              <option key={w} value={String(w)}>{w}%{w === 10 ? " (most rooms)" : w >= 15 ? " (lots of cuts, angles)" : ""}</option>
            ))}
          </select>
        </div>

        <fieldset className="border-t border-line pt-8">
          <legend className={labelClass}>Underlay, trims, adhesives and accessories</legend>
          <p className="mt-1 text-[0.8125rem] text-ink-muted">Duratek has underlay built in; add extra underlay only if the job needs it. Prices are each, before VAT.</p>
          {extras.length > 0 && (
            <ul className="mt-3 space-y-3">
              {extras.map((x, i) => {
                const set = (patch: Partial<Extra>) => setExtras(extras.map((y, j) => (j === i ? { ...y, ...patch } : y)));
                return (
                  <li key={i} className="grid grid-cols-2 gap-2 rounded-control border border-line p-3 sm:grid-cols-[8rem_1fr_5rem_6rem_6rem_auto] sm:items-end">
                    <div>
                      <label htmlFor={`${uid}-xk${i}`} className="text-[0.75rem] text-ink-muted">Type</label>
                      <select id={`${uid}-xk${i}`} value={x.kind} onChange={(e) => set({ kind: e.target.value as Extra["kind"] })} className="mt-1 min-h-tap w-full rounded-control border border-navy/25 bg-white px-2 text-[0.9375rem] text-navy">
                        {EXTRA_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label htmlFor={`${uid}-xd${i}`} className="text-[0.75rem] text-ink-muted">Description</label>
                      <input id={`${uid}-xd${i}`} value={x.desc} onChange={(e) => set({ desc: e.target.value })} placeholder="Door bar" className="mt-1 min-h-tap w-full rounded-control border border-navy/25 bg-white px-2 text-[0.9375rem] text-navy" />
                    </div>
                    <div>
                      <label htmlFor={`${uid}-xq${i}`} className="text-[0.75rem] text-ink-muted">Quantity</label>
                      <input id={`${uid}-xq${i}`} inputMode="decimal" value={x.qty} onChange={(e) => set({ qty: e.target.value })} className="data mt-1 min-h-tap w-full rounded-control border border-navy/25 bg-white px-2 text-[0.9375rem] text-navy" />
                    </div>
                    {showTrade && (
                      <div>
                        <label htmlFor={`${uid}-xc${i}`} className="text-[0.75rem] text-ink-muted">Your cost</label>
                        <input id={`${uid}-xc${i}`} inputMode="decimal" value={x.cost} onChange={(e) => set({ cost: e.target.value })} placeholder="£" className="data mt-1 min-h-tap w-full rounded-control border border-navy/25 bg-white px-2 text-[0.9375rem] text-navy" />
                      </div>
                    )}
                    <div>
                      <label htmlFor={`${uid}-xp${i}`} className="text-[0.75rem] text-ink-muted">Price</label>
                      <input id={`${uid}-xp${i}`} inputMode="decimal" value={x.price} onChange={(e) => set({ price: e.target.value })} placeholder="£" className="data mt-1 min-h-tap w-full rounded-control border border-navy/25 bg-white px-2 text-[0.9375rem] text-navy" />
                    </div>
                    <button type="button" onClick={() => setExtras(extras.filter((_, j) => j !== i))} className="min-h-tap text-[0.875rem] text-ink-muted underline underline-offset-4 hover:text-error">
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <button type="button" onClick={() => setExtras([...extras, { kind: "trim", desc: "", qty: "1", cost: "", price: "" }])} className="mt-3 min-h-tap text-[0.9375rem] text-navy underline decoration-green underline-offset-4">
            Add underlay, a trim, adhesive or an accessory
          </button>
        </fieldset>

        {showTrade && (
          <fieldset className="border-t border-line pt-8">
            <legend className="sr-only">Pricing</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor={`${uid}-cost`} className={labelClass}>Your cost per m²</label>
                <input
                  id={`${uid}-cost`}
                  inputMode="decimal"
                  value={costOverride}
                  placeholder={finish?.tradePence !== undefined ? (finish.tradePence / 100).toFixed(2) : "Enter your cost"}
                  onChange={(e) => setCostOverride(e.target.value)}
                  className={inputClass}
                />
                <p className="mt-1 text-[0.8125rem] text-ink-muted">{finish?.tradePence !== undefined ? "Blank uses your trade price." : "No trade price set yet."}</p>
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor={`${uid}-rate`} className={labelClass}>{mode === "markup" ? "Markup" : "Target margin"} %</label>
                  <button type="button" onClick={() => setMode(mode === "markup" ? "margin" : "markup")} className="text-[0.8125rem] text-navy underline underline-offset-4">
                    Use {mode === "markup" ? "margin" : "markup"}
                  </button>
                </div>
                <input id={`${uid}-rate`} inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} className={inputClass} />
              </div>
            </div>
          </fieldset>
        )}
      </div>

      <aside aria-live="polite" className="card p-5 sm:p-6 lg:sticky lg:top-[calc(var(--spacing-header)+2rem)]">
        <h2 className="text-display-sm text-navy">You need</h2>
        {plan && finish ? (
          <>
            <p className="mt-4 font-display text-[2.5rem] font-light leading-none text-navy">
              {plan.packs} <span className="text-[1.25rem]">{plan.packs === 1 ? "pack" : "packs"}</span>
            </p>
            <dl className="mt-6">
              <Out label="Floor area" value={`${plan.areaM2} m²`} />
              <Out label={`With ${plan.wastagePct}% wastage`} value={`${plan.areaWithWastageM2} m²`} />
              <Out label="Packs cover" value={`${plan.suppliedM2} m²`} />
              {finish.rrpPence !== undefined && <Out label="At RRP" value={formatPence(packsPrice(plan.packs, finish.coverageM2, finish.rrpPence))} />}
            </dl>
            {trade && "error" in trade && <p className="mt-4 text-[0.875rem] text-error">{trade.error}</p>}
            {trade && !("error" in trade) && (
              <dl className="mt-6 rounded-control border border-line bg-white/60 px-4 py-2">
                <Out label="Flooring, your cost" value={formatPence(trade.flooringCost)} />
                {extraTotals.cost > 0 && <Out label="Extras, your cost" value={formatPence(extraTotals.cost)} />}
                <Out label="Material cost" value={formatPence(trade.cost)} strong />
                <Out label={`Flooring sell (${formatPence(trade.sellPerM2)}/m²)`} value={formatPence(trade.flooringSell)} />
                {extraTotals.price > 0 && <Out label="Extras sell" value={formatPence(extraTotals.price)} />}
                <Out label="Selling price, ex VAT" value={formatPence(trade.sell)} strong />
                {trade.vat > 0 && <Out label="Customer pays, inc VAT" value={formatPence(trade.sell + trade.vat)} />}
                <Out label="Gross profit" value={formatPence(trade.profit)} strong />
                <Out label="Gross margin (profit ÷ sell)" value={formatBp(trade.margin)} />
                <Out label="Markup (profit ÷ cost)" value={formatBp(trade.markup)} />
              </dl>
            )}
            {!showTrade && extraTotals.price > 0 && (
              <dl className="mt-4">
                <Out label="Underlay, trims and accessories" value={formatPence(extraTotals.price)} />
              </dl>
            )}
            <div className="mt-5 border-t border-line pt-4">
              <h3 className="text-[0.875rem] font-medium text-navy">How this is worked out</h3>
              <ul className="mt-2 space-y-1 text-[0.8125rem] text-ink-muted">
                <li>Area is length × width for each room, added up and rounded to 0.01 m².</li>
                <li>{plan.wastagePct}% is added for cuts and spares.</li>
                <li>{finish.name} comes in packs of {finish.coverageM2} m²; packs are always rounded up, never down.</li>
                <li>Prices are per pack (the per-m² price × pack coverage, to the penny), before VAT{vatRegistered ? "; VAT at 20%" : ""}.</li>
                {showTrade && <li>Gross profit is before your labour, overheads and tax. Quotes re-price packs on the server, including any volume price.</li>}
              </ul>
            </div>
          </>
        ) : (
          <p className="mt-4 text-[0.9375rem] text-ink-muted">Enter a room’s length and width to see how many packs you need.</p>
        )}
      </aside>
    </div>
  );
}

function Out({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-b-0">
      <dt className="text-[0.9375rem] text-ink-muted">{label}</dt>
      <dd className={strong ? "data font-medium text-navy" : "data text-navy"}>{value}</dd>
    </div>
  );
}
