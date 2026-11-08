import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { Calculator } from "@/components/trade/calculator";
import { TradeShell, TradeSkeleton } from "@/components/trade/trade-shell";
import { byTone, getFinishes } from "@/lib/catalogue";
import { requireApprovedTrade } from "@/lib/auth/trade";
import { getPreferences } from "@/lib/trade/preferences";
import { getTradePrices } from "@/lib/trade/prices";

export const metadata: Metadata = { title: "Flooring and profit calculator", robots: { index: false } };

export default function CalculatorPage() {
  return (
    <PageTransition>
      <Suspense fallback={<TradeSkeleton />}>
        <Content />
      </Suspense>
    </PageTransition>
  );
}

async function Content() {
  const { account, customerView } = await requireApprovedTrade("/trade/account/calculator");
  const showTrade = !customerView;
  const [finishes, prices, prefs] = await Promise.all([
    getFinishes().then(byTone),
    showTrade ? getTradePrices(account) : Promise.resolve(new Map()),
    getPreferences(),
  ]);

  // Trade prices go to the browser only for this trader and only outside Customer view.
  const options = finishes
    .filter((f) => f.specs.pack_coverage_m2)
    .map((f) => ({
      id: f.id,
      name: f.name,
      coverageM2: f.specs.pack_coverage_m2!,
      rrpPence: f.rrpPence,
      ...(showTrade && prices.get(f.id) ? { tradePence: prices.get(f.id)!.pence } : {}),
    }));

  return (
    <TradeShell
      account={account}
      customerView={customerView}
      current="/trade/account/calculator"
      back="/trade/account/calculator"
      title="Calculator"
      intro={<p>Packs from room sizes, always rounded up{showTrade ? ", and what the job makes you at your price" : ""}.</p>}
    >
      <Calculator
        finishes={options}
        showTrade={showTrade}
        defaultMarkupBp={prefs.default_markup_bp}
        defaultWastagePct={prefs.default_wastage_pct}
        vatRegistered={prefs.vat_registered}
      />
    </TradeShell>
  );
}
