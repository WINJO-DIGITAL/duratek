import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { TradeShell, TradeSkeleton } from "@/components/trade/trade-shell";
import { getFinishes } from "@/lib/catalogue";
import { requireApprovedTrade } from "@/lib/auth/trade";
import { DOCUMENT_TYPES } from "@/lib/documents";
import { userSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Documents", robots: { index: false } };

export default function DocumentsPage() {
  return (
    <PageTransition>
      <Suspense fallback={<TradeSkeleton />}>
        <Content />
      </Suspense>
    </PageTransition>
  );
}

async function Content() {
  const { account, customerView } = await requireApprovedTrade("/trade/account/documents");
  const db = await userSupabase();
  const [docs, finishes] = await Promise.all([
    db.from("documents").select("id, title, type, finish_id, trade_only").order("title"),
    getFinishes(),
  ]);
  const finishName = new Map(finishes.map((f) => [f.id, f.name]));
  const rows = docs.data ?? [];

  return (
    <TradeShell
      account={account}
      customerView={customerView}
      current="/trade/account/documents"
      back="/trade/account/documents"
      title="Documents"
      intro={<p>Technical sheets, fitting guides, warranty documents and certificates. Links open for a minute at a time.</p>}
    >
      {rows.length === 0 ? (
        <p className="notice max-w-xl px-5 py-4 text-navy">No documents have been added yet. Ask us if you need something specific.</p>
      ) : (
        <div className="space-y-10">
          {DOCUMENT_TYPES.map((t) => {
            const group = rows.filter((d) => d.type === t.value);
            if (group.length === 0) return null;
            return (
              <section key={t.value} aria-labelledby={`docs-${t.value}`}>
                <h2 id={`docs-${t.value}`} className="eyebrow font-sans">{t.label}</h2>
                <ul className="card mt-4 divide-y divide-line">
                  {group.map((d) => (
                    <li key={d.id}>
                      <a href={`/documents/${d.id}`} className="flex min-h-tap flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-3 hover:bg-cream/60">
                        <span className="text-navy underline decoration-green underline-offset-4">{d.title}</span>
                        <span className="text-[0.8125rem] text-ink-muted">
                          {[d.finish_id ? finishName.get(d.finish_id) : "All finishes", d.trade_only ? "Trade only" : "Public", "PDF"].filter(Boolean).join(" · ")}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </TradeShell>
  );
}
