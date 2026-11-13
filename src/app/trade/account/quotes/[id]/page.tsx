import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { CopyLink } from "@/components/trade/copy-link";
import { FlooringLineForm, OtherLineForm, QuoteHeaderForm } from "@/components/trade/quote-forms";
import { QuoteStatusChip } from "@/components/trade/quote-status";
import { CustomerModeBlocked, TradeShell, TradeSkeleton } from "@/components/trade/trade-shell";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@/components/ui/icons";
import { byTone, getFinishes } from "@/lib/catalogue";
import { requireApprovedTrade } from "@/lib/auth/trade";
import { emailConfigured } from "@/lib/email";
import { formatPence } from "@/lib/money";
import { formatBp, formatQuantity, KIND_LABELS, lineCost, lineSell, marginBp } from "@/lib/pricing";
import { siteUrl } from "@/lib/site";
import { groupByRoom } from "@/lib/trade/customer-quote";
import { listCustomers } from "@/lib/trade/portal";
import { getPreferences } from "@/lib/trade/preferences";
import { getQuote, type QuoteLine } from "@/lib/trade/quotes";
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
  sent: "Marked as sent. Share the link or the PDF with your customer.",
  draft: "Back to draft. The customer link is switched off until you send it again.",
  accepted: "Marked as accepted.",
  declined: "Marked as declined.",
  emailed: "Emailed to your customer.",
  "from-project": "Quote created from the project: flooring for each room is priced. Add trims, adhesives, labour, delivery and anything else below.",
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
  const self = `/trade/account/quotes/${id}`;
  // Customer mode: nothing from the quote is loaded or sent.
  if (customerView) {
    return (
      <TradeShell account={account} customerView current="/trade/account/quotes" back={self} title="Quote">
        <CustomerModeBlocked back={self} />
      </TradeShell>
    );
  }

  const [quote, finishes, prefs, customers, sp] = await Promise.all([getQuote(id), getFinishes(), getPreferences(), listCustomers(), searchParams]);
  if (!quote) notFound();

  const notice = NOTICE[String(sp.notice ?? "")];
  const link = siteUrl(`/q/${quote.shareToken}`);
  const finishOptions = byTone(finishes)
    .filter((f) => f.specs.pack_coverage_m2)
    .map((f) => ({ id: f.id, label: `${f.name} · ${f.specs.pack_coverage_m2} m² per pack` }));
  const t = quote.totals;
  const rooms = [...new Set(quote.lines.map((l) => l.roomName).filter((r): r is string => Boolean(r)))];
  const groups = groupByRoom(quote.lines.map((l) => ({ ...l, room_name: l.roomName })));

  return (
    <TradeShell account={account} customerView={false} current="/trade/account/quotes" back={self} title={`${quote.reference} · ${quote.customerName}`}>
      <div className="-mt-4 mb-8 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link href="/trade/account/quotes" className="nav-link gap-2">
          <ArrowLeft size={16} /> All quotes
        </Link>
        <QuoteStatusChip status={quote.status} />
        {quote.projectId && (
          <Link href={`/trade/account/projects/${quote.projectId}`} className="text-[0.9375rem] text-navy underline decoration-green underline-offset-4">
            Project
          </Link>
        )}
        {quote.customerId && (
          <Link href={`/trade/account/customers/${quote.customerId}`} className="text-[0.9375rem] text-navy underline decoration-green underline-offset-4">
            Customer record
          </Link>
        )}
        <a href={`${self}/pdf`} className="min-h-tap py-3 text-[0.9375rem] font-medium text-navy underline decoration-green underline-offset-4">
          Download PDF
        </a>
      </div>

      {notice && (
        <p role="status" className="notice mb-6 max-w-2xl px-4 py-3 text-[0.9375rem] text-navy">
          {notice}
        </p>
      )}

      <div className="grid gap-8 xl:grid-cols-[1fr_22rem] xl:items-start">
        {/* Lines, by room */}
        <section aria-labelledby="lines-heading">
          <h2 id="lines-heading" className="text-display-sm text-navy">Lines</h2>
          {quote.lines.length === 0 ? (
            <p className="mt-4 text-ink-muted">No lines yet. Add flooring from a measured area, then trims, adhesives, labour and the rest.</p>
          ) : (
            <div className="card relative mt-6 overflow-x-auto">
              <table className="w-full min-w-[42rem] border-collapse text-left">
                <caption className="sr-only">Quote lines with your cost and margin</caption>
                <thead>
                  <tr className="border-b border-line text-[0.8125rem] text-ink-muted">
                    <th scope="col" className="px-4 py-3 font-medium sm:px-5">Item</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Quantity</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Each</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Sell</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Your cost</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Margin</th>
                    <th scope="col" className="px-3 py-3"><span className="sr-only">Remove</span></th>
                  </tr>
                </thead>
                {groups.map((g) => (
                  <tbody key={g.room ?? "general"}>
                    {(g.room || groups.length > 1) && (
                      <tr className="border-b border-line bg-cream/50">
                        <th colSpan={7} scope="rowgroup" className="px-4 py-2 text-left text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-green-ink sm:px-5">
                          {g.room ?? "General"}
                        </th>
                      </tr>
                    )}
                    {g.lines.map((l) => (
                      <LineRow key={l.id} l={l} quoteId={quote.id} />
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          )}
        </section>

        {/* Job costing */}
        <aside aria-labelledby="costing-heading" className="card p-5 xl:sticky xl:top-[calc(var(--spacing-header)+2rem)]">
          <h2 id="costing-heading" className="text-[1.125rem] text-navy">Job Costing</h2>
          <dl className="mt-3">
            <Total label="Materials" pence={t.materialCostPence} />
            <Total label="Labour" pence={t.labourCostPence} />
            <Total label="Delivery and other costs" pence={t.additionalCostPence} />
            <Total label={`Contingency (${formatBp(quote.contingencyBp)})`} pence={t.contingencyPence} />
            <Total label="Total job cost" pence={t.totalJobCostPence} strong />
          </dl>
          <dl className="mt-4">
            <Total label="Selling price, ex VAT" pence={t.sellPence} />
            {quote.vatRateBp > 0 && <Total label={`VAT at ${formatBp(quote.vatRateBp)}`} pence={t.vatPence} />}
            <Total label="Customer pays" pence={t.totalPence} strong />
          </dl>
          {quote.lines.length > 0 && (
            <dl className="mt-4 rounded-control border border-line bg-white/60 px-3 py-1">
              <Total label="Estimated gross profit" pence={t.grossProfitPence} strong negative={t.grossProfitPence < 0} />
              <div className="flex items-baseline justify-between gap-4 border-b border-line py-2">
                <dt className="text-[0.9375rem] text-ink-muted">Gross margin <span className="block text-[0.75rem]">profit ÷ selling price</span></dt>
                <dd className="data text-navy">{formatBp(t.grossMarginBp)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-2">
                <dt className="text-[0.9375rem] text-ink-muted">Markup <span className="block text-[0.75rem]">profit ÷ job cost</span></dt>
                <dd className="data text-navy">{formatBp(t.markupBp)}</dd>
              </div>
            </dl>
          )}
          <p className="mt-3 text-[0.75rem] text-ink-muted">All before VAT. Gross profit is before overheads and tax. Your costs, contingency and profit never appear on the customer’s quote or PDF.</p>
        </aside>
      </div>

      {/* Add lines */}
      <div className="mt-stack grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="flooring-heading" className="card p-5 sm:p-6">
          <h2 id="flooring-heading" className="text-display-sm text-navy">Add Flooring</h2>
          <p className="mt-2 text-[0.9375rem] text-ink-muted">Enter the measured area. Packs are rounded up with your wastage allowance and priced at your trade price for that quantity.</p>
          <div className="mt-6">
            <FlooringLineForm quoteId={quote.id} finishes={finishOptions} defaultWastage={prefs.default_wastage_pct} sellHint={`Blank: +${formatBp(prefs.default_markup_bp)}`} rooms={rooms} />
          </div>
        </section>
        <section aria-labelledby="other-heading" className="card p-5 sm:p-6">
          <h2 id="other-heading" className="text-display-sm text-navy">Add Materials, Labour and Costs</h2>
          <p className="mt-2 text-[0.9375rem] text-ink-muted">Underlay, trims, adhesives, accessories, labour, delivery and any other expense, at your own cost and price.</p>
          <div className="mt-6">
            <OtherLineForm quoteId={quote.id} showCost rooms={rooms} labourRatePence={prefs.labour_per_m2_pence} />
          </div>
        </section>
      </div>

      {/* Share */}
      <section aria-labelledby="share-heading" className="mt-stack">
        <h2 id="share-heading" className="text-display-sm text-navy">Send It to Your Customer</h2>
        <p className="mt-2 max-w-[60ch] text-[0.9375rem] text-ink-muted">
          Your customer sees your business, your prices and the total: never your costs, contingency or profit. The PDF works at any stage; the link works once the quote is sent.
        </p>
        {quote.status === "draft" ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            <form action={setQuoteStatus}>
              <input type="hidden" name="quote_id" value={quote.id} />
              <input type="hidden" name="status" value="sent" />
              <Button type="submit" disabled={quote.lines.length === 0} arrow>Mark as Sent</Button>
            </form>
            <a href={`${self}/pdf`} className="min-h-tap py-3 text-[0.9375rem] text-navy underline underline-offset-4">Download PDF</a>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <CopyLink url={link} />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <a href={`/q/${quote.shareToken}`} target="_blank" rel="noopener" className="min-h-tap py-3 text-[0.9375rem] text-navy underline underline-offset-4 hover:text-green-ink">
                Open the customer copy
              </a>
              <a href={`${self}/pdf`} className="min-h-tap py-3 text-[0.9375rem] text-navy underline underline-offset-4">Download PDF</a>
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
                    <Button type="submit" variant="quiet">{s === "accepted" ? "Mark accepted" : s === "declined" ? "Mark declined" : "Back to draft"}</Button>
                  </form>
                ))}
            </div>
          </div>
        )}
      </section>

      {/* Details */}
      <section aria-labelledby="details-heading" className="card mt-stack p-5 sm:p-6">
        <h2 id="details-heading" className="text-display-sm text-navy">Customer, Validity and Notes</h2>
        <div className="mt-6">
          <QuoteHeaderForm
            customers={customers}
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
              customerId: quote.customerId,
              contingencyBp: quote.contingencyBp,
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
        <Button type="submit" variant="quiet">Delete Quote</Button>
      </form>
    </TradeShell>
  );
}

function LineRow({ l, quoteId }: { l: QuoteLine; quoteId: string }) {
  return (
    <tr className="border-b border-line align-top last:border-b-0">
      <th scope="row" className="px-4 py-3 text-[0.9375rem] font-normal text-navy sm:px-5">
        {l.description}
        <span className="mt-0.5 block text-[0.75rem] text-ink-muted">
          {KIND_LABELS[l.kind]}
          {l.areaM2 !== null && <span className="data"> · {l.areaM2} m² measured + {l.wastagePct}% wastage</span>}
        </span>
      </th>
      <td className="data px-3 py-3 text-right text-[0.9375rem] text-navy">{formatQuantity(l.quantity, l.unit)}</td>
      <td className="data px-3 py-3 text-right text-[0.9375rem] text-navy">{formatPence(l.unitSellPence)}</td>
      <td className="data px-3 py-3 text-right text-[0.9375rem] text-navy">{formatPence(lineSell(l))}</td>
      <td className="data px-3 py-3 text-right text-[0.9375rem] text-ink-muted">{formatPence(lineCost(l))}</td>
      <td className="data px-3 py-3 text-right text-[0.9375rem] text-ink-muted">{formatBp(marginBp(lineCost(l), lineSell(l)))}</td>
      <td className="px-3 py-1.5 text-right">
        <form action={deleteLine}>
          <input type="hidden" name="quote_id" value={quoteId} />
          <input type="hidden" name="line_id" value={l.id} />
          <button type="submit" className="min-h-tap text-[0.875rem] text-ink-muted underline underline-offset-4 hover:text-error">
            Remove<span className="sr-only"> {l.description}</span>
          </button>
        </form>
      </td>
    </tr>
  );
}

function Total({ label, pence, strong = false, negative = false }: { label: string; pence: number; strong?: boolean; negative?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-b-0">
      <dt className={strong ? "font-medium text-navy" : "text-[0.9375rem] text-ink-muted"}>{label}</dt>
      <dd className={`data ${strong ? "font-medium" : ""} ${negative ? "text-error" : "text-navy"}`}>{formatPence(pence)}</dd>
    </div>
  );
}
