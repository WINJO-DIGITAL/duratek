import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Figure, Ranking } from "@/components/admin/figures";
import { PageTransition } from "@/components/layout/page-transition";
import { getFinishes } from "@/lib/catalogue";
import { requireAdmin } from "@/lib/auth/admin";
import { cn } from "@/lib/cn";
import { userSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Analytics", robots: { index: false } };

export default function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  return (
    <PageTransition>
      <Suspense fallback={<div aria-busy="true" className="container-page h-96 animate-pulse py-16" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}

interface Analytics {
  days: number;
  views_by_finish: { finish_id: string; views: number }[];
  samples_by_finish: { finish_id: string; requested: number }[];
  samples_by_status: Record<string, number>;
  samples_by_week: { week: string; count: number }[];
  accounts_by_month: { month: string; applied: number; approved: number }[];
  accounts_active_30d: number;
  enquiries_by_kind: Record<string, number>;
  enquiries_by_finish: { finish_id: string; enquiries: number }[];
  enquiries_by_stockist: { stockist: string; enquiries: number }[];
  enquiries_by_status: Record<string, number>;
  quotes_by_status: Record<string, number>;
  quotes_by_week: { week: string; count: number }[];
  quoted_m2_by_finish: { finish_id: string; m2: number }[];
}

const PERIODS = [30, 90, 365] as const;
const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const n = (r: Record<string, number>, k: string) => r[k] ?? 0;
const total = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

async function Content({ searchParams }: { searchParams: PageProps<"/admin/analytics">["searchParams"] }) {
  await requireAdmin("view_reports", "/admin/analytics");
  const raw = Number((await searchParams).days);
  const days = PERIODS.includes(raw as (typeof PERIODS)[number]) ? raw : 90;
  const db = await userSupabase();
  const [{ data, error }, finishes] = await Promise.all([db.rpc("admin_analytics", { p_days: days }), getFinishes()]);
  const name = new Map(finishes.map((f) => [f.id, f.name]));
  const label = (id: string) => name.get(id) ?? "Finish no longer published";

  if (error || !data) {
    return (
      <AdminShell current="/admin/analytics" title="Analytics" intro="What customers look at, ask for and request.">
        <p className="notice max-w-xl px-5 py-4 text-navy">The figures couldn’t be loaded. Has the latest database migration been applied?</p>
      </AdminShell>
    );
  }
  const a = data as unknown as Analytics;
  const max = (xs: number[]) => Math.max(1, ...xs);
  const maxViews = max(a.views_by_finish.map((x) => x.views));
  const maxSamples = max(a.samples_by_finish.map((x) => x.requested));
  const maxEnq = max(a.enquiries_by_finish.map((x) => x.enquiries));
  const maxM2 = max(a.quoted_m2_by_finish.map((x) => Number(x.m2)));
  const maxStockist = max(a.enquiries_by_stockist.map((x) => x.enquiries));
  const totalViews = a.views_by_finish.reduce((s, x) => s + Number(x.views), 0);

  return (
    <AdminShell current="/admin/analytics" title="Analytics" intro="What customers look at, ask for and request. Each measure says what it counts, so enquiries, quotes and sales are never mixed up.">
      <nav aria-label="Period" className="flex gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={`/admin/analytics?days=${p}`}
            aria-current={p === days ? "page" : undefined}
            className={cn("flex min-h-tap items-center rounded-control border px-4 text-[0.9375rem]", p === days ? "border-green-ink text-green-ink" : "border-navy/20 text-navy hover:border-navy")}
          >
            {p === 365 ? "1 year" : `${p} days`}
          </Link>
        ))}
      </nav>

      <section aria-labelledby="kinds-heading" className="mt-stack">
        <h2 id="kinds-heading" className="text-display-sm text-navy">What Each Number Means</h2>
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          <Figure label="Finish page views" value={totalViews} note="Page loads, not people" />
          <Figure label="Sample requests" value={total(a.samples_by_status)} note={`${n(a.samples_by_status, "sent")} sent, ${n(a.samples_by_status, "cancelled")} cancelled`} />
          <Figure label="Enquiries" value={total(a.enquiries_by_kind)} note="Messages. Not orders" />
          <Figure label="Trade quotes" value={total(a.quotes_by_status)} note="Traders’ own quotes to their customers" />
          <Figure label="Quote accepted" value={n(a.quotes_by_status, "accepted")} note="A trader’s customer said yes. Not a Duratek sale" />
          <Figure label="Actual sales" value="Not tracked" note="Duratek has no ordering. Sales happen at stockists and online retailers and are not reported here" />
        </dl>
      </section>

      <div className="mt-stack grid gap-10 lg:grid-cols-2">
        <Ranking id="views-rank" title="Most viewed finishes" empty="No views recorded yet. Counting starts once the site is live with the admin migration applied." rows={a.views_by_finish.map((x) => ({ label: label(x.finish_id), value: Number(x.views), share: Number(x.views) / maxViews, text: `${x.views} views` }))} />
        <Ranking id="samples-rank" title="Most requested samples" empty="No sample requests yet." rows={a.samples_by_finish.map((x) => ({ label: label(x.finish_id), value: x.requested, share: x.requested / maxSamples, text: `${x.requested}` }))} />
      </div>

      <section aria-labelledby="accounts-heading" className="mt-stack">
        <h2 id="accounts-heading" className="text-display-sm text-navy">Trade Account Growth</h2>
        <p className="mt-2 text-[0.9375rem] text-ink-muted">{a.accounts_active_30d} approved {a.accounts_active_30d === 1 ? "account has" : "accounts have"} signed in during the last 30 days.</p>
        {a.accounts_by_month.length === 0 ? (
          <p className="mt-4 text-ink-muted">No applications in this period.</p>
        ) : (
          <div className="card relative mt-6 overflow-x-auto">
            <table className="w-full min-w-[24rem] border-collapse text-left text-[0.9375rem]">
              <caption className="sr-only">Applications and approvals by month</caption>
              <thead>
                <tr className="border-b border-line text-[0.8125rem] text-ink-muted">
                  <th scope="col" className="px-4 py-3 font-medium">Month applied</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Applications</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Now approved</th>
                </tr>
              </thead>
              <tbody>
                {a.accounts_by_month.map((m) => (
                  <tr key={m.month} className="border-b border-line last:border-b-0">
                    <th scope="row" className="px-4 py-3 font-normal text-navy">{monthFmt.format(new Date(m.month))}</th>
                    <td className="data px-4 py-3 text-right text-navy">{m.applied}</td>
                    <td className="data px-4 py-3 text-right text-navy">{m.approved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-stack grid gap-10 lg:grid-cols-2">
        <Ranking id="enq-product" title="Product enquiries, by finish" empty="No product enquiries yet." rows={a.enquiries_by_finish.map((x) => ({ label: label(x.finish_id), value: x.enquiries, share: x.enquiries / maxEnq, text: `${x.enquiries}` }))} />
        <Ranking id="enq-stockist" title="Stockist enquiries, by stockist" empty="No stockist enquiries yet." rows={a.enquiries_by_stockist.map((x) => ({ label: x.stockist, value: x.enquiries, share: x.enquiries / maxStockist, text: `${x.enquiries}` }))} />
      </div>
      <p className="mt-6 text-[0.875rem] text-ink-muted">
        Enquiries: {n(a.enquiries_by_status, "new")} new, {n(a.enquiries_by_status, "contacted")} contacted, {n(a.enquiries_by_status, "closed")} closed. An enquiry is a message; it does not mean a sale or that stock exists.
      </p>

      <section aria-labelledby="quotes-heading" className="mt-stack">
        <h2 id="quotes-heading" className="text-display-sm text-navy">Quotation Activity</h2>
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
          <Figure label="Started" value={total(a.quotes_by_status)} note="All traders, this period" />
          <Figure label="Sent to customers" value={n(a.quotes_by_status, "sent") + n(a.quotes_by_status, "accepted") + n(a.quotes_by_status, "declined")} note="Includes answered quotes" />
          <Figure label="Accepted" value={n(a.quotes_by_status, "accepted")} note="By the trader’s customer" />
          <Figure label="Declined" value={n(a.quotes_by_status, "declined")} note="By the trader’s customer" />
        </dl>
        <div className="mt-10">
          <Ranking id="quoted-rank" title="Flooring quoted, by finish (m²)" empty="No trade quotes yet." rows={a.quoted_m2_by_finish.map((x) => ({ label: label(x.finish_id), value: Number(x.m2), share: Number(x.m2) / maxM2, text: `${Number(x.m2).toLocaleString("en-GB")} m²` }))} />
        </div>
        <p className="mt-6 max-w-[70ch] text-[0.875rem] text-ink-muted">
          Quotes belong to the traders who write them, so you see counts and the area quoted, never their prices, margins or customers. A quote is an estimate for a job, not a completed sale, and no revenue figure is shown.
        </p>
      </section>
    </AdminShell>
  );
}
