import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@/components/ui/icons";
import { requireAdmin } from "@/lib/auth/admin";
import { isUuid } from "@/lib/ids";
import { formatPence, penceToInput } from "@/lib/money";
import { userSupabase } from "@/lib/supabase/server";
import { saveAccountPrices } from "./actions";

export const metadata: Metadata = { title: "Account prices", robots: { index: false } };

export default function AccountPricesPage({ params, searchParams }: PageProps<"/admin/accounts/[id]">) {
  return (
    <PageTransition>
      <Suspense fallback={<div aria-busy="true" className="container-page h-96 animate-pulse py-16" />}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}

const NOTICE: Record<string, string> = {
  saved: "Saved. The account sees these prices next time a page loads.",
  invalid: "One of the prices isn’t valid. Use pounds and pence, like 19.50. Nothing was saved.",
  error: "Couldn’t save. Please try again.",
};

async function Content({ params, searchParams }: { params: PageProps<"/admin/accounts/[id]">["params"]; searchParams: PageProps<"/admin/accounts/[id]">["searchParams"] }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  await requireAdmin(`/admin/accounts/${id}`);
  if (!isUuid(id)) notFound();
  const db = await userSupabase();
  const { data: profile } = await db.from("profiles").select("id, company_name, contact_name, status, tier_id").eq("id", id).maybeSingle();
  if (!profile) notFound();
  const [finishes, tier, tierPrices, overrides] = await Promise.all([
    db.from("finishes").select("id, name").order("sort_order").order("name"),
    profile.tier_id ? db.from("price_tiers").select("name").eq("id", profile.tier_id).maybeSingle() : Promise.resolve({ data: null }),
    profile.tier_id ? db.from("prices").select("finish_id, price_per_m2_pence").eq("tier_id", profile.tier_id) : Promise.resolve({ data: [] }),
    db.from("price_overrides").select("finish_id, price_per_m2_pence").eq("profile_id", id),
  ]);
  const tierPrice = new Map((tierPrices.data ?? []).map((p) => [p.finish_id, p.price_per_m2_pence]));
  const own = new Map((overrides.data ?? []).map((p) => [p.finish_id, p.price_per_m2_pence]));
  const notice = NOTICE[String(sp.notice ?? "")];

  return (
    <AdminShell
      current="/admin/accounts"
      title={profile.company_name || profile.contact_name || "Trade account"}
      intro={
        <p>
          Account prices apply to this account only and win over its tier ({tier.data?.name ?? "no tier yet"}). Leave a field blank to use the tier
          price. Per m², in pounds.
        </p>
      }
    >
      <Link href="/admin/accounts" className="nav-link -mt-4 mb-6 gap-2">
        <ArrowLeft size={16} /> All accounts
      </Link>
      {notice && <p role="status" className="notice mb-6 max-w-xl px-4 py-3 text-[0.9375rem] text-navy">{notice}</p>}
      {profile.status !== "approved" && (
        <p className="notice mb-6 max-w-xl px-4 py-3 text-[0.9375rem] text-navy">This account isn’t approved, so it sees no trade prices at all.</p>
      )}
      <form action={saveAccountPrices}>
        <input type="hidden" name="profile_id" value={profile.id} />
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-left">
            <caption className="sr-only">Tier and account prices per square metre</caption>
            <thead>
              <tr className="border-b border-line text-[0.8125rem] text-ink-muted">
                <th scope="col" className="px-5 py-3 font-medium">Finish</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Tier price</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">Account price</th>
              </tr>
            </thead>
            <tbody>
              {(finishes.data ?? []).map((f) => (
                <tr key={f.id} className="border-b border-line last:border-b-0">
                  <th scope="row" className="px-5 py-2 text-[0.9375rem] font-normal text-navy">{f.name}</th>
                  <td className="data px-3 py-2 text-right text-[0.9375rem] text-ink-muted">{tierPrice.has(f.id) ? formatPence(tierPrice.get(f.id)!) : "—"}</td>
                  <td className="px-5 py-2">
                    <div className="relative ml-auto w-28">
                      <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">£</span>
                      <input
                        name={`override:${f.id}`}
                        aria-label={`Account price for ${f.name}`}
                        defaultValue={penceToInput(own.get(f.id))}
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="tier"
                        className="data min-h-tap w-28 rounded-control border border-navy/25 bg-white py-2 pl-7 pr-2 text-right text-[0.9375rem] text-navy placeholder:text-ink-muted/70 focus:border-navy"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button type="submit" className="mt-6">Save account prices</Button>
      </form>
    </AdminShell>
  );
}
