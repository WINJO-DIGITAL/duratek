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
import { forwardEnquiry, updateEnquiry } from "./actions";

export const metadata: Metadata = { title: "Enquiries", robots: { index: false } };

export default function AdminEnquiriesPage({ searchParams }: PageProps<"/admin/enquiries">) {
  return (
    <PageTransition>
      <Suspense fallback={<div aria-busy="true" className="container-page h-96 animate-pulse py-16" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}

const FILTERS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "closed", label: "Closed" },
  { value: "spam", label: "Spam" },
  { value: "all", label: "All" },
] as const;

const NOTICE: Record<string, string> = {
  saved: "Saved.",
  forwarded: "Passed to the stockist by email.",
  already: "That enquiry has already been passed on.",
  "not-allowed": "That enquiry can't be passed on: the customer didn't agree, or it has no stockist.",
  "no-address": "That stockist has no enquiry address. Add one under Where to buy.",
  "no-email": "No email provider is set up, so nothing was sent. Contact the stockist yourself.",
  "email-failed": "The email didn't send. It is in the email log; try again or contact the stockist yourself.",
  error: "Couldn't save. Please try again.",
};

const KIND: Record<string, string> = { stockist: "For a stockist", product: "About a finish", contact: "General" };
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

async function Content({ searchParams }: { searchParams: PageProps<"/admin/enquiries">["searchParams"] }) {
  await requireAdmin("manage_stockists", "/admin/enquiries");
  const sp = await searchParams;
  const raw = String(sp.filter ?? "new");
  const filter = FILTERS.some((f) => f.value === raw) ? raw : "new";
  const notice = NOTICE[String(sp.notice ?? "")];
  const db = await userSupabase();
  let q = db.from("enquiries").select("*, stockists (name)").order("created_at", { ascending: filter === "new" }).limit(300);
  if (filter !== "all") q = q.eq("status", filter as "new" | "contacted" | "closed" | "spam");
  const [{ data }, finishes] = await Promise.all([q, getFinishes()]);
  const finish = new Map(finishes.map((f) => [f.id, f.name]));
  const rows = data ?? [];

  return (
    <AdminShell
      current="/admin/enquiries"
      title="Enquiries"
      intro="Messages from the Where to buy and Contact pages. These are enquiries, not orders or sales. A message is only passed to a stockist if the customer agreed."
    >
      {notice && <p role="status" className="notice mb-6 max-w-xl px-4 py-3 text-[0.9375rem] text-navy">{notice}</p>}
      <nav aria-label="Filter" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/enquiries?filter=${f.value}`}
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

      {rows.length === 0 ? (
        <p className="mt-8 text-ink-muted">{filter === "new" ? "No new enquiries." : "Nothing here."}</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {rows.map((r) => {
            const stockist = Array.isArray(r.stockists) ? r.stockists[0] : r.stockists;
            return (
              <li key={r.id} className="card p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
                  <div className="min-w-0">
                    <p className="eyebrow">{KIND[r.kind]}{stockist ? `: ${stockist.name}` : ""}{r.finish_id ? ` · ${finish.get(r.finish_id) ?? "a finish"}` : ""}</p>
                    <p className="mt-2 text-[1.0625rem] text-navy">{r.name}</p>
                    <p className="mt-1 break-words text-[0.9375rem] text-ink-muted">
                      {r.email}
                      {r.phone ? ` · ${r.phone}` : ""}
                      {r.postcode ? ` · ${r.postcode}` : ""}
                      {r.wants_contact ? " · asked to be contacted" : ""}
                    </p>
                    <p className="mt-3 max-w-[70ch] whitespace-pre-line text-[0.9375rem] text-navy">{r.message}</p>
                    {r.stockist_id && (
                      <p className="mt-3 text-[0.8125rem] text-ink-muted">
                        {r.share_with_stockist ? "Customer agreed to share their details with the stockist." : "Customer did not agree to share their details."}{" "}
                        {r.forwarded_at ? `Passed on ${dateFmt.format(new Date(r.forwarded_at))}.` : "Not passed on yet."}
                      </p>
                    )}
                  </div>
                  <p className="data text-[0.8125rem] text-ink-muted">{dateFmt.format(new Date(r.created_at))}</p>
                </div>
                <form action={updateEnquiry} className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="filter" value={filter} />
                  <label className="text-[0.8125rem] text-ink-muted">
                    Note (only you see this)
                    <input name="admin_note" defaultValue={r.admin_note ?? ""} maxLength={2000} className="mt-1 min-h-tap w-full rounded-control border border-navy/25 bg-white px-3 text-[0.9375rem] text-navy" />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {r.status !== "contacted" && <Button type="submit" name="status" value="contacted" variant="outline">Mark contacted</Button>}
                    {r.status !== "closed" && <Button type="submit" name="status" value="closed" variant="outline">Close</Button>}
                    {r.status !== "spam" && <Button type="submit" name="status" value="spam" variant="quiet">Spam</Button>}
                    {r.status !== "new" && <Button type="submit" name="status" value="new" variant="quiet">Reopen</Button>}
                  </div>
                </form>
                {r.stockist_id && r.share_with_stockist && !r.forwarded_at && !r.anonymised_at && (
                  <form action={forwardEnquiry} className="mt-3">
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="filter" value={filter} />
                    <Button type="submit" variant="quiet">Pass to {stockist?.name ?? "the stockist"} by email</Button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
