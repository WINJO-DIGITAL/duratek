import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { CopyLink } from "@/components/trade/copy-link";
import { FlooringLineForm, OtherLineForm, QuoteHeaderForm } from "@/components/trade/quote-forms";
import { QuoteStatusChip } from "@/components/trade/quote-status";
import { TradeShell, TradeSkeleton } from "@/components/trade/trade-shell";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@/components/ui/icons";
import { byTone, getFinishes } from "@/lib/catalogue";
import { requireApprovedTrade } from "@/lib/auth/trade";
import { emailConfigured } from "@/lib/email";
import { formatPence } from "@/lib/money";
import { formatBp, formatQuantity, lineCost, lineSell, marginBp } from "@/lib/pricing";
import { siteUrl } from "@/lib/site";
import { getPreferences } from "@/lib/trade/preferences";
import { getQuote } from "@/lib/trade/quotes";
import { deleteLine, deleteQuote, emailQuote, setQuoteStatus } from "../actions";

export const metadata: Metadata = { title: "Quote", robots: { index: false } };

export default function QuotePage({ params, searchParams }: PageProps<"/trade/account/quotes/[id]">) {
  return (
    <PageTransition>
      <Suspense fallback={<TradeSkeleton />}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}

const NOTICE: Record<string, string> = {
  sent: "Marked as sent. Share the link below with your customer.",
  draft: "Back to draft. The customer link is switched off until you send it again.",
  accepted: "Marked as accepted.",
  declined: "Marked as declined.",
  emailed: "Emailed to your customer.",
  "no-email": "Add your customer’s email address first.",
  empty: "Add at least one line first.",
  "email-limit": "You’ve sent a lot of emails today. Please share the link instead, or try again later.",
  "email-failed": "The email couldn’t be sent. Please share the link instead.",
  confirm: "Tick the box to confirm deleting this quote.",
};

async function Content({
  params,
  searchParams,
}: {
  params: PageProps<"/trade/account/quotes/[id]">["params"];
  searchParams: PageProps<"/trade/account/quotes/[id]">["searchParams"];
}) {
  const { id } = await params;
  const { account, customerView } = await requireApprovedTrade(`/trade/account/quotes/${id}`);
  const [quote, finishes, prefs, sp] = await Promise.all([getQuote(id), getFinishes(), getPreferences(), searchParams]);
  if (!quote) notFound();

  const notice = NOTICE[String(sp.notice ?? "")];
  const showTrade = !customerView;
  const link = siteUrl(`/q/${quote.shareToken}`);
  const finishOptions = byTone(finishes)
    .filter((f) => f.specs.pack_coverage_m2)
    .map((f) => ({ id: f.id, label: `${f.name} · ${f.specs.pack_coverage_m2} m² per pack` }));
  const t = quote.totals;
  const self = `/trade/account/quotes/${quote.id}`;

  return (
    <TradeShell
      account={account}
      customerView={customerView}
      current="/trade/account/quotes"
      back={self}
      title={`${quote.reference} · ${quote.customerName}`}
    >
      <div className="-mt-6 mb-8 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link href="/trade/account/quotes" className="nav-link gap-2">
          <ArrowLeft size={16} /> All quotes
        </Link>
        <QuoteStatusChip status={quote.status} />
      </div>

      {notice && (
        <p role="status" className="notice mb-6 max-w-2xl px-4 py-3 text-[0.9375rem] text-navy">
          {notice}
        </p>
      )}

      {/* Lines and totals */}
      <section aria-labelledby="lines-heading">
        <h2 id="lines-heading" className="text-display-sm text-navy">Lines</h2>
        {quote.lines.length === 0 ? (
          <p className="mt-4 text-ink-muted">No lines yet. Add flooring from a measured area, then any accessories or labour.</p>
        ) : (
          <div className="card relative mt-6 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <caption className="sr-only">Quote lines{showTrade ? ", with your cost and margin" : ""}</caption>
              <thead>
                <tr className="border-b border-line text-[0.8125rem] text-ink-muted">
                  <th scope="col" className="px-4 py-3 font-medium sm:px-5">Item</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Quantity</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Each</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Total</th>
                  {showTrade && <th scope="col" className="px-3 py-3 text-right font-medium">Your cost</th>}
                  {showTrade && <th scope="col" className="px-3 py-3 text-right font-medium">Margin</th>}
                  <th scope="col" className="px-3 py-3"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {quote.lines.map((l) => (
                  <tr key={l.id} className="border-b border-line last:border-b-0 align-top">
                    <th scope="row" className="px-4 py-3 text-[0.9375rem] font-normal text-navy sm:px-5">
                      {l.description}
                      {l.areaM2 !== null && (
                        <span className="data mt-0.5 block text-[0.8125rem] text-ink-muted">
                          {l.areaM2} m² measured + {l.wastagePct}% wastage
                        </span>
                      )}
                    </th>
                    <td className="data px-3 py-3 text-right text-[0.9375rem] text-navy">{formatQuantity(l.quantity, l.unit)}</td>
                    <td className="data px-3 py-3 text-right text-[0.9375rem] text-navy">{formatPence(l.unitSellPence)}</td>
                    <td className="data px-3 py-3 text-right text-[0.9375rem] text-navy">{formatPence(lineSell(l))}</td>
                    {showTrade && <td className="data px-3 py-3 text-right text-[0.9375rem] text-ink-muted">{formatPence(lineCost(l))}</td>}
                    {showTrade && (
                      <td className="data px-3 py-3 text-right text-[0.9375rem] text-ink-muted">{formatBp(marginBp(lineCost(l), lineSell(l)))}</td>
                    )}
                    <td className="px-3 py-1.5 text-right">
                      <form action={deleteLine}>
                        <input type="hidden" name="quote_id" value={quote.id} />
                        <input type="hidden" name="line_id" value={l.id} />
                        <button type="submit" className="min-h-tap text-[0.875rem] text-ink-muted underline underline-offset-4 hover:text-error">
                          Remove<span className="sr-only"> {l.description}</span>
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <dl className="ml-auto mt-6 max-w-sm">
          <Total label="Subtotal" pence={t.subtotalPence} />
          {quote.vatRateBp > 0 && <Total label={`VAT at ${formatBp(quote.vatRateBp)}`} pence={t.vatPence} />}
          <Total label="Total" pence={t.totalPence} strong />
          {showTrade && quote.lines.length > 0 && (
            <div className="mt-4 rounded-control border border-line bg-white/60 px-4 py-2">
              <Total label="Your cost" pence={t.costPence} />
              <Total label="Your profit" pence={t.profitPence} />
              <div className="flex items-baseline justify-between gap-4 py-2">
                <dt className="text-[0.9375rem] text-ink-muted">Margin</dt>
                <dd className="data text-navy">{formatBp(t.marginBp)}</dd>
              </div>
            </div>
          )}
        </dl>
      </section>

      {/* Add lines */}
      <div className="mt-stack grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="flooring-heading" className="card p-5 sm:p-6">
          <h2 id="flooring-heading" className="text-display-sm text-navy">Add flooring</h2>
          <p className="mt-2 text-[0.9375rem] text-ink-muted">Enter the measured area. Packs are rounded up with your wastage allowance.</p>
          <div className="mt-6">
            <FlooringLineForm
              quoteId={quote.id}
              finishes={finishOptions}
              defaultWastage={prefs.default_wastage_pct}
              sellHint={showTrade ? `Blank: +${formatBp(prefs.default_markup_bp)}` : "Optional"}
            />
          </div>
        </section>
        <section aria-labelledby="other-heading" className="card p-5 sm:p-6">
          <h2 id="other-heading" className="text-display-sm text-navy">Add accessories or labour</h2>
          <p className="mt-2 text-[0.9375rem] text-ink-muted">Trims, door bars, fitting, uplift, delivery.</p>
          <div className="mt-6">
            <OtherLineForm quoteId={quote.id} showCost={showTrade} />
          </div>
        </section>
      </div>

      {/* Share */}
      <section aria-labelledby="share-heading" className="mt-stack">
        <h2 id="share-heading" className="text-display-sm text-navy">Share with your customer</h2>
        {quote.status === "draft" ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            <p className="max-w-[52ch] text-[0.9375rem] text-ink-muted">
              The customer link only works once the quote is sent. They see your prices and the total, never your cost or margin.
            </p>
            <form action={setQuoteStatus}>
              <input type="hidden" name="quote_id" value={quote.id} />
              <input type="hidden" name="status" value="sent" />
              <Button type="submit" disabled={quote.lines.length === 0} arrow>
                Mark as sent
              </Button>
            </form>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <CopyLink url={link} />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <a href={`/q/${quote.shareToken}`} target="_blank" rel="noopener" className="min-h-tap py-3 text-[0.9375rem] text-navy underline underline-offset-4 hover:text-green-ink">
                Open the customer copy (print or save as PDF)
              </a>
              {emailConfigured() && quote.customerEmail && (
                <form action={emailQuote}>
                  <input type="hidden" name="quote_id" value={quote.id} />
                  <Button type="submit" variant="outline">Email to {quote.customerEmail}</Button>
                </form>
              )}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              {(["accepted", "declined", "draft"] as const)
                .filter((s) => s !== quote.status)
                .map((s) => (
                  <form key={s} action={setQuoteStatus}>
                    <input type="hidden" name="quote_id" value={quote.id} />
                    <input type="hidden" name="status" value={s} />
                    <Button type="submit" variant="quiet">
                      {s === "accepted" ? "Mark accepted" : s === "declined" ? "Mark declined" : "Back to draft"}
                    </Button>
                  </form>
                ))}
            </div>
          </div>
        )}
      </section>

      {/* Details */}
      <section aria-labelledby="details-heading" className="card mt-stack p-5 sm:p-6">
        <h2 id="details-heading" className="text-display-sm text-navy">Customer and site</h2>
        <div className="mt-6">
          <QuoteHeaderForm
            values={{
              id: quote.id,
              customerName: quote.customerName,
              customerEmail: quote.customerEmail,
              customerPhone: quote.customerPhone,
              siteAddress: quote.siteAddress,
              sitePostcode: quote.sitePostcode,
              notes: quote.notes,
              validUntil: quote.validUntil,
              vatRateBp: quote.vatRateBp,
            }}
          />
        </div>
      </section>

      <form action={deleteQuote} className="mt-stack flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-6">
        <input type="hidden" name="quote_id" value={quote.id} />
        <label className="flex min-h-tap items-center gap-3 text-[0.9375rem] text-ink-muted">
          <input type="checkbox" name="confirm" value="yes" className="size-5 accent-green-ink" />
          Delete this quote for good
        </label>
        <Button type="submit" variant="quiet">Delete quote</Button>
      </form>
    </TradeShell>
  );
}

function Total({ label, pence, strong = false }: { label: string; pence: number; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-b-0">
      <dt className={strong ? "font-medium text-navy" : "text-[0.9375rem] text-ink-muted"}>{label}</dt>
      <dd className={strong ? "data text-[1.125rem] font-medium text-navy" : "data text-navy"}>{formatPence(pence)}</dd>
    </div>
  );
}
