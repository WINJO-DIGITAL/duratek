import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { QuoteHeaderForm } from "@/components/trade/quote-forms";
import { QuoteStatusChip } from "@/components/trade/quote-status";
import { TradeShell, TradeSkeleton } from "@/components/trade/trade-shell";
import { requireApprovedTrade } from "@/lib/auth/trade";
import { formatPence } from "@/lib/money";
import { formatBp } from "@/lib/pricing";
import { getPreferences } from "@/lib/trade/preferences";
import { listQuotes } from "@/lib/trade/quotes";

export const metadata: Metadata = { title: "Quotes", robots: { index: false } };

export default function QuotesPage({ searchParams }: PageProps<"/trade/account/quotes">) {
  return (
    <PageTransition>
      <Suspense fallback={<TradeSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

async function Content({ searchParams }: { searchParams: PageProps<"/trade/account/quotes">["searchParams"] }) {
  const { account, customerView } = await requireApprovedTrade("/trade/account/quotes");
  const [quotes, prefs, params] = await Promise.all([listQuotes(), getPreferences(), searchParams]);
  const deleted = params.notice === "deleted";

  return (
    <TradeShell
      account={account}
      customerView={customerView}
      current="/trade/account/quotes"
      back="/trade/account/quotes"
      title="Quotes"
      intro={
        <p>
          Build a quote from measured areas: packs are worked out for you and costed at your trade price. Your customer gets a clean link with
          your prices only, never your cost or margin.
        </p>
      }
    >
      {deleted && <p role="status" className="notice mb-6 max-w-xl px-4 py-3 text-[0.9375rem] text-navy">Quote deleted.</p>}

      <div className="grid gap-10 lg:grid-cols-[1fr_26rem] lg:items-start">
        <section aria-labelledby="list-heading">
          <h2 id="list-heading" className="text-display-sm text-navy">Your quotes</h2>
          {quotes.length === 0 ? (
            <p className="mt-4 text-ink-muted">No quotes yet. Start one with your customer’s name.</p>
          ) : (
            <ul className="mt-6 space-y-3">
              {quotes.map((q) => (
                <li key={q.id}>
                  <Link
                    href={`/trade/account/quotes/${q.id}`}
                    className="card flex flex-wrap items-center justify-between gap-x-6 gap-y-2 p-4 transition-colors hover:border-navy/40 sm:p-5"
                  >
                    <span className="min-w-0">
                      <span className="data block text-[0.8125rem] text-ink-muted">{q.reference}</span>
                      <span className="block truncate text-[1.0625rem] text-navy">{q.customerName}</span>
                      <span className="block text-[0.8125rem] text-ink-muted">
                        {dateFmt.format(new Date(q.createdAt))} · {q.lines.length} {q.lines.length === 1 ? "line" : "lines"}
                      </span>
                    </span>
                    <span className="flex items-center gap-4 text-right">
                      <span>
                        <span className="data block text-navy">{formatPence(q.totals.totalPence)}</span>
                        {!customerView && q.lines.length > 0 && (
                          <span className="data block text-[0.8125rem] text-ink-muted">margin {formatBp(q.totals.marginBp)}</span>
                        )}
                      </span>
                      <QuoteStatusChip status={q.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="new-heading" className="card p-5 sm:p-6">
          <h2 id="new-heading" className="text-display-sm text-navy">New quote</h2>
          <div className="mt-6">
            <QuoteHeaderForm values={{ vatRateBp: prefs.vat_registered ? 2000 : 0 }} />
          </div>
        </section>
      </div>
    </TradeShell>
  );
}
