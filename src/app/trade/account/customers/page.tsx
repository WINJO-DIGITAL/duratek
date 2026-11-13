import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { CustomerForm } from "@/components/trade/portal-forms";
import { CustomerModeBlocked, TradeShell, TradeSkeleton } from "@/components/trade/trade-shell";
import { requireApprovedTrade } from "@/lib/auth/trade";
import { listCustomers } from "@/lib/trade/portal";

export const metadata: Metadata = { title: "Customers", robots: { index: false } };

export default function CustomersPage({ searchParams }: PageProps<"/trade/account/customers">) {
  return (
    <PageTransition>
      <Suspense fallback={<TradeSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/trade/account/customers">["searchParams"] }) {
  const { account, customerView } = await requireApprovedTrade("/trade/account/customers");
  const shell = { account, customerView, current: "/trade/account/customers" as const, back: "/trade/account/customers", title: "Customers" };
  if (customerView) return <TradeShell {...shell}><CustomerModeBlocked back="/trade/account/customers" /></TradeShell>;
  const [customers, sp] = await Promise.all([listCustomers(), searchParams]);
  const q = String(sp.q ?? "").trim().toLowerCase().slice(0, 100);
  const shown = q ? customers.filter((c) => [c.name, c.email, c.postcode, c.phone].some((x) => x?.toLowerCase().includes(q))) : customers;
  return (
    <TradeShell {...shell} intro={<p>Your customers, private to you. Start a project or a quote from any of them.</p>}>
      {sp.notice === "deleted" && <p role="status" className="notice mb-6 max-w-xl px-4 py-3 text-[0.9375rem] text-navy">Customer deleted. Their projects and quotes are kept.</p>}
      <div className="grid gap-10 lg:grid-cols-[1fr_26rem] lg:items-start">
        <section aria-labelledby="list-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="list-heading" className="text-display-sm text-navy">{customers.length} {customers.length === 1 ? "customer" : "customers"}</h2>
            <form role="search" className="flex gap-2">
              <label htmlFor="cq" className="sr-only">Find a customer</label>
              <input id="cq" name="q" defaultValue={q} placeholder="Name, email or postcode" className="min-h-tap w-56 rounded-control border border-navy/25 bg-white px-3 text-[0.9375rem] text-navy" />
              <button type="submit" className="min-h-tap rounded-control border border-navy/40 px-4 text-[0.9375rem] text-navy">Find</button>
            </form>
          </div>
          {shown.length === 0 ? (
            <p className="mt-4 text-ink-muted">{q ? "No customers match." : "No customers yet."}</p>
          ) : (
            <ul className="mt-6 space-y-2">
              {shown.map((c) => (
                <li key={c.id}>
                  <Link href={`/trade/account/customers/${c.id}`} className="card flex flex-wrap items-center justify-between gap-x-6 gap-y-1 p-4 hover:border-navy/40">
                    <span className="text-[1.0625rem] text-navy">{c.name}</span>
                    <span className="text-[0.875rem] text-ink-muted">{[c.postcode, c.phone, c.email].filter(Boolean).join(" · ")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="new-heading" className="card p-5 sm:p-6">
          <h2 id="new-heading" className="text-display-sm text-navy">New Customer</h2>
          <div className="mt-6"><CustomerForm values={{}} /></div>
        </section>
      </div>
    </TradeShell>
  );
}
