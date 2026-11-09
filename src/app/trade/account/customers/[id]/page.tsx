import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { CustomerForm } from "@/components/trade/portal-forms";
import { QuoteStatusChip } from "@/components/trade/quote-status";
import { CustomerModeBlocked, TradeShell, TradeSkeleton } from "@/components/trade/trade-shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { ArrowLeft } from "@/components/ui/icons";
import { requireApprovedTrade } from "@/lib/auth/trade";
import { formatPence } from "@/lib/money";
import { getCustomer, listProjects } from "@/lib/trade/portal";
import { listQuotes } from "@/lib/trade/quotes";
import { deleteCustomer } from "../actions";

export const metadata: Metadata = { title: "Customer", robots: { index: false } };

export default function CustomerPage({ params, searchParams }: PageProps<"/trade/account/customers/[id]">) {
  return (
    <PageTransition>
      <Suspense fallback={<TradeSkeleton />}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}

async function Content({ params, searchParams }: { params: PageProps<"/trade/account/customers/[id]">["params"]; searchParams: PageProps<"/trade/account/customers/[id]">["searchParams"] }) {
  const { id } = await params;
  const { account, customerView } = await requireApprovedTrade(`/trade/account/customers/${id}`);
  const back = `/trade/account/customers/${id}`;
  if (customerView) return <TradeShell account={account} customerView current="/trade/account/customers" back={back} title="Customer"><CustomerModeBlocked back={back} /></TradeShell>;
  const [customer, projects, quotes, sp] = await Promise.all([getCustomer(id), listProjects(), listQuotes(), searchParams]);
  if (!customer) notFound();
  const theirProjects = projects.filter((p) => p.customerId === customer.id);
  const theirQuotes = quotes.filter((q) => q.customerId === customer.id);
  return (
    <TradeShell account={account} customerView={false} current="/trade/account/customers" back={back} title={customer.name}>
      <Link href="/trade/account/customers" className="nav-link -mt-4 mb-6 gap-2"><ArrowLeft size={16} /> All customers</Link>
      {sp.notice === "created" && <p role="status" className="notice mb-6 max-w-xl px-4 py-3 text-[0.9375rem] text-navy">Customer added. Start a project for them below.</p>}
      {sp.notice === "confirm" && <p role="status" className="notice mb-6 max-w-xl px-4 py-3 text-[0.9375rem] text-navy">Tick the box to confirm deleting.</p>}
      <div className="grid gap-10 lg:grid-cols-[1fr_26rem] lg:items-start">
        <div className="space-y-10">
          <section aria-labelledby="projects-heading">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 id="projects-heading" className="text-display-sm text-navy">Projects</h2>
              <ButtonLink href={`/trade/account/projects?customer=${customer.id}#new`} variant="outline">New project</ButtonLink>
            </div>
            {theirProjects.length === 0 ? <p className="mt-4 text-ink-muted">None yet.</p> : (
              <ul className="mt-4 space-y-2">
                {theirProjects.map((p) => (
                  <li key={p.id}><Link href={`/trade/account/projects/${p.id}`} className="card flex justify-between gap-4 p-4 hover:border-navy/40"><span className="text-navy">{p.name}</span><span className="text-[0.875rem] text-ink-muted">{p.rooms.length} {p.rooms.length === 1 ? "room" : "rooms"}</span></Link></li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="quotes-heading">
            <h2 id="quotes-heading" className="text-display-sm text-navy">Quotes</h2>
            {theirQuotes.length === 0 ? <p className="mt-4 text-ink-muted">None yet.</p> : (
              <ul className="mt-4 space-y-2">
                {theirQuotes.map((q) => (
                  <li key={q.id}><Link href={`/trade/account/quotes/${q.id}`} className="card flex items-center justify-between gap-4 p-4 hover:border-navy/40"><span className="data text-navy">{q.reference}</span><span className="flex items-center gap-3"><span className="data text-navy">{formatPence(q.totals.totalPence)}</span><QuoteStatusChip status={q.status} /></span></Link></li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <section aria-labelledby="details-heading" className="card p-5 sm:p-6">
          <h2 id="details-heading" className="text-display-sm text-navy">Details</h2>
          <div className="mt-6"><CustomerForm values={customer} /></div>
          <form action={deleteCustomer} className="mt-6 flex flex-wrap items-center gap-x-4 border-t border-line pt-4">
            <input type="hidden" name="id" value={customer.id} />
            <label className="flex min-h-tap items-center gap-2 text-[0.875rem] text-ink-muted"><input type="checkbox" name="confirm" value="yes" className="size-4 accent-green-ink" />Delete this customer</label>
            <Button type="submit" variant="quiet">Delete</Button>
          </form>
        </section>
      </div>
    </TradeShell>
  );
}
