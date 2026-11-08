import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { SettingsForm } from "@/components/trade/settings-form";
import { TradeShell, TradeSkeleton } from "@/components/trade/trade-shell";
import { requireApprovedTrade } from "@/lib/auth/trade";
import { getPreferences } from "@/lib/trade/preferences";

export const metadata: Metadata = { title: "Trade settings", robots: { index: false } };

export default function SettingsPage() {
  return (
    <PageTransition>
      <Suspense fallback={<TradeSkeleton />}>
        <Content />
      </Suspense>
    </PageTransition>
  );
}

async function Content() {
  const { account, customerView } = await requireApprovedTrade("/trade/account/settings");
  const prefs = await getPreferences();
  return (
    <TradeShell
      account={account}
      customerView={customerView}
      current="/trade/account/settings"
      back="/trade/account/settings"
      title="Settings"
      intro={<p>Your defaults for new quotes and the calculator. Only you can see these.</p>}
    >
      {customerView ? (
        <p className="notice max-w-xl px-5 py-4 text-navy">Settings are hidden in Customer view, because they show your markup.</p>
      ) : (
        <SettingsForm prefs={prefs} />
      )}
    </TradeShell>
  );
}
