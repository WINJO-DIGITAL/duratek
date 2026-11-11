import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { ProjectForm, RoomForm } from "@/components/trade/portal-forms";
import { QuoteStatusChip } from "@/components/trade/quote-status";
import { CustomerModeBlocked, TradeShell, TradeSkeleton } from "@/components/trade/trade-shell";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@/components/ui/icons";
import { byTone, getFinishes } from "@/lib/catalogue";
import { requireApprovedTrade } from "@/lib/auth/trade";
import { formatPence } from "@/lib/money";
import { packsPrice } from "@/lib/pricing";
import { getProject, listCustomers, roomPlan } from "@/lib/trade/portal";
import { getPreferences } from "@/lib/trade/preferences";
import { getTradePrices } from "@/lib/trade/prices";
import { listQuotes } from "@/lib/trade/quotes";
import { archiveProject, deleteRoom, quoteFromProject } from "../actions";

export const metadata: Metadata = { title: "Project", robots: { index: false } };

export default function ProjectPage({ params, searchParams }: PageProps<"/trade/account/projects/[id]">) {
  return (
    <PageTransition>
      <Suspense fallback={<TradeSkeleton />}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}

const NOTICE: Record<string, string> = {
  created: "Project created. Add the rooms you measured.",
  "no-rooms": "Add a room with a finish and its measurements first.",
  "no-price": "One of the finishes has no trade price on your account yet. Add it to a quote by hand with your own price.",
  "no-coverage": "One of the finishes has no pack size on record yet.",
  "quote-failed": "The quote couldn’t be created. Please try again.",
  confirm: "Tick the box to confirm.",
};

async function Content({ params, searchParams }: { params: PageProps<"/trade/account/projects/[id]">["params"]; searchParams: PageProps<"/trade/account/projects/[id]">["searchParams"] }) {
  const { id } = await params;
  const { account, customerView } = await requireApprovedTrade(`/trade/account/projects/${id}`);
  const back = `/trade/account/projects/${id}`;
  if (customerView) return <TradeShell account={account} customerView current="/trade/account/projects" back={back} title="Project"><CustomerModeBlocked back={back} /></TradeShell>;

  const [project, finishes, prices, prefs, customers, quotes, sp] = await Promise.all([
    getProject(id),
    getFinishes().then(byTone),
    getTradePrices(account),
    getPreferences(),
    listCustomers(),
    listQuotes(),
    searchParams,
  ]);
  if (!project) notFound();
  const notice = NOTICE[String(sp.notice ?? "")];
  const byId = new Map(finishes.map((f) => [f.id, f]));
  const finishOptions = finishes.filter((f) => f.specs.pack_coverage_m2).map((f) => ({ id: f.id, label: `${f.name} · ${f.specs.pack_coverage_m2} m²/pack` }));
  const theirQuotes = quotes.filter((q) => q.projectId === project.id);

  const rows = project.rooms.map((room) => {
    const finish = room.finishId ? byId.get(room.finishId) : undefined;
    const plan = roomPlan(room, finish?.specs.pack_coverage_m2);
    const buy = finish ? prices.get(finish.id)?.pence : undefined;
    const cost = plan && buy !== undefined && finish?.specs.pack_coverage_m2 ? packsPrice(plan.packs, finish.specs.pack_coverage_m2, buy) : undefined;
    const rrp = plan && finish?.rrpPence !== undefined && finish.specs.pack_coverage_m2 ? packsPrice(plan.packs, finish.specs.pack_coverage_m2, finish.rrpPence) : undefined;
    return { room, finish, plan, cost, rrp };
  });
  const sum = (k: "cost" | "rrp") => rows.reduce((s, r) => s + (r[k] ?? 0), 0);
  const totalArea = rows.reduce((s, r) => s + (r.room.areaM2 ?? 0), 0);
  const totalPacks = rows.reduce((s, r) => s + (r.plan?.packs ?? 0), 0);

  return (
    <TradeShell account={account} customerView={false} current="/trade/account/projects" back={back} title={project.name}>
      <div className="-mt-4 mb-6 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link href="/trade/account/projects" className="nav-link gap-2"><ArrowLeft size={16} /> All projects</Link>
        {project.customerId && <Link href={`/trade/account/customers/${project.customerId}`} className="text-[0.9375rem] text-navy underline decoration-green underline-offset-4">{project.customerName}</Link>}
      </div>
      {notice && <p role="status" className="notice mb-6 max-w-2xl px-4 py-3 text-[0.9375rem] text-navy">{notice}</p>}

      <section aria-labelledby="rooms-heading">
        <h2 id="rooms-heading" className="text-display-sm text-navy">Rooms</h2>
        {rows.length === 0 ? (
          <p className="mt-4 text-ink-muted">No rooms yet.</p>
        ) : (
          <div className="card relative mt-6 overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-left">
              <caption className="sr-only">Rooms, measurements, packs and material cost</caption>
              <thead>
                <tr className="border-b border-line text-[0.8125rem] text-ink-muted">
                  <th scope="col" className="px-4 py-3 font-medium">Room</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Size</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Area</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">With wastage</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Packs</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Your cost</th>
                  <th scope="col" className="px-3 py-3"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ room, finish, plan, cost }) => (
                  <tr key={room.id} className="border-b border-line align-top last:border-b-0">
                    <th scope="row" className="px-4 py-3 font-normal">
                      <span className="block text-navy">{room.name}</span>
                      <span className="block text-[0.8125rem] text-ink-muted">{finish?.name ?? "No finish chosen"}</span>
                    </th>
                    <td className="data px-3 py-3 text-right text-[0.9375rem] text-navy">{room.lengthM && room.widthM ? `${room.lengthM} × ${room.widthM} m` : "—"}</td>
                    <td className="data px-3 py-3 text-right text-[0.9375rem] text-navy">{room.areaM2 ? `${room.areaM2} m²` : "—"}</td>
                    <td className="data px-3 py-3 text-right text-[0.9375rem] text-navy">{plan ? `${plan.areaWithWastageM2} m² (+${room.wastagePct}%)` : `+${room.wastagePct}%`}</td>
                    <td className="data px-3 py-3 text-right text-[0.9375rem] text-navy">{plan ? `${plan.packs} (${plan.suppliedM2} m²)` : "—"}</td>
                    <td className="data px-3 py-3 text-right text-[0.9375rem] text-navy">{cost !== undefined ? formatPence(cost) : "—"}</td>
                    <td className="px-3 py-1 text-right">
                      <form action={deleteRoom}>
                        <input type="hidden" name="project_id" value={project.id} />
                        <input type="hidden" name="room_id" value={room.id} />
                        <button type="submit" className="min-h-tap text-[0.875rem] text-ink-muted underline underline-offset-4 hover:text-error">Remove<span className="sr-only"> {room.name}</span></button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line text-navy">
                  <th scope="row" className="px-4 py-3 text-left font-medium">Total</th>
                  <td />
                  <td className="data px-3 py-3 text-right">{Math.round(totalArea * 100) / 100} m²</td>
                  <td />
                  <td className="data px-3 py-3 text-right">{totalPacks}</td>
                  <td className="data px-3 py-3 text-right font-medium">{formatPence(sum("cost"))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {rows.length > 0 && (
          <p className="mt-3 max-w-[70ch] text-[0.8125rem] text-ink-muted">
            How this is worked out: area = length × width. Packs = area plus wastage, divided by the finish’s pack coverage, always rounded up. Your cost is whole packs at your trade price before VAT{sum("rrp") > 0 ? `; at RRP the flooring would be ${formatPence(sum("rrp"))} inc VAT` : ""}. The quote prices packs again on the server, including any volume price.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <form action={quoteFromProject}>
            <input type="hidden" name="id" value={project.id} />
            <Button type="submit" arrow disabled={!rows.some((r) => r.plan)}>Create a quote from this project</Button>
          </form>
          <p className="text-[0.875rem] text-ink-muted">
            Flooring for every room{prefs.labour_per_m2_pence ? `, and fitting at your rate of ${formatPence(prefs.labour_per_m2_pence)} per m²` : ""}. Then add trims, adhesives, delivery and more.
          </p>
        </div>
      </section>

      <div className="mt-stack grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="add-room-heading" className="card p-5 sm:p-6">
          <h2 id="add-room-heading" className="text-display-sm text-navy">Add a Room</h2>
          <div className="mt-6"><RoomForm projectId={project.id} values={{}} finishes={finishOptions} defaultWastage={prefs.default_wastage_pct} /></div>
        </section>
        <section aria-labelledby="details-heading" className="card p-5 sm:p-6">
          <h2 id="details-heading" className="text-display-sm text-navy">Project Details</h2>
          <div className="mt-6"><ProjectForm values={project} customers={customers} /></div>
        </section>
      </div>

      {rows.length > 0 && (
        <section aria-labelledby="edit-rooms-heading" className="mt-stack">
          <h2 id="edit-rooms-heading" className="text-display-sm text-navy">Edit Rooms</h2>
          <ul className="mt-6 grid gap-4 lg:grid-cols-2">
            {project.rooms.map((r) => (
              <li key={r.id}>
                <details className="card p-5">
                  <summary className="min-h-tap cursor-pointer py-2 text-navy">{r.name}</summary>
                  <div className="mt-4"><RoomForm projectId={project.id} values={{ id: r.id, name: r.name, lengthM: r.lengthM, widthM: r.widthM, wastagePct: r.wastagePct, finishId: r.finishId }} finishes={finishOptions} defaultWastage={prefs.default_wastage_pct} /></div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="quotes-heading" className="mt-stack">
        <h2 id="quotes-heading" className="text-display-sm text-navy">Quotes for This Project</h2>
        {theirQuotes.length === 0 ? <p className="mt-4 text-ink-muted">None yet.</p> : (
          <ul className="mt-4 space-y-2">
            {theirQuotes.map((q) => (
              <li key={q.id}><Link href={`/trade/account/quotes/${q.id}`} className="card flex items-center justify-between gap-4 p-4 hover:border-navy/40"><span className="data text-navy">{q.reference}</span><span className="flex items-center gap-3"><span className="data text-navy">{formatPence(q.totals.totalPence)}</span><QuoteStatusChip status={q.status} /></span></Link></li>
            ))}
          </ul>
        )}
      </section>

      <form action={archiveProject} className="mt-stack flex flex-wrap items-center gap-x-4 border-t border-line pt-6">
        <input type="hidden" name="id" value={project.id} />
        <label className="flex min-h-tap items-center gap-2 text-[0.9375rem] text-ink-muted"><input type="checkbox" name="confirm" value="yes" className="size-5 accent-green-ink" />Archive this project</label>
        <Button type="submit" variant="quiet">Archive</Button>
      </form>
    </TradeShell>
  );
}
