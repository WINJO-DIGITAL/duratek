import Link from "next/link";
import { setCustomerView } from "@/app/trade/account/actions";
import { canSeeTradePrices, getAccount, inCustomerView } from "@/lib/auth/session";
import { formatPence } from "@/lib/money";
import { getTradePrices } from "@/lib/trade/prices";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-3">
      <dt className="text-[0.9375rem] text-ink-muted">{label}</dt>
      <dd className="text-right text-navy">{children}</dd>
    </div>
  );
}

function Money({ pence, strong = false }: { pence: number; strong?: boolean }) {
  return (
    <>
      <span className={strong ? "data text-[1.125rem] font-medium" : "data text-[1rem]"}>{formatPence(pence)}</span>{" "}
      <span className="text-[0.8125rem] text-ink-muted">per m²</span>
    </>
  );
}

const LOGIN_PROMPT = (
  <p className="pt-3 text-[0.875rem] text-ink-muted">
    Trade customer?{" "}
    <Link href="/trade/login" className="inline-block py-1 text-navy underline underline-offset-4 hover:text-green-ink">
      Log in for your price
    </Link>
  </p>
);

/**
 * The public price leads the panel, the way a shop shows it: one large figure
 * with what it is beside it. With an offer running, the offer leads and the RRP
 * sits beside it, struck through.
 */
function PublicRows({ rrpPence, offerPence }: { rrpPence?: number; offerPence?: number }) {
  const lead = offerPence ?? rrpPence;
  if (lead === undefined) return null;
  return (
    <div className="border-b border-line pb-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <dt className="order-2 text-[0.875rem] text-ink-muted">{offerPence !== undefined ? "Offer price, inc VAT" : "RRP, inc VAT"}</dt>
        <dd className="order-1 text-navy">
          <span className="data text-[1.75rem] leading-none tracking-tight">{formatPence(lead)}</span>{" "}
          <span className="text-[0.9375rem] text-ink-muted">per m²</span>
        </dd>
      </div>
      {offerPence !== undefined && rrpPence !== undefined && (
        <div className="mt-1 flex gap-1.5 text-[0.875rem] text-ink-muted">
          <dt>RRP</dt>
          <dd>
            <span className="data line-through">{formatPence(rrpPence)}</span> per m², inc VAT
          </dd>
        </div>
      )}
    </div>
  );
}

/** What everyone sees, and what loads first: the RRP (and any public offer), set by the business. */
export function PriceBlockPublic({ rrpPence, offerPence }: { rrpPence?: number; offerPence?: number }) {
  return (
    <div className="mt-5">
      {(rrpPence !== undefined || offerPence !== undefined) && (
        <dl>
          <PublicRows rrpPence={rrpPence} offerPence={offerPence} />
        </dl>
      )}
      {LOGIN_PROMPT}
    </div>
  );
}

/**
 * The price block on a finish page. RRP is public. The trade price is read
 * here, at request time and as the signed-in user, and only for an approved
 * account that is not in Customer view; nobody else is ever sent it.
 */
export async function PriceBlock({ finishId, slug, rrpPence, offerPence }: { finishId: string; slug: string; rrpPence?: number; offerPence?: number }) {
  const account = await getAccount();
  if (!account) return <PriceBlockPublic rrpPence={rrpPence} offerPence={offerPence} />;

  const back = `/range/${slug}`;
  const customerView = await inCustomerView();
  const showTrade = await canSeeTradePrices(account);
  const trade = showTrade ? (await getTradePrices(account)).get(finishId) : undefined;

  return (
    <div className="mt-5">
      <dl>
        <PublicRows rrpPence={rrpPence} offerPence={offerPence} />
        {showTrade && (
          <Row label={trade?.isAccountPrice ? "Your account price, ex VAT" : trade?.isPromotion ? "Your trade offer, ex VAT" : "Your trade price, ex VAT"}>
            {trade ? <Money pence={trade.pence} strong /> : <span className="text-[0.875rem] text-ink-muted">Not set yet</span>}
          </Row>
        )}
      </dl>

      {account.status === "pending" && (
        <p className="pt-3 text-[0.875rem] text-ink-muted">Your trade account is waiting for approval. We’ll email you.</p>
      )}
      {account.status === "suspended" && (
        <p className="pt-3 text-[0.875rem] text-ink-muted">This trade account is suspended, so trade prices aren’t shown.</p>
      )}
      {account.status === "rejected" && (
        <p className="pt-3 text-[0.875rem] text-ink-muted">Trade prices aren’t available on this account.</p>
      )}

      {account.status === "approved" && (
        <form action={setCustomerView} className="pt-2">
          <input type="hidden" name="back" value={back} />
          <input type="hidden" name="on" value={customerView ? "0" : "1"} />
          {customerView ? (
            <div className="notice flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 text-[0.875rem] text-navy">
              <span>Customer view is on: trade prices are hidden.</span>
              <button type="submit" className="min-h-tap font-medium underline underline-offset-4 hover:text-green-ink">
                Exit
              </button>
            </div>
          ) : (
            <button
              type="submit"
              className="min-h-tap text-[0.875rem] text-ink-muted underline underline-offset-4 hover:text-navy"
            >
              Hide trade prices (Customer view)
            </button>
          )}
        </form>
      )}
    </div>
  );
}
