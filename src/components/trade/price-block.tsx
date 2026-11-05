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

/** What everyone sees, and what loads first: the RRP, set by the business. */
export function PriceBlockPublic({ rrpPence }: { rrpPence?: number }) {
  return (
    <div className="mt-8 border-t border-line">
      {rrpPence !== undefined && (
        <dl>
          <Row label="RRP">
            <Money pence={rrpPence} />
          </Row>
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
export async function PriceBlock({ finishId, slug, rrpPence }: { finishId: string; slug: string; rrpPence?: number }) {
  const account = await getAccount();
  if (!account) return <PriceBlockPublic rrpPence={rrpPence} />;

  const back = `/range/${slug}`;
  const customerView = await inCustomerView();
  const showTrade = await canSeeTradePrices(account);
  const trade = showTrade ? (await getTradePrices(account)).get(finishId) : undefined;

  return (
    <div className="mt-8 border-t border-line">
      <dl>
        {rrpPence !== undefined && (
          <Row label="RRP">
            <Money pence={rrpPence} />
          </Row>
        )}
        {showTrade && (
          <Row label={trade?.isAccountPrice ? "Your account price" : "Your trade price"}>
            {trade ? <Money pence={trade.pence} strong /> : <span className="text-[0.875rem] text-ink-muted">Not set yet</span>}
          </Row>
        )}
      </dl>

      {account.status === "pending" && (
        <p className="pt-3 text-[0.875rem] text-ink-muted">Your trade account is waiting for approval. We’ll email you.</p>
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
