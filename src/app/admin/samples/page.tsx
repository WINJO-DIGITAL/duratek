import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { Button } from "@/components/ui/button";
import { getFinishes } from "@/lib/catalogue";
import { requireAdmin } from "@/lib/auth/admin";
import { cn } from "@/lib/cn";
import { userSupabase } from "@/lib/supabase/server";
import { setSampleStatus } from "./actions";

export const metadata: Metadata = { title: "Sample requests", robots: { index: false } };

export default function AdminSamplesPage({ searchParams }: PageProps<"/admin/samples">) {
  return (
    <PageTransition>
      <Suspense fallback={<div aria-busy="true" className="container-page h-96 animate-pulse py-16" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}

const FILTERS = [
  { value: "new", label: "To send" },
  { value: "sent", label: "Sent" },
  { value: "all", label: "All" },
] as const;

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

async function Content({ searchParams }: { searchParams: PageProps<"/admin/samples">["searchParams"] }) {
  await requireAdmin("/admin/samples");
  const raw = String((await searchParams).filter ?? "new");
  const filter = FILTERS.some((f) => f.value === raw) ? raw : "new";
  const db = await userSupabase();
  let q = db.from("sample_requests").select("*").order("created_at", { ascending: filter === "new" }).limit(500);
  if (filter !== "all") q = q.eq("status", filter as "new" | "sent");
  const [{ data }, finishes] = await Promise.all([q, getFinishes()]);
  const name = new Map(finishes.map((f) => [f.id, f.name]));
  const rows = data ?? [];

  return (
    <AdminShell
      current="/admin/samples"
      title="Sample requests"
      intro="Oldest first, so nobody waits. Mark each request sent once it’s in the post. Personal details are visible only to you."
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Filter" className="flex gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={`/admin/samples?filter=${f.value}`}
              aria-current={f.value === filter ? "page" : undefined}
              className={cn(
                "flex min-h-tap items-center rounded-control border px-4 text-[0.9375rem]",
                f.value === filter ? "border-green-ink text-green-ink" : "border-navy/20 text-navy hover:border-navy",
              )}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <a href="/admin/samples/export" className="min-h-tap py-3 text-[0.9375rem] text-navy underline decoration-green underline-offset-4">
          Download all as CSV
        </a>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-ink-muted">{filter === "new" ? "Nothing to send. All caught up." : "No requests here."}</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
                <div className="min-w-0">
                  <p className="text-[1.0625rem] text-navy">{r.name}</p>
                  <address className="mt-1 text-[0.9375rem] not-italic text-ink-muted">
                    {[r.address_line1, r.address_line2, r.town, r.postcode].filter(Boolean).join(", ")}
                  </address>
                  <p className="mt-1 break-words text-[0.9375rem] text-ink-muted">
                    {r.email}
                    {r.phone ? ` · ${r.phone}` : ""}
                    {r.marketing_opt_in ? " · happy to hear from us" : ""}
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {r.finish_ids.map((id) => (
                      <li key={id} className="rounded-control border border-line bg-white px-2.5 py-1 text-[0.875rem] text-navy">
                        {name.get(id) ?? "Finish no longer published"}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-right">
                  <p className="data text-[0.8125rem] text-ink-muted">{dateFmt.format(new Date(r.created_at))}</p>
                  {r.sent_at && <p className="mt-1 text-[0.8125rem] text-green-ink">Sent {dateFmt.format(new Date(r.sent_at))}</p>}
                  <form action={setSampleStatus} className="mt-3">
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="filter" value={filter} />
                    <input type="hidden" name="status" value={r.status === "new" ? "sent" : "new"} />
                    <Button type="submit" variant={r.status === "new" ? "primary" : "quiet"}>
                      {r.status === "new" ? "Mark sent" : "Mark not sent"}
                    </Button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
