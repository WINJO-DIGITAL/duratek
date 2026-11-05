import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { PricesForm, type PriceRow } from "@/components/admin/prices-form";
import { PageTransition } from "@/components/layout/page-transition";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/admin";
import { userSupabase } from "@/lib/supabase/server";
import { addTier } from "./actions";

export const metadata: Metadata = { title: "Prices", robots: { index: false } };

export default function AdminPricesPage({ searchParams }: PageProps<"/admin/prices">) {
  return (
    <PageTransition>
      <Suspense fallback={<div aria-busy="true" className="container-page h-96 animate-pulse py-16" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}

const TIER_NOTICE: Record<string, string> = {
  added: "Price tier added. Set its prices below.",
  exists: "That tier name is already in use.",
  empty: "Give the tier a name.",
};

async function Content({ searchParams }: { searchParams: PageProps<"/admin/prices">["searchParams"] }) {
  await requireAdmin("/admin/prices");
  const tierNotice = TIER_NOTICE[String((await searchParams).tier ?? "")];
  const db = await userSupabase();
  const [finishes, tiers, prices] = await Promise.all([
    db.from("finishes").select("id, name, rrp_per_m2_pence").order("sort_order").order("name"),
    db.from("price_tiers").select("id, name").order("name"),
    db.from("prices").select("finish_id, tier_id, price_per_m2_pence"),
  ]);
  const rows: PriceRow[] = (finishes.data ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    rrp: f.rrp_per_m2_pence,
    tier: Object.fromEntries((prices.data ?? []).filter((p) => p.finish_id === f.id).map((p) => [p.tier_id, p.price_per_m2_pence])),
  }));

  return (
    <AdminShell
      current="/admin/prices"
      title="Prices"
      intro="The RRP is public and shows to every visitor. Each trade tier’s price shows only to approved accounts on that tier. All prices are per m², in pounds. Leave a field blank to show no price."
    >
      <PricesForm rows={rows} tiers={tiers.data ?? []} />

      <section aria-labelledby="tier-heading" className="mt-stack">
        <h2 id="tier-heading" className="text-display-sm text-navy">Price tiers</h2>
        <p className="mt-lede max-w-[60ch] text-support text-navy/75">
          A tier is a set of trade prices, for example “Fitters” or “Retailers”. Assign accounts to a tier under Trade accounts.
        </p>
        {tierNotice && <p role="status" className="notice mt-4 max-w-xl px-4 py-3 text-[0.9375rem] text-navy">{tierNotice}</p>}
        <form action={addTier} className="mt-6 flex max-w-xl flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label htmlFor="tier-name" className="text-[0.9375rem] font-medium text-navy">New tier name</label>
            <input id="tier-name" name="name" required maxLength={80} className="mt-2 min-h-14 w-full rounded-control border border-navy/25 bg-white px-4 text-base text-navy focus:border-navy" />
          </div>
          <Button type="submit" variant="outline">Add tier</Button>
        </form>
      </section>
    </AdminShell>
  );
}
