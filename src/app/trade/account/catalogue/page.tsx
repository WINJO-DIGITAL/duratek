import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { TradeShell, TradeSkeleton } from "@/components/trade/trade-shell";
import { byTone, getFinishes, grainImage } from "@/lib/catalogue";
import { measureLine } from "@/lib/catalogue/format";
import { colourFamilyLabel } from "@/lib/config";
import { requireApprovedTrade } from "@/lib/auth/trade";
import { formatPence } from "@/lib/money";
import { formatBp, sellFromMarkup, unitProfit } from "@/lib/pricing";
import { compareHref } from "@/lib/saved/saved";
import { listSavedFinishIds } from "@/lib/trade/portal";
import { getPreferences } from "@/lib/trade/preferences";
import { getTradePrices } from "@/lib/trade/prices";
import { toggleSaved } from "./actions";

export const metadata: Metadata = { title: "Catalogue", robots: { index: false } };

export default function CataloguePage({ searchParams }: PageProps<"/trade/account/catalogue">) {
  return (
    <PageTransition>
      <Suspense fallback={<TradeSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/trade/account/catalogue">["searchParams"] }) {
  const { account, customerView } = await requireApprovedTrade("/trade/account/catalogue");
  const showTrade = !customerView;
  const sp = await searchParams;
  const savedOnly = sp.show === "saved" && showTrade;
  // Trade prices and saved items are read only in trade mode; in customer mode nothing of the account is fetched.
  const [finishes, prices, prefs, saved] = await Promise.all([
    getFinishes().then(byTone),
    showTrade ? getTradePrices(account) : Promise.resolve(new Map()),
    showTrade ? getPreferences() : Promise.resolve(null),
    showTrade ? listSavedFinishIds() : Promise.resolve([] as string[]),
  ]);
  const savedSet = new Set(saved);
  const shown = savedOnly ? finishes.filter((f) => savedSet.has(f.id)) : finishes;

  return (
    <TradeShell
      account={account}
      customerView={customerView}
      current="/trade/account/catalogue"
      back="/trade/account/catalogue"
      title={showTrade ? "Catalogue and your prices" : "The duratek range"}
      intro={
        showTrade ? (
          <p>Your buying price on every finish, before VAT, and what you make at your markup of {formatBp(prefs?.default_markup_bp ?? 3000)}. Open a finish to present it or work out your margin.</p>
        ) : (
          <p>Every finish, with its plank size and recommended retail price.</p>
        )
      }
    >
      {showTrade && (
        <nav aria-label="Show" className="mb-6 flex gap-2">
          {[
            ["all", `All finishes (${finishes.length})`],
            ["saved", `Saved (${saved.length})`],
          ].map(([value, label]) => (
            <Link
              key={value}
              href={value === "all" ? "/trade/account/catalogue" : "/trade/account/catalogue?show=saved"}
              aria-current={(value === "saved") === savedOnly ? "page" : undefined}
              className={`flex min-h-tap items-center rounded-control border px-4 text-[0.9375rem] ${(value === "saved") === savedOnly ? "border-green-ink text-green-ink" : "border-navy/20 text-navy"}`}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
      {shown.length === 0 ? (
        <p className="text-ink-muted">Nothing saved yet. Tap Save on a finish to keep it here.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((f) => {
            const img = grainImage(f);
            const buy = prices.get(f.id)?.pence as number | undefined;
            const sell = buy !== undefined && prefs ? sellFromMarkup(buy, prefs.default_markup_bp) : undefined;
            const profit = buy !== undefined && sell !== undefined ? unitProfit(buy, sell) : null;
            const isSaved = savedSet.has(f.id);
            return (
              <li key={f.id} className="card flex flex-col overflow-hidden">
                <Link href={`/trade/present/${f.slug}`} className="group block">
                  <div className="relative aspect-[16/10] bg-line">
                    {img && <Image src={img.src} alt={img.alt} fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw" quality={70} className="object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none" />}
                  </div>
                  <div className="px-4 pt-4">
                    <h2 className="font-display text-[1.25rem] text-navy">{f.name}</h2>
                    <p className="data mt-1 text-[0.8125rem] text-ink-muted">
                      {colourFamilyLabel(f.colourFamily)} · {measureLine(f.specs)}
                    </p>
                  </div>
                </Link>
                <dl className="mt-3 flex-1 px-4 text-[0.9375rem]">
                  {f.rrpPence !== undefined && <Price label="RRP, inc VAT" value={formatPence(f.rrpPence)} />}
                  {showTrade && (
                    <>
                      <Price label="Your price, ex VAT" value={buy !== undefined ? formatPence(buy) : "Not set"} strong />
                      {profit && sell !== undefined && <Price label={`Sell ${formatPence(sell)}: gross margin`} value={formatBp(profit.grossMarginBp)} />}
                    </>
                  )}
                  <p className="pb-1 text-[0.75rem] text-ink-muted">per m²</p>
                </dl>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-2">
                  <Link href={`/trade/present/${f.slug}`} className="min-h-tap py-3 text-[0.9375rem] font-medium text-navy underline decoration-green underline-offset-4">
                    Present
                  </Link>
                  <Link href={compareHref([f.slug])} className="min-h-tap py-3 text-[0.9375rem] text-navy underline underline-offset-4">
                    Compare
                  </Link>
                  {showTrade && (
                    <form action={toggleSaved} className="ml-auto">
                      <input type="hidden" name="finish_id" value={f.id} />
                      <input type="hidden" name="saved" value={isSaved ? "1" : "0"} />
                      <button type="submit" aria-pressed={isSaved} className={`min-h-tap px-1 text-[0.9375rem] ${isSaved ? "font-medium text-green-ink" : "text-ink-muted"} underline underline-offset-4`}>
                        {isSaved ? "Saved" : "Save"}
                        <span className="sr-only"> {f.name}</span>
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </TradeShell>
  );
}

function Price({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-1.5">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={strong ? "data font-medium text-navy" : "data text-navy"}>{value}</dd>
    </div>
  );
}
