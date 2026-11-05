import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/admin";
import { TRADE_TYPES } from "@/lib/trade/application";
import { adminSupabase } from "@/lib/supabase/admin";
import { userSupabase } from "@/lib/supabase/server";
import { reviewAccount } from "./actions";

export const metadata: Metadata = { title: "Trade accounts", robots: { index: false } };

export default function AdminAccountsPage({ searchParams }: PageProps<"/admin/accounts">) {
  return (
    <PageTransition>
      <Suspense fallback={<div aria-busy="true" className="container-page h-96 animate-pulse py-16" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}

const NOTICE: Record<string, string> = {
  approved: "Account approved. They’ve been emailed.",
  rejected: "Account rejected.",
  saved: "Tier updated.",
  tier: "Choose a price tier first.",
  self: "You can’t reject your own account.",
  invalid: "That didn’t look right. Please try again.",
  error: "Couldn’t save that. Please try again.",
};

const STATUS_LABEL = { pending: "Waiting for approval", approved: "Approved", rejected: "Rejected" } as const;

async function Content({ searchParams }: { searchParams: PageProps<"/admin/accounts">["searchParams"] }) {
  await requireAdmin("/admin/accounts");
  const notice = NOTICE[String((await searchParams).notice ?? "")];
  const db = await userSupabase();
  const [profiles, tiers] = await Promise.all([
    db.from("profiles").select("id, company_name, contact_name, phone, trade_type, status, tier_id, created_at").order("created_at", { ascending: false }),
    db.from("price_tiers").select("id, name").order("name"),
  ]);

  // Emails live in Auth, not in profiles: look them up with the server-side key.
  const emails = new Map<string, string>();
  const service = adminSupabase();
  if (service) {
    const { data } = await service.auth.admin.listUsers({ perPage: 1000 });
    for (const u of data?.users ?? []) if (u.email) emails.set(u.id, u.email);
  }

  const order = { pending: 0, approved: 1, rejected: 2 } as const;
  const rows = [...(profiles.data ?? [])].sort((a, b) => order[a.status] - order[b.status]);
  const tierList = tiers.data ?? [];
  const typeLabel = (v: string | null) => TRADE_TYPES.find((t) => t.value === v)?.label ?? "Not stated";

  return (
    <AdminShell
      current="/admin/accounts"
      title="Trade accounts"
      intro="Applications waiting for you come first. Approving needs a price tier, which sets the trade prices that account sees, and emails them to say they can log in."
    >
      {notice && <p role="status" className="notice mb-6 max-w-xl px-4 py-3 text-[0.9375rem] text-navy">{notice}</p>}
      {tierList.length === 0 && (
        <p className="notice mb-6 max-w-xl px-4 py-3 text-[0.9375rem] text-navy">
          There are no price tiers yet. Add one under Prices before approving an account.
        </p>
      )}
      {rows.length === 0 ? (
        <p className="text-ink-muted">No applications yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => (
            <li key={p.id} className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
                <div className="min-w-0">
                  <p className="font-display text-display-sm text-navy">{p.company_name || "No company name"}</p>
                  <p className="mt-1 text-[0.9375rem] text-ink-muted">
                    {p.contact_name} · {typeLabel(p.trade_type)}
                  </p>
                  <p className="mt-1 break-words text-[0.9375rem] text-ink-muted">
                    {emails.get(p.id) ?? "Email not available"}
                    {p.phone ? ` · ${p.phone}` : ""}
                  </p>
                  <p className="mt-2 text-[0.8125rem] font-medium text-navy">{STATUS_LABEL[p.status]}</p>
                </div>

                <form action={reviewAccount} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="id" value={p.id} />
                  <div>
                    <label htmlFor={`tier-${p.id}`} className="block text-[0.8125rem] text-ink-muted">Price tier</label>
                    <select
                      id={`tier-${p.id}`}
                      name="tier"
                      defaultValue={p.tier_id ?? ""}
                      className="mt-1 min-h-tap rounded-control border border-navy/25 bg-white px-3 text-[0.9375rem] text-navy focus:border-navy"
                    >
                      <option value="">Choose a tier</option>
                      {tierList.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  {p.status !== "approved" && (
                    <Button type="submit" name="decision" value="approve">Approve</Button>
                  )}
                  {p.status === "approved" && (
                    <Button type="submit" name="decision" value="retier" variant="outline">Save tier</Button>
                  )}
                  {p.status !== "rejected" && (
                    <Button type="submit" name="decision" value="reject" variant="quiet">
                      {p.status === "approved" ? "Remove access" : "Reject"}
                    </Button>
                  )}
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
