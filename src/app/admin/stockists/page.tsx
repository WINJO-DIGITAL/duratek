import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { RetailerForm, StockistForm } from "@/components/admin/stockist-forms";
import { PageTransition } from "@/components/layout/page-transition";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/admin";
import { userSupabase } from "@/lib/supabase/server";
import { STOCKIST_TYPE_LABELS } from "@/lib/where-to-buy";
import { deleteRetailer, deleteStockist } from "./actions";

export const metadata: Metadata = { title: "Where to buy", robots: { index: false } };

export default function AdminStockistsPage({ searchParams }: PageProps<"/admin/stockists">) {
  return (
    <PageTransition>
      <Suspense fallback={<div aria-busy="true" className="container-page h-96 animate-pulse py-16" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}

const NOTICE: Record<string, string> = {
  deleted: "Deleted.",
  confirm: "Tick the box to confirm deleting.",
};

function DeleteForm({ id, label, action }: { id: string; label: string; action: (form: FormData) => Promise<void> }) {
  return (
    <form action={action} className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3">
      <input type="hidden" name="id" value={id} />
      <label className="flex min-h-tap items-center gap-2 text-[0.875rem] text-ink-muted">
        <input type="checkbox" name="confirm" value="yes" className="size-4 accent-green-ink" />
        Delete {label} for good
      </label>
      <Button type="submit" variant="quiet">Delete</Button>
    </form>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/stockists">["searchParams"] }) {
  await requireAdmin("/admin/stockists");
  const notice = NOTICE[String((await searchParams).notice ?? "")];
  const db = await userSupabase();
  const [stockists, retailers] = await Promise.all([
    db.from("stockists").select("*").order("published", { ascending: false }).order("name"),
    db.from("online_retailers").select("*").order("sort_order"),
  ]);

  return (
    <AdminShell
      current="/admin/stockists"
      title="Where to buy"
      intro="Stockists appear in postcode search once published. Their location comes from the postcode when you save. Online retailers appear in their own block."
    >
      {notice && <p role="status" className="notice mb-6 max-w-xl px-4 py-3 text-[0.9375rem] text-navy">{notice}</p>}

      <section aria-labelledby="add-heading" className="card p-5 sm:p-6">
        <h2 id="add-heading" className="text-display-sm text-navy">Add a stockist</h2>
        <div className="mt-6">
          <StockistForm values={{ published: true }} />
        </div>
      </section>

      <section aria-labelledby="stockists-heading" className="mt-stack">
        <h2 id="stockists-heading" className="text-display-sm text-navy">Stockists</h2>
        {(stockists.data ?? []).length === 0 ? (
          <p className="mt-4 text-ink-muted">None yet. Until there are, Where to buy offers samples and the online retailers instead.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {(stockists.data ?? []).map((s) => (
              <li key={s.id}>
                <details className="card group p-5">
                  <summary className="flex min-h-tap cursor-pointer list-none flex-wrap items-center justify-between gap-x-6 gap-y-1 [&::-webkit-details-marker]:hidden">
                    <span>
                      <span className="text-navy">{s.name}</span>
                      <span className="ml-2 text-[0.875rem] text-ink-muted">
                        {STOCKIST_TYPE_LABELS[s.type]} · {s.postcode}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 text-[0.8125rem]">
                      {s.lat === null && <span className="text-error">No location</span>}
                      <span className={s.published ? "text-green-ink" : "text-ink-muted"}>{s.published ? "Published" : "Hidden"}</span>
                      <span aria-hidden="true" className="text-ink-muted group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <div className="mt-5">
                    <StockistForm values={s} />
                    <DeleteForm id={s.id} label={s.name} action={deleteStockist} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="retailers-heading" className="mt-stack">
        <h2 id="retailers-heading" className="text-display-sm text-navy">Online retailers</h2>
        <ul className="mt-6 space-y-3">
          {(retailers.data ?? []).map((r) => (
            <li key={r.id} className="card p-5">
              <RetailerForm values={r} />
              <DeleteForm id={r.id} label={r.name} action={deleteRetailer} />
            </li>
          ))}
          <li className="card p-5">
            <p className="mb-4 text-[0.9375rem] font-medium text-navy">Add an online retailer</p>
            <RetailerForm values={{}} />
          </li>
        </ul>
      </section>
    </AdminShell>
  );
}
