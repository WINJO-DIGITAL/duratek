import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SectionIntro } from "@/components/content/section-intro";
import { PageTransition } from "@/components/layout/page-transition";
import { Button, ButtonLink } from "@/components/ui/button";
import { byTone, getFinishes, grainImage } from "@/lib/catalogue";
import { canSeeTradePrices, getAccount, inCustomerView } from "@/lib/auth/session";
import { formatPence } from "@/lib/money";
import { getTradePrices } from "@/lib/trade/prices";
import { TradeShell } from "@/components/trade/trade-shell";
import { logOut } from "./actions";

export const metadata: Metadata = {
  title: "Your trade account",
  robots: { index: false },
};

export default function TradeAccountPage() {
  return (
    <PageTransition>
      <div className="container-page pb-section pt-12 sm:pt-16">
        <Suspense fallback={<div aria-busy="true" className="h-96 animate-pulse rounded-card bg-line/50" />}>
          <AccountContent />
        </Suspense>
      </div>
    </PageTransition>
  );
}

async function AccountContent() {
  const account = await getAccount();
  if (!account) redirect("/trade/login?next=/trade/account");

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <SectionIntro as="h1" size="lg" eyebrow="Trade account" title={account.companyName || "Your account"}>
        <p>{account.contactName ? `${account.contactName}, ${account.email}` : account.email}</p>
      </SectionIntro>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {account.isAdmin && (
          <ButtonLink href="/admin" variant="quiet">
            Owner admin
          </ButtonLink>
        )}
        <form action={logOut}>
          <Button type="submit" variant="outline">
            Log out
          </Button>
        </form>
      </div>
    </div>
  );

  if (account.status !== "approved") {
    return (
      <>
        {header}
        <div className="notice mt-stack max-w-xl px-5 py-4 text-navy">
          {account.status === "pending" ? (
            <>
              <p className="font-medium">Your application is waiting for approval.</p>
              <p className="mt-1 text-[0.9375rem] text-ink-muted">
                We check every application by hand and will email {account.email} when your account is approved. Until
                then you can browse the range as normal.
              </p>
            </>
          ) : (
            <p className="font-medium">This account wasn’t approved, so trade prices aren’t available.</p>
          )}
        </div>
      </>
    );
  }

  const customerView = await inCustomerView();
  const showTrade = await canSeeTradePrices(account);
  const [finishes, prices] = await Promise.all([
    getFinishes().then(byTone),
    showTrade ? getTradePrices(account) : Promise.resolve(new Map()),
  ]);

  return (
    <TradeShell
      account={account}
      customerView={customerView}
      current="/trade/account"
      back="/trade/account"
      title={showTrade ? "Your prices" : "The range"}
      intro={<p>Prices are per m². RRP is the public recommended price{showTrade ? "; yours is the price set for this account" : ""}.</p>}
    >
      <section aria-label="Price list">
        <div className="card">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Finishes with their RRP{showTrade ? " and your price" : ""}, per square metre</caption>
            <thead>
              <tr className="border-b border-line text-[0.8125rem] text-ink-muted">
                <th scope="col" className="px-4 py-3 font-medium sm:px-6">Finish</th>
                <th scope="col" className="px-2 py-3 text-right font-medium sm:px-3">RRP</th>
                {showTrade && <th scope="col" className="px-4 py-3 text-right font-medium sm:px-6">Your price</th>}
              </tr>
            </thead>
            <tbody>
              {finishes.map((f) => {
                const swatch = grainImage(f);
                const mine = prices.get(f.id);
                return (
                  <tr key={f.id} className="border-b border-line last:border-b-0">
                    <th scope="row" className="px-4 py-2 font-normal sm:px-6 sm:py-3">
                      <Link href={`/range/${f.slug}`} className="flex min-h-tap items-center gap-3 text-[0.9375rem] leading-tight text-navy hover:text-green-ink">
                        <span className="relative hidden size-9 shrink-0 overflow-hidden rounded-control bg-line sm:block">
                          {swatch && <Image src={swatch.src} alt="" fill sizes="36px" quality={70} className="object-cover" />}
                        </span>
                        {f.name}
                      </Link>
                    </th>
                    <td className="data px-2 py-2 text-right text-[0.875rem] text-navy sm:px-3 sm:py-3 sm:text-[0.9375rem]">
                      {f.rrpPence !== undefined ? formatPence(f.rrpPence) : "—"}
                    </td>
                    {showTrade && (
                      <td className="data px-4 py-2 text-right text-[0.875rem] font-medium text-navy sm:px-6 sm:py-3 sm:text-[0.9375rem]">
                        {mine ? formatPence(mine.pence) : "—"}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </TradeShell>
  );
}
