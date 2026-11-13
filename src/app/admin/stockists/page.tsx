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
  await requireAdmin("manage_stockists", "/admin/stockists");
  const notice = NOTICE[String((await searchParams).notice ?? "")];
  const db = await userSupabase();
  const [stockists, retailers, priv, range, finishes, lists] = await Promise.all([
    db.from("stockists").select("*").order("published", { ascending: false }).order("name"),
    db.from("online_retailers").select("*").order("sort_order"),
    db.from("stockist_private").select("*"),
    db.from("stockist_products").select("stockist_id, finish_id"),
    db.from("finishes").select("id, name").is("archived_at", null).order("sort_order"),
    db.from("price_lists").select("id, name").in("kind", ["stockist", "trade"]).order("name"),
  ]);
  const privBy = new Map((priv.data ?? []).map((r) => [r.stockist_id, r]));
  const rangeBy = new Map<string, string[]>();
  for (const r of range.data ?? []) rangeBy.set(r.stockist_id, [...(rangeBy.get(r.stockist_id) ?? []), r.finish_id]);
  const finishList = finishes.data ?? [];
  const priceLists = lists.data ?? [];

  return (
    <AdminShell
      current="/admin/stockists"
      title="Where to buy"
      intro="A stockist appears in postcode search once it is verified and published. Their location comes from the postcode when you save. Online retailers appear in their own block."
    >
      {notice && <p role="status" className="notice mb-6 max-w-xl px-4 py-3 text-[0.9375rem] text-navy">{notice}</p>}

      <section aria-labelledby="add-heading" className="card p-5 sm:p-6">
        <h2 id="add-heading" className="text-display-sm text-navy">Add a Stockist</h2>
        <p className="mt-2 max-w-[60ch] text-[0.9375rem] text-navy/75">
          Adding a stockist, for example Dave&rsquo;s Tiles, starts as a draft. Enter only details the business has confirmed, then tick Verified to publish. Nothing about a stockist is invented or shown until you do.
        </p>
        <div className="mt-6">
          <StockistForm values={{}} finishes={finishList} priceLists={priceLists} />
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
                      <span className={s.published ? "text-green-ink" : "text-ink-muted"}>
                        {s.published ? "Live" : s.verified_at ? "Verified, hidden" : "Draft, not verified"}
                      </span>
                      <span aria-hidden="true" className="text-ink-muted group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <div className="mt-5">
                    <StockistForm values={{ ...s, private: privBy.get(s.id) ?? undefined, finishIds: rangeBy.get(s.id) ?? [] }} finishes={finishList} priceLists={priceLists} />
                    <DeleteForm id={s.id} label={s.name} action={deleteStockist} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="retailers-heading" className="mt-stack">
        <h2 id="retailers-heading" className="text-display-sm text-navy">Online Retailers</h2>
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
