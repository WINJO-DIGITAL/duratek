import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { CopyLink } from "@/components/trade/copy-link";
import { ShortlistForm } from "@/components/trade/shortlist-form";
import { CustomerModeBlocked, TradeShell, TradeSkeleton } from "@/components/trade/trade-shell";
import { byTone, getFinishes, grainImage } from "@/lib/catalogue";
import { measureLine } from "@/lib/catalogue/format";
import { requireApprovedTrade } from "@/lib/auth/trade";
import { siteUrl } from "@/lib/site";
import { userSupabase } from "@/lib/supabase/server";
import { deleteShortlist } from "./actions";

export const metadata: Metadata = { title: "Shortlists", robots: { index: false } };

export default function ShortlistsPage({ searchParams }: PageProps<"/trade/account/shortlists">) {
  return (
    <PageTransition>
      <Suspense fallback={<TradeSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/trade/account/shortlists">["searchParams"] }) {
  const { account, customerView } = await requireApprovedTrade("/trade/account/shortlists");
  if (customerView) {
    return (
      <TradeShell account={account} customerView current="/trade/account/shortlists" back="/trade/account/shortlists" title="Shortlists">
        <CustomerModeBlocked back="/trade/account/shortlists" />
      </TradeShell>
    );
  }
  const db = await userSupabase();
  const [finishes, lists, sp] = await Promise.all([
    getFinishes().then(byTone),
    db.from("shortlists").select("id, name, token, finish_ids, created_at").order("created_at", { ascending: false }),
    searchParams,
  ]);
  const byId = new Map(finishes.map((f) => [f.id, f]));

  return (
    <TradeShell
      account={account}
      customerView={customerView}
      current="/trade/account/shortlists"
      back="/trade/account/shortlists"
      title="Shortlists"
      intro={<p>Pick finishes for a customer and send them one clean link. Shortlists never show prices.</p>}
    >
      {sp.notice === "deleted" && <p role="status" className="notice mb-6 max-w-xl px-4 py-3 text-[0.9375rem] text-navy">Shortlist deleted.</p>}
      <div className="grid gap-10 lg:grid-cols-[1fr_30rem] lg:items-start">
        <section aria-labelledby="lists-heading">
          <h2 id="lists-heading" className="text-display-sm text-navy">Your Shortlists</h2>
          {(lists.data ?? []).length === 0 ? (
            <p className="mt-4 text-ink-muted">None yet.</p>
          ) : (
            <ul className="mt-6 space-y-3">
              {(lists.data ?? []).map((l) => (
                <li key={l.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[1.0625rem] text-navy">{l.name}</p>
                      <p className="mt-1 text-[0.875rem] text-ink-muted">
                        {l.finish_ids.map((id) => byId.get(id)?.name).filter(Boolean).join(", ") || "No finishes still in the range"}
                      </p>
                    </div>
                    <form action={deleteShortlist}>
                      <input type="hidden" name="id" value={l.id} />
                      <button type="submit" className="min-h-tap text-[0.875rem] text-ink-muted underline underline-offset-4 hover:text-error">
                        Delete<span className="sr-only"> {l.name}</span>
                      </button>
                    </form>
                  </div>
                  <div className="mt-4">
                    <CopyLink url={siteUrl(`/s/${l.token}`)} label={`Link to ${l.name}`} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="new-list-heading" className="card p-5 sm:p-6">
          <h2 id="new-list-heading" className="text-display-sm text-navy">New Shortlist</h2>
          <div className="mt-6">
            <ShortlistForm
              options={finishes.map((f) => ({ id: f.id, name: f.name, detail: measureLine(f.specs), swatch: grainImage(f)?.src }))}
            />
          </div>
        </section>
      </div>
    </TradeShell>
  );
}
