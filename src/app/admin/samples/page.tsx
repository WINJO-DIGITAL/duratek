import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { Button } from "@/components/ui/button";
import { getFinishes } from "@/lib/catalogue";
import { requireAdmin } from "@/lib/auth/admin";
import { cn } from "@/lib/cn";
import { emailConfigured } from "@/lib/email";
import { userSupabase } from "@/lib/supabase/server";
import { setSampleAvailability, updateSample } from "./actions";

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
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
] as const;

const NOTICE: Record<string, string> = {
  sent: "Marked sent.",
  "sent-emailed": "Marked sent, and the customer has been emailed.",
  "sent-no-email": "Marked sent. No email provider is set up, so the customer was not emailed.",
  "sent-email-failed": "Marked sent, but the email to the customer failed. It is in the email log.",
  saved: "Saved.",
  availability: "Sample availability updated.",
  invalid: "Check the dispatch details and try again.",
  error: "Couldn't save. Please try again.",
};

const STATUS_LABEL: Record<string, string> = { new: "To send", processing: "Packing", sent: "Sent", cancelled: "Cancelled" };
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

async function Content({ searchParams }: { searchParams: PageProps<"/admin/samples">["searchParams"] }) {
  await requireAdmin("manage_samples", "/admin/samples");
  const sp = await searchParams;
  const raw = String(sp.filter ?? "new");
  const filter = FILTERS.some((f) => f.value === raw) ? raw : "new";
  const notice = NOTICE[String(sp.notice ?? "")];
  const db = await userSupabase();
  let q = db.from("sample_requests").select("*").order("created_at", { ascending: filter === "new" }).limit(500);
  if (filter === "new") q = q.in("status", ["new", "processing"]);
  else if (filter !== "all") q = q.eq("status", filter as "sent" | "cancelled");
  const [{ data }, finishes, avail] = await Promise.all([q, getFinishes(), db.from("finishes").select("id, name, sample_available, published").is("archived_at", null).order("sort_order")]);
  const name = new Map(finishes.map((f) => [f.id, f.name]));
  const outOfStock = new Set((avail.data ?? []).filter((f) => !f.sample_available).map((f) => f.id));
  const rows = data ?? [];
  const canEmail = emailConfigured();

  return (
    <AdminShell
      current="/admin/samples"
      title="Sample requests"
      intro="Oldest first, so nobody waits. Free samples are never charged for. Personal details are visible only to you, and are anonymised after the retention period in Settings."
    >
      {notice && <p role="status" className="notice mb-6 max-w-xl px-4 py-3 text-[0.9375rem] text-navy">{notice}</p>}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Filter" className="flex flex-wrap gap-2">
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
                  <p className="text-[1.0625rem] text-navy">
                    {r.name} <span className="ml-2 rounded-control border border-line px-2 py-0.5 text-[0.75rem] text-ink-muted">{STATUS_LABEL[r.status] ?? r.status}</span>
                  </p>
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
                        {outOfStock.has(id) && <span className="ml-1 text-error">(out of stock)</span>}
                      </li>
                    ))}
                  </ul>
                  {r.status === "sent" && (
                    <p className="mt-3 text-[0.875rem] text-ink-muted">
                      {[r.carrier, r.tracking_ref && `Tracking ${r.tracking_ref}`, r.dispatch_note].filter(Boolean).join(" · ") || "No dispatch details recorded"}
                      {r.customer_notified_at ? " · customer emailed" : ""}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="data text-[0.8125rem] text-ink-muted">{dateFmt.format(new Date(r.created_at))}</p>
                  {r.sent_at && <p className="mt-1 text-[0.8125rem] text-green-ink">Sent {dateFmt.format(new Date(r.sent_at))}</p>}
                </div>
              </div>

              {(r.status === "new" || r.status === "processing") && (
                <form action={updateSample} className="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_1fr_2fr]">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="filter" value={filter} />
                  <label className="text-[0.8125rem] text-ink-muted">
                    Carrier
                    <input name="carrier" maxLength={80} placeholder="Royal Mail" className="mt-1 min-h-tap w-full rounded-control border border-navy/25 bg-white px-3 text-[0.9375rem] text-navy" />
                  </label>
                  <label className="text-[0.8125rem] text-ink-muted">
                    Tracking reference
                    <input name="tracking_ref" maxLength={120} className="mt-1 min-h-tap w-full rounded-control border border-navy/25 bg-white px-3 text-[0.9375rem] text-navy" />
                  </label>
                  <label className="text-[0.8125rem] text-ink-muted">
                    Note for the customer or yourself
                    <input name="dispatch_note" maxLength={500} className="mt-1 min-h-tap w-full rounded-control border border-navy/25 bg-white px-3 text-[0.9375rem] text-navy" />
                  </label>
                  <label className="flex min-h-tap items-center gap-2 text-[0.875rem] text-navy sm:col-span-3">
                    <input type="checkbox" name="notify_customer" defaultChecked={canEmail} className="size-5 accent-green-ink" />
                    Email the customer that their samples are on the way
                    {!canEmail && <span className="text-ink-muted">(no email provider is set up, so nothing would be sent)</span>}
                  </label>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:col-span-3">
                    <Button type="submit" name="intent" value="sent">Mark sent</Button>
                    {r.status === "new" && (
                      <Button type="submit" name="intent" value="processing" variant="outline">Start packing</Button>
                    )}
                    <Button type="submit" name="intent" value="cancelled" variant="quiet">Cancel request</Button>
                  </div>
                </form>
              )}
              {(r.status === "sent" || r.status === "cancelled") && (
                <form action={updateSample} className="mt-4 border-t border-line pt-3">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="filter" value={filter} />
                  <Button type="submit" name="intent" value="reopen" variant="quiet">
                    {r.status === "sent" ? "Mark not sent" : "Put back in the queue"}
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      <section id="availability" aria-labelledby="avail-heading" className="mt-stack scroll-mt-24">
        <h2 id="avail-heading" className="text-display-sm text-navy">Sample availability</h2>
        <p className="mt-2 max-w-[60ch] text-[0.9375rem] text-navy/75">
          Mark a finish out of stock when you have no samples to send. It stops being offered as a free sample, on the site and when a request is submitted.
        </p>
        <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(avail.data ?? []).map((f) => (
            <li key={f.id} className="card flex items-center justify-between gap-3 p-4">
              <span className="text-navy">
                {f.name}
                <span className={cn("block text-[0.8125rem]", f.sample_available ? "text-green-ink" : "text-error")}>{f.sample_available ? "Samples available" : "Out of stock"}</span>
              </span>
              <form action={setSampleAvailability}>
                <input type="hidden" name="finish_id" value={f.id} />
                <input type="hidden" name="filter" value={filter} />
                <input type="hidden" name="available" value={f.sample_available ? "no" : "yes"} />
                <Button type="submit" variant="quiet">{f.sample_available ? "Mark out of stock" : "Mark available"}</Button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </AdminShell>
  );
}
