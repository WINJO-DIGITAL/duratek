import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/admin";
import { PERMISSIONS, ROLE_LABELS, STATUS_LABELS, allows, isAdminRole, type AccountRole } from "@/lib/auth/permissions";
import { cn } from "@/lib/cn";
import { TRADE_TYPES } from "@/lib/trade/application";
import { adminSupabase } from "@/lib/supabase/admin";
import { userSupabase } from "@/lib/supabase/server";
import { reviewAccount, setRole } from "./actions";

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
  rejected: "Application rejected.",
  suspended: "Account suspended. Trade prices, quotes and documents are closed to it from now.",
  reinstated: "Account reinstated.",
  saved: "Tier updated.",
  role: "Role and permissions saved.",
  tier: "Choose a price tier first.",
  reason: "Give a short reason (kept internal, in the audit log).",
  self: "You can’t change your own account here.",
  super: "Only a super administrator can change roles.",
  invalid: "That didn’t look right. Please try again.",
  error: "Couldn’t save that. Please try again.",
};

const FILTERS = [
  { value: "pending", label: "Waiting" },
  { value: "approved", label: "Approved" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
  { value: "staff", label: "Administrators" },
] as const;

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

async function Content({ searchParams }: { searchParams: PageProps<"/admin/accounts">["searchParams"] }) {
  const me = await requireAdmin("manage_accounts", "/admin/accounts");
  const sp = await searchParams;
  const filter = FILTERS.some((f) => f.value === sp.filter) ? String(sp.filter) : "pending";
  const notice = NOTICE[String(sp.notice ?? "")];
  const db = await userSupabase();

  let q = db
    .from("profiles")
    .select(
      "id, company_name, contact_name, phone, trade_type, status, status_reason, status_changed_at, role, tier_id, created_at, businesses (name, company_number, vat_number, address_line1, address_line2, town, postcode, website), trade_applications (additional_info, submitted_at, reviewed_at), admin_permissions (permission)",
    )
    .order("created_at", { ascending: filter === "pending" });
  q = filter === "staff" ? q.in("role", ["super_admin", "admin"]) : q.in("role", ["trade", "stockist"]).eq("status", filter as "pending");
  const [{ data: rows }, { data: tiers }, counts] = await Promise.all([
    q,
    db.from("price_tiers").select("id, name").order("name"),
    db.from("profiles").select("status, role"),
  ]);

  // Emails live in Auth, not in profiles: looked up with the server-side key.
  const emails = new Map<string, { email: string; confirmed: boolean }>();
  const service = adminSupabase();
  if (service) {
    const { data } = await service.auth.admin.listUsers({ perPage: 1000 });
    for (const u of data?.users ?? []) if (u.email) emails.set(u.id, { email: u.email, confirmed: Boolean(u.email_confirmed_at) });
  }
  const count = (f: string) =>
    (counts.data ?? []).filter((p) => (f === "staff" ? isAdminRole(p.role as AccountRole) : !isAdminRole(p.role as AccountRole) && p.status === f)).length;
  const tierList = tiers ?? [];
  const typeLabel = (v: string | null) => TRADE_TYPES.find((t) => t.value === v)?.label ?? "Not stated";
  const superAdmin = me.role === "super_admin";

  return (
    <AdminShell
      current="/admin/accounts"
      title="Trade accounts"
      intro="Approving needs a price tier, which sets the trade prices that account sees, and emails them. Rejections and suspensions keep a short internal reason; every decision is in the audit log."
    >
      {notice && <p role="status" className="notice mb-6 max-w-xl px-4 py-3 text-[0.9375rem] text-navy">{notice}</p>}
      <nav aria-label="Filter accounts" className="mb-8 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/accounts?filter=${f.value}`}
            aria-current={f.value === filter ? "page" : undefined}
            className={cn(
              "flex min-h-tap items-center gap-2 rounded-control border px-4 text-[0.9375rem]",
              f.value === filter ? "border-green-ink text-green-ink" : "border-navy/20 text-navy hover:border-navy",
            )}
          >
            {f.label} <span className="data text-[0.8125rem] text-ink-muted">{count(f.value)}</span>
          </Link>
        ))}
      </nav>

      {(rows ?? []).length === 0 ? (
        <p className="text-ink-muted">Nothing here.</p>
      ) : (
        <ul className="space-y-3">
          {(rows ?? []).map((p) => {
            const b = p.businesses;
            const app = p.trade_applications;
            const mail = emails.get(p.id);
            const isSelf = p.id === me.userId;
            return (
              <li key={p.id} className="card p-5 sm:p-6">
                <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <p className="font-display text-display-sm text-navy">{b?.name || p.company_name || "No company name"}</p>
                    <p className="mt-1 text-[0.9375rem] text-ink-muted">
                      {p.contact_name || "No contact name"} · {ROLE_LABELS[p.role]}
                      {!isAdminRole(p.role) && ` · ${typeLabel(p.trade_type)}`}
                    </p>
                    <p className="mt-1 break-words text-[0.9375rem] text-ink-muted">
                      {mail?.email ?? "Email not available"}
                      {mail && !mail.confirmed && <span className="text-error"> (email not confirmed)</span>}
                      {p.phone ? ` · ${p.phone}` : ""}
                    </p>
                    {b && (
                      <dl className="mt-3 grid gap-x-6 gap-y-1 text-[0.875rem] sm:grid-cols-2">
                        <Detail label="Address" value={[b.address_line1, b.address_line2, b.town, b.postcode].filter(Boolean).join(", ")} />
                        <Detail label="Company number" value={b.company_number} mono />
                        <Detail label="VAT number" value={b.vat_number} mono />
                        <Detail label="Website" value={b.website} />
                      </dl>
                    )}
                    {app?.additional_info && <p className="mt-3 max-w-[60ch] whitespace-pre-line text-[0.875rem] text-navy">“{app.additional_info}”</p>}
                    <p className="mt-3 text-[0.8125rem] text-ink-muted">
                      <span className="font-medium text-navy">{STATUS_LABELS[p.status]}</span>
                      {` · applied ${dateFmt.format(new Date(app?.submitted_at ?? p.created_at))}`}
                      {p.status_changed_at && ` · changed ${dateFmt.format(new Date(p.status_changed_at))}`}
                      {p.status_reason && ` · reason: ${p.status_reason}`}
                    </p>
                    {p.status === "approved" && !isAdminRole(p.role) && allows(me, "manage_pricing") && (
                      <Link href={`/admin/accounts/${p.id}`} className="mt-1 inline-block py-2 text-[0.875rem] text-navy underline decoration-green underline-offset-4">
                        Account prices
                      </Link>
                    )}
                  </div>

                  {isSelf ? (
                    <p className="text-[0.875rem] text-ink-muted">This is you.</p>
                  ) : (
                    <div className="space-y-4 lg:w-80">
                      {!isAdminRole(p.role) && (
                        <form action={reviewAccount} className="space-y-3">
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="filter" value={filter} />
                          {(p.status === "pending" || p.status === "approved") && (
                            <div>
                              <label htmlFor={`tier-${p.id}`} className="block text-[0.8125rem] text-ink-muted">Price tier</label>
                              <select id={`tier-${p.id}`} name="tier" defaultValue={p.tier_id ?? ""} className="mt-1 min-h-tap w-full rounded-control border border-navy/25 bg-white px-3 text-[0.9375rem] text-navy focus:border-navy">
                                <option value="">Choose a tier</option>
                                {tierList.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                            </div>
                          )}
                          {(p.status === "pending" || p.status === "approved") && (
                            <div>
                              <label htmlFor={`reason-${p.id}`} className="block text-[0.8125rem] text-ink-muted">Reason (to reject or suspend; internal)</label>
                              <input id={`reason-${p.id}`} name="reason" maxLength={1000} className="mt-1 min-h-tap w-full rounded-control border border-navy/25 bg-white px-3 text-[0.9375rem] text-navy focus:border-navy" />
                            </div>
                          )}
                          <div className="flex flex-wrap gap-x-4 gap-y-2">
                            {p.status === "pending" && <Button type="submit" name="decision" value="approve">Approve</Button>}
                            {p.status === "pending" && <Button type="submit" name="decision" value="reject" variant="quiet">Reject</Button>}
                            {p.status === "approved" && <Button type="submit" name="decision" value="retier" variant="outline">Save Tier</Button>}
                            {p.status === "approved" && <Button type="submit" name="decision" value="suspend" variant="quiet">Suspend</Button>}
                            {(p.status === "suspended" || p.status === "rejected") && (
                              <Button type="submit" name="decision" value="reinstate" variant="outline">{p.status === "suspended" ? "Reinstate" : "Approve after all"}</Button>
                            )}
                          </div>
                        </form>
                      )}

                      {superAdmin && (p.status === "approved" || isAdminRole(p.role)) && (
                        <details className="rounded-control border border-line p-3">
                          <summary className="min-h-tap cursor-pointer py-2 text-[0.875rem] text-navy">Role and permissions</summary>
                          <form action={setRole} className="mt-3 space-y-3">
                            <input type="hidden" name="id" value={p.id} />
                            <input type="hidden" name="filter" value={filter} />
                            <label htmlFor={`role-${p.id}`} className="block text-[0.8125rem] text-ink-muted">Role</label>
                            <select id={`role-${p.id}`} name="role" defaultValue={p.role} className="min-h-tap w-full rounded-control border border-navy/25 bg-white px-3 text-[0.9375rem] text-navy">
                              {(Object.keys(ROLE_LABELS) as AccountRole[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                            </select>
                            <fieldset>
                              <legend className="text-[0.8125rem] text-ink-muted">Permissions (administrators only)</legend>
                              <ul className="mt-2 space-y-1">
                                {PERMISSIONS.map((perm) => (
                                  <li key={perm.value}>
                                    <label className="flex min-h-tap items-start gap-2 text-[0.875rem] text-navy" title={perm.help}>
                                      <input type="checkbox" name="permission" value={perm.value} defaultChecked={(p.admin_permissions ?? []).some((x) => x.permission === perm.value)} className="mt-1 size-4 accent-green-ink" />
                                      {perm.label}
                                    </label>
                                  </li>
                                ))}
                              </ul>
                            </fieldset>
                            <Button type="submit" variant="outline">Save Role</Button>
                          </form>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className={mono ? "data min-w-0 break-words text-navy" : "min-w-0 break-words text-navy"}>{value || "—"}</dd>
    </div>
  );
}
