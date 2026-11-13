import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { ProjectForm } from "@/components/trade/portal-forms";
import { CustomerModeBlocked, TradeShell, TradeSkeleton } from "@/components/trade/trade-shell";
import { requireApprovedTrade } from "@/lib/auth/trade";
import { totalArea } from "@/lib/pricing";
import { listCustomers, listProjects } from "@/lib/trade/portal";

export const metadata: Metadata = { title: "Projects", robots: { index: false } };

export default function ProjectsPage({ searchParams }: PageProps<"/trade/account/projects">) {
  return (
    <PageTransition>
      <Suspense fallback={<TradeSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });

async function Content({ searchParams }: { searchParams: PageProps<"/trade/account/projects">["searchParams"] }) {
  const { account, customerView } = await requireApprovedTrade("/trade/account/projects");
  const shell = { account, customerView, current: "/trade/account/projects" as const, back: "/trade/account/projects", title: "Projects" };
  if (customerView) return <TradeShell {...shell}><CustomerModeBlocked back="/trade/account/projects" /></TradeShell>;
  const [projects, customers, sp] = await Promise.all([listProjects(), listCustomers(), searchParams]);
  const preselect = customers.find((c) => c.id === sp.customer)?.id ?? null;
  return (
    <TradeShell {...shell} intro={<p>A project holds a customer’s rooms, measurements and chosen finishes. Price it as a quote whenever you’re ready, and come back to it any time.</p>}>
      {sp.notice === "archived" && <p role="status" className="notice mb-6 max-w-xl px-4 py-3 text-[0.9375rem] text-navy">Project archived.</p>}
      <div className="grid gap-10 lg:grid-cols-[1fr_26rem] lg:items-start">
        <section aria-labelledby="list-heading">
          <h2 id="list-heading" className="text-display-sm text-navy">Your Projects</h2>
          {projects.length === 0 ? (
            <p className="mt-4 text-ink-muted">No projects yet. Create one with a customer, then add their rooms.</p>
          ) : (
            <ul className="mt-6 space-y-2">
              {projects.map((p) => {
                const area = totalArea(p.rooms.filter((r) => r.lengthM && r.widthM).map((r) => ({ lengthM: r.lengthM!, widthM: r.widthM! })));
                return (
                  <li key={p.id}>
                    <Link href={`/trade/account/projects/${p.id}`} className="card flex flex-wrap items-center justify-between gap-x-6 gap-y-1 p-4 hover:border-navy/40">
                      <span className="min-w-0">
                        <span className="block text-[1.0625rem] text-navy">{p.name}</span>
                        <span className="block text-[0.875rem] text-ink-muted">{p.customerName ?? "No customer"} · updated {dateFmt.format(new Date(p.updatedAt))}</span>
                      </span>
                      <span className="data text-[0.875rem] text-navy">{p.rooms.length} {p.rooms.length === 1 ? "room" : "rooms"}{area > 0 ? ` · ${area} m²` : ""}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section id="new" aria-labelledby="new-heading" className="card scroll-mt-24 p-5 sm:p-6">
          <h2 id="new-heading" className="text-display-sm text-navy">New Project</h2>
          {customers.length === 0 && (
            <p className="mt-2 text-[0.875rem] text-ink-muted">
              <Link href="/trade/account/customers" className="underline underline-offset-4">Add a customer</Link> first, or start without one.
            </p>
          )}
          <div className="mt-6"><ProjectForm values={{ customerId: preselect }} customers={customers} /></div>
        </section>
      </div>
    </TradeShell>
  );
}
