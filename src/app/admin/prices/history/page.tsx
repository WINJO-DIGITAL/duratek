import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { ArrowLeft } from "@/components/ui/icons";
import { requireAdmin } from "@/lib/auth/admin";
import { formatPence } from "@/lib/money";
import { userSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Price history", robots: { index: false } };

export default function PriceHistoryPage() {
  return (
    <PageTransition>
      <Suspense fallback={<div aria-busy="true" className="container-page h-96 animate-pulse py-16" />}>
        <Content />
      </Suspense>
    </PageTransition>
  );
}

const dateTime = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
const dateOnly = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
const ACTION: Record<string, string> = { insert: "Added", update: "Changed", delete: "Removed" };

async function Content() {
  await requireAdmin("manage_pricing", "/admin/prices/history");
  const db = await userSupabase();
  const { data, error } = await db.rpc("price_history", { p_limit: 300 });
  const rows = data ?? [];

  return (
    <AdminShell current="/admin/prices" title="Price history" intro="Every price added, changed or removed, newest first: who did it and when. Scheduled prices show when they start and end.">
      <Link href="/admin/prices" className="nav-link -mt-4 mb-6 gap-2">
        <ArrowLeft size={16} /> Prices
      </Link>
      {error ? (
        <p className="text-error">Couldn’t load the history. Please try again.</p>
      ) : rows.length === 0 ? (
        <p className="text-ink-muted">No price changes recorded yet.</p>
      ) : (
        <div className="card relative overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-left text-[0.9375rem]">
            <caption className="sr-only">Price changes</caption>
            <thead>
              <tr className="border-b border-line text-[0.8125rem] text-ink-muted">
                <th scope="col" className="px-4 py-3 font-medium">When</th>
                <th scope="col" className="px-4 py-3 font-medium">Who</th>
                <th scope="col" className="px-4 py-3 font-medium">What</th>
                <th scope="col" className="px-4 py-3 font-medium">List</th>
                <th scope="col" className="px-4 py-3 font-medium">Product</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Was</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Now</th>
                <th scope="col" className="px-4 py-3 font-medium">Runs</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-line last:border-b-0">
                  <td className="data whitespace-nowrap px-4 py-3 text-[0.8125rem] text-ink-muted">{dateTime.format(new Date(r.occurred_at))}</td>
                  <td className="px-4 py-3 text-navy">{r.actor}</td>
                  <td className="px-4 py-3 text-navy">{ACTION[r.action] ?? r.action}</td>
                  <td className="px-4 py-3 text-navy">{r.list_name ?? "—"}</td>
                  <td className="data px-4 py-3 text-[0.8125rem] text-navy">{r.sku ?? "—"}</td>
                  <td className="data px-4 py-3 text-right text-navy">{r.old_pence === null ? "—" : formatPence(r.old_pence)}</td>
                  <td className="data px-4 py-3 text-right text-navy">{r.new_pence === null ? "—" : formatPence(r.new_pence)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-[0.8125rem] text-ink-muted">
                    {r.valid_from ? `from ${dateOnly.format(new Date(r.valid_from))}` : "now"}
                    {r.valid_to ? ` until ${dateOnly.format(new Date(r.valid_to))}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
