import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { getFinishes } from "@/lib/catalogue";
import { redirect } from "next/navigation";
import { adminAreasFor, requireAdmin } from "@/lib/auth/admin";
import { allows } from "@/lib/auth/permissions";
import { getAccount } from "@/lib/auth/session";
import { userSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Owner admin", robots: { index: false } };

export default function AdminOverviewPage() {
  return (
    <PageTransition>
      <Suspense fallback={<div aria-busy="true" className="container-page h-96 animate-pulse py-16" />}>
        <Content />
      </Suspense>
    </PageTransition>
  );
}

interface Stats {
  accounts: { pending: number; approved: number; rejected: number; new_30d: number };
  samples: { new: number; sent: number; last_30d: number; marketing_opt_in_30d: number };
  samples_by_finish_90d: { finish_id: string; count: number }[];
  samples_by_week: { week: string; count: number }[];
  quotes: { draft: number; sent: number; accepted: number; declined: number; last_30d: number };
  quoted_m2_by_finish_90d: { finish_id: string; m2: number; quotes: number }[];
  shortlists: number;
  stockists: { published: number; total: number };
  documents: number;
}

const weekFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

async function Content() {
  const account = await getAccount();
  if (!account) redirect("/trade/login?next=/admin");
  if (!allows(account, "view_reports")) {
    // Administrators without reports start on the first screen they may open.
    const first = adminAreasFor(account)[0];
    if (first) redirect(first.href);
  }
  await requireAdmin("view_reports", "/admin");
  const db = await userSupabase();
  const [{ data, error }, finishes] = await Promise.all([db.rpc("admin_dashboard_stats"), getFinishes()]);
  const name = new Map(finishes.map((f) => [f.id, f.name]));
  if (error || !data) {
    return (
      <AdminShell current="/admin" title="Overview" intro="What needs you, and what customers are asking for.">
        <p className="notice max-w-xl px-5 py-4 text-navy">The figures couldn’t be loaded. Has the latest database migration been applied?</p>
      </AdminShell>
    );
  }
  const s = data as unknown as Stats;
  const quotesSent = s.quotes.sent + s.quotes.accepted + s.quotes.declined;
  const winRate = s.quotes.accepted + s.quotes.declined > 0 ? Math.round((s.quotes.accepted / (s.quotes.accepted + s.quotes.declined)) * 100) : null;
  const maxSamples = Math.max(1, ...s.samples_by_finish_90d.map((x) => x.count));
  const maxM2 = Math.max(1, ...s.quoted_m2_by_finish_90d.map((x) => Number(x.m2)));
  const weeks = lastWeeks(12, s.samples_by_week);
  const maxWeek = Math.max(1, ...weeks.map((w) => w.count));

  return (
    <AdminShell current="/admin" title="Overview" intro="What needs you, and what customers are asking for.">
      <section aria-labelledby="todo-heading">
        <h2 id="todo-heading" className="sr-only">Waiting for you</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          <Todo href="/admin/accounts" count={s.accounts.pending} one="trade application waiting" many="trade applications waiting" />
          <Todo href="/admin/samples" count={s.samples.new} one="sample request to send" many="sample requests to send" />
          <Todo href="/admin/stockists" count={s.stockists.total - s.stockists.published} one="stockist not published" many="stockists not published" />
        </ul>
      </section>

      <section aria-labelledby="figures-heading" className="mt-stack">
        <h2 id="figures-heading" className="text-display-sm text-navy">Last 30 days</h2>
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
          <Figure label="Sample requests" value={s.samples.last_30d} note={`${s.samples.marketing_opt_in_30d} opted in to marketing`} />
          <Figure label="New trade applications" value={s.accounts.new_30d} note={`${s.accounts.approved} approved accounts in all`} />
          <Figure label="Trade quotes started" value={s.quotes.last_30d} note={`${quotesSent} sent to customers in all`} />
          <Figure label="Quote win rate" value={winRate === null ? "—" : `${winRate}%`} note={`${s.quotes.accepted} accepted, ${s.quotes.declined} declined`} />
        </dl>
      </section>

      <section aria-labelledby="weeks-heading" className="mt-stack">
        <h2 id="weeks-heading" className="text-display-sm text-navy">Sample requests by week</h2>
        <ol className="mt-6 flex h-44 items-end gap-2 border-b border-line sm:gap-4" aria-label="Sample requests per week, last 12 weeks">
          {weeks.map((w, i) => (
            <li key={w.week} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              <span className="data text-[0.75rem] text-navy">{w.count > 0 ? w.count : ""}</span>
              <span
                className="mt-1 block w-full max-w-8 rounded-t-[3px] bg-navy/80"
                style={{ height: `${w.count === 0 ? 0 : Math.max(4, (w.count / maxWeek) * 100)}%` }}
              />
              <span className={`mt-2 block truncate text-[0.6875rem] text-ink-muted ${i % 2 ? "max-sm:invisible" : ""}`}>{weekFmt.format(new Date(w.week))}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-stack grid gap-10 lg:grid-cols-2">
        <Ranking
          id="samples-rank"
          title="Most sampled finishes, 90 days"
          empty="No sample requests yet."
          rows={s.samples_by_finish_90d.map((x) => ({ label: name.get(x.finish_id) ?? "Finish no longer published", value: x.count, share: x.count / maxSamples, text: `${x.count}` }))}
        />
        <Ranking
          id="quotes-rank"
          title="Most quoted by trade, 90 days (m²)"
          empty="No trade quotes yet."
          rows={s.quoted_m2_by_finish_90d.map((x) => ({
            label: name.get(x.finish_id) ?? "Finish no longer published",
            value: Number(x.m2),
            share: Number(x.m2) / maxM2,
            text: `${Number(x.m2).toLocaleString("en-GB")} m² · ${x.quotes} ${x.quotes === 1 ? "quote" : "quotes"}`,
          }))}
        />
      </div>

      <p className="mt-stack max-w-[70ch] text-[0.875rem] text-ink-muted">
        Traders’ quotes are private to them: you see counts and the area of each finish quoted, never their prices, margins or customers.
        {s.shortlists > 0 && ` Traders have made ${s.shortlists} ${s.shortlists === 1 ? "shortlist" : "shortlists"}.`}{" "}
        {s.documents === 0 ? "No documents have been uploaded yet." : `${s.documents} ${s.documents === 1 ? "document is" : "documents are"} available.`}
      </p>
    </AdminShell>
  );
}

/** The last n weeks (Monday starts, as Postgres date_trunc counts them), with empty weeks as zero. */
function lastWeeks(n: number, data: { week: string; count: number }[]): { week: string; count: number }[] {
  const counts = new Map(data.map((d) => [d.week.slice(0, 10), d.count]));
  const now = new Date();
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((now.getUTCDay() + 6) % 7)));
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() - 7 * (n - 1 - i));
    const key = d.toISOString().slice(0, 10);
    return { week: key, count: counts.get(key) ?? 0 };
  });
}

