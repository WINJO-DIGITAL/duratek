import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { PrintButton } from "@/components/trade/print-button";
import { Button } from "@/components/ui/button";
import { formatPence } from "@/lib/money";
import { customerTotals, formatBp, formatQuantity, lineSell } from "@/lib/pricing";
import { getSharedQuote } from "@/lib/trade/shared-quote";
import { respondToQuote } from "./actions";

export const metadata: Metadata = {
  title: "Your flooring quote",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function SharedQuotePage({ params, searchParams }: PageProps<"/q/[token]">) {
  return (
    <Suspense fallback={<div aria-busy="true" className="container-page h-96 animate-pulse py-16" />}>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

const NOTICE: Record<string, string> = {
  thanks: "Thank you. Your answer has been sent.",
  unchanged: "This quote has already been answered.",
  busy: "Please try again in a little while.",
};

async function Content({ params, searchParams }: { params: PageProps<"/q/[token]">["params"]; searchParams: PageProps<"/q/[token]">["searchParams"] }) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const quote = await getSharedQuote(token);
  if (!quote) notFound();

  const totals = customerTotals(
    quote.lines.map((l) => ({ quantity: l.quantity, unitSellPence: l.unit_sell_pence })),
    quote.vat_rate_bp,
  );
  const notice = NOTICE[String(sp.notice ?? "")];
  const expired = quote.valid_until ? new Date(`${quote.valid_until}T23:59:59`) < new Date() : false;

  return (
    <div className="container-page max-w-4xl pb-section pt-12 sm:pt-16 print:pt-0">
      {notice && (
        <p role="status" className="notice mb-8 px-4 py-3 text-[0.9375rem] text-navy" data-print-hide>
          {notice}
        </p>
      )}

      <article className="card p-6 sm:p-10">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
          <div>
            <p className="font-display text-display-sm text-navy">{quote.trader.company_name || "Your fitter"}</p>
            <p className="mt-1 text-[0.9375rem] text-ink-muted">
              {[quote.trader.contact_name, quote.trader.phone].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="eyebrow sm:justify-end">Quotation</p>
            <p className="data mt-2 text-navy">{quote.reference}</p>
            <p className="mt-1 text-[0.875rem] text-ink-muted">{dateFmt.format(new Date(quote.issued_at))}</p>
          </div>
        </header>

        <section aria-label="Customer" className="grid gap-6 border-b border-line py-6 sm:grid-cols-2">
          <div>
            <p className="text-[0.8125rem] text-ink-muted">Prepared for</p>
            <p className="mt-1 text-navy">{quote.customer_name}</p>
            {(quote.site_address || quote.site_postcode) && (
              <p className="mt-1 text-[0.9375rem] text-ink-muted">{[quote.site_address, quote.site_postcode].filter(Boolean).join(", ")}</p>
            )}
          </div>
          {quote.valid_until && (
            <div className="sm:text-right">
              <p className="text-[0.8125rem] text-ink-muted">Valid until</p>
              <p className="mt-1 text-navy">{dateFmt.format(new Date(quote.valid_until))}</p>
            </div>
          )}
        </section>

        <table className="mt-6 w-full border-collapse text-left">
          <caption className="sr-only">Items quoted</caption>
          <thead>
            <tr className="border-b border-line text-[0.8125rem] text-ink-muted">
              <th scope="col" className="py-3 pr-3 font-medium">Item</th>
              <th scope="col" className="hidden px-3 py-3 text-right font-medium sm:table-cell">Quantity</th>
              <th scope="col" className="hidden px-3 py-3 text-right font-medium sm:table-cell">Each</th>
              <th scope="col" className="py-3 pl-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {quote.lines.map((l, i) => (
              <tr key={i} className="border-b border-line align-top">
                <th scope="row" className="py-3 pr-3 text-[0.9375rem] font-normal text-navy">
                  {l.description}
                  <span className="data mt-0.5 block text-[0.8125rem] text-ink-muted sm:hidden">
                    {formatQuantity(l.quantity, l.unit)} × {formatPence(l.unit_sell_pence)}
                  </span>
                </th>
                <td className="data hidden px-3 py-3 text-right text-[0.9375rem] text-navy sm:table-cell">{formatQuantity(l.quantity, l.unit)}</td>
                <td className="data hidden px-3 py-3 text-right text-[0.9375rem] text-navy sm:table-cell">{formatPence(l.unit_sell_pence)}</td>
                <td className="data py-3 pl-3 text-right text-[0.9375rem] text-navy">{formatPence(lineSell({ quantity: l.quantity, unitSellPence: l.unit_sell_pence }))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-6 max-w-xs">
          <Row label={quote.vat_rate_bp > 0 ? "Subtotal" : "Total"} value={formatPence(totals.subtotalPence)} strong={quote.vat_rate_bp === 0} />
          {quote.vat_rate_bp > 0 && (
            <>
              <Row label={`VAT at ${formatBp(quote.vat_rate_bp)}`} value={formatPence(totals.vatPence)} />
              <Row label="Total" value={formatPence(totals.totalPence)} strong />
            </>
          )}
        </dl>

        {quote.notes && <p className="mt-8 whitespace-pre-line text-[0.9375rem] text-navy">{quote.notes}</p>}
        {quote.footer && <p className="mt-8 whitespace-pre-line border-t border-line pt-6 text-[0.8125rem] text-ink-muted">{quote.footer}</p>}
        <p className="mt-6 text-[0.8125rem] text-ink-muted">
          Flooring: <Wordmark className="inline h-[0.9em] w-auto align-[-0.1em]" />. This quotation is from {quote.trader.company_name || "your fitter"}.
        </p>
      </article>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4" data-print-hide>
        {quote.status === "sent" && !expired && (
          <>
            <form action={respondToQuote}>
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="decision" value="accepted" />
              <Button type="submit" arrow>Accept this quote</Button>
            </form>
            <form action={respondToQuote}>
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="decision" value="declined" />
              <Button type="submit" variant="quiet">Decline</Button>
            </form>
          </>
        )}
        {quote.status === "sent" && expired && <p className="text-[0.9375rem] text-ink-muted">This quote has expired. Please contact {quote.trader.company_name || "your fitter"}.</p>}
        {quote.status === "accepted" && <p className="text-[0.9375rem] text-navy">You accepted this quote.</p>}
        {quote.status === "declined" && <p className="text-[0.9375rem] text-navy">You declined this quote.</p>}
        <PrintButton />
      </div>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-b-0">
      <dt className={strong ? "font-medium text-navy" : "text-[0.9375rem] text-ink-muted"}>{label}</dt>
      <dd className={strong ? "data text-[1.125rem] font-medium text-navy" : "data text-navy"}>{value}</dd>
    </div>
  );
}