function Todo({ href, count, one, many }: { href: string; count: number; one: string; many: string }) {
  return (
    <li>
      <Link href={href} className="card flex min-h-24 items-center gap-4 p-5 transition-colors hover:border-navy/40">
        <span className={count > 0 ? "data text-[2rem] font-light text-green-ink" : "data text-[2rem] font-light text-ink-muted"}>{count}</span>
        <span className="text-[0.9375rem] text-navy">{count === 1 ? one : many}</span>
      </Link>
    </li>
  );
}

function Figure({ label, value, note }: { label: string; value: number | string; note: string }) {
  return (
    <div className="border-t border-line pt-4">
      <dt className="text-[0.875rem] text-ink-muted">{label}</dt>
      <dd className="data mt-2 text-[2rem] font-light leading-none text-navy">{value}</dd>
      <dd className="mt-2 text-[0.8125rem] text-ink-muted">{note}</dd>
    </div>
  );
}

function Ranking({ id, title, rows, empty }: { id: string; title: string; empty: string; rows: { label: string; value: number; share: number; text: string }[] }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-display-sm text-navy">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-ink-muted">{empty}</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.slice(0, 11).map((r) => (
            <li key={r.label}>
              <div className="flex items-baseline justify-between gap-4 text-[0.9375rem]">
                <span className="text-navy">{r.label}</span>
                <span className="data text-[0.875rem] text-ink-muted">{r.text}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-line">
                <div className="h-full rounded-full bg-navy" style={{ width: `${Math.max(2, r.share * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
