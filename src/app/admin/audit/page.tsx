import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { requireAdmin } from "@/lib/auth/admin";
import { cn } from "@/lib/cn";
import { adminSupabase } from "@/lib/supabase/admin";
import { userSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Audit log", robots: { index: false } };

export default function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  return (
    <PageTransition>
      <Suspense fallback={<div aria-busy="true" className="container-page h-96 animate-pulse py-16" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}

const AREAS = [
  { value: "all", label: "Everything", tables: [] as string[] },
  { value: "accounts", label: "Accounts and roles", tables: ["profiles", "admin_permissions", "businesses"] },
  { value: "pricing", label: "Pricing", tables: ["price_lists", "price_list_items", "price_tiers"] },
  { value: "products", label: "Products", tables: ["finishes", "product_variants", "collections", "finish_images"] },
  { value: "other", label: "Other", tables: ["documents", "stockists", "online_retailers", "system_settings", "sample_requests"] },
];

const TABLE_LABEL: Record<string, string> = {
  profiles: "Account", admin_permissions: "Permission", businesses: "Business", price_lists: "Price list", price_list_items: "Price",
  price_tiers: "Tier", finishes: "Finish", product_variants: "Variant", collections: "Collection", finish_images: "Photograph",
  documents: "Document", stockists: "Stockist", online_retailers: "Retailer", system_settings: "Setting", sample_requests: "Sample request",
};

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

/** A short, readable description of what changed. Values only for the fields that changed. */
function describe(row: { action: string; changed_fields: string[] | null; old_data: unknown; new_data: unknown }): string {
  const o = (row.old_data ?? {}) as Record<string, unknown>;
  const n = (row.new_data ?? {}) as Record<string, unknown>;
  if (row.action === "insert") return ["name", "title", "permission", "amount_pence", "status"].map((k) => (n[k] !== undefined ? `${k}: ${String(n[k])}` : "")).filter(Boolean).join(" · ") || "added";
  if (row.action === "delete") return ["name", "title", "permission", "amount_pence"].map((k) => (o[k] !== undefined ? `${k}: ${String(o[k])}` : "")).filter(Boolean).join(" · ") || "removed";
  return (row.changed_fields ?? [])
    .filter((f) => !["updated_at", "status_changed_at", "status_changed_by", "specs"].includes(f))
    .slice(0, 6)
    .map((f) => `${f}: ${String(o[f] ?? "—")} → ${String(n[f] ?? "—")}`)
    .join(" · ");
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/audit">["searchParams"] }) {
  await requireAdmin("view_audit", "/admin/audit");
  const sp = await searchParams;
  const area = AREAS.find((a) => a.value === sp.area) ?? AREAS[0];
  const db = await userSupabase();
  let q = db.from("audit_log").select("id, occurred_at, actor_id, actor_role, action, table_name, record_id, changed_fields, old_data, new_data").order("occurred_at", { ascending: false }).limit(200);
  if (area.tables.length) q = q.in("table_name", area.tables);
  const { data } = await q;

  // Who: emails from Auth, looked up on the server once the permission is confirmed.
  const who = new Map<string, string>();
  const service = adminSupabase();
  if (service) {
    const { data: users } = await service.auth.admin.listUsers({ perPage: 1000 });
    for (const u of users?.users ?? []) if (u.email) who.set(u.id, u.email);
  }

  return (
    <AdminShell
      current="/admin/audit"
      title="Audit log"
      intro="Who changed what, and when: prices, accounts, roles, products and settings. Records can’t be edited or deleted by anyone. The latest 200 are shown."
    >
      <nav aria-label="Filter" className="mb-8 flex flex-wrap gap-2">
        {AREAS.map((a) => (
          <Link
            key={a.value}
            href={`/admin/audit?area=${a.value}`}
            aria-current={a.value === area.value ? "page" : undefined}
            className={cn("flex min-h-tap items-center rounded-control border px-4 text-[0.9375rem]", a.value === area.value ? "border-green-ink text-green-ink" : "border-navy/20 text-navy hover:border-navy")}
          >
            {a.label}
          </Link>
        ))}
      </nav>
      {(data ?? []).length === 0 ? (
        <p className="text-ink-muted">Nothing recorded yet.</p>
      ) : (
        <div className="card relative overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-[0.8125rem] text-ink-muted">
                <th scope="col" className="px-5 py-3 font-medium">When</th>
                <th scope="col" className="px-3 py-3 font-medium">Who</th>
                <th scope="col" className="px-3 py-3 font-medium">What</th>
                <th scope="col" className="px-5 py-3 font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((r) => (
                <tr key={r.id} className="border-b border-line align-top last:border-b-0">
                  <td className="data whitespace-nowrap px-5 py-2 text-[0.8125rem] text-navy">{when.format(new Date(r.occurred_at))}</td>
                  <td className="px-3 py-2 text-[0.8125rem] text-navy">{r.actor_id ? (who.get(r.actor_id) ?? r.actor_id.slice(0, 8)) : <span className="text-ink-muted">system</span>}</td>
                  <td className="px-3 py-2 text-[0.8125rem] text-navy">{TABLE_LABEL[r.table_name] ?? r.table_name} {r.action === "insert" ? "added" : r.action === "delete" ? "removed" : "changed"}</td>
                  <td className="break-words px-5 py-2 text-[0.8125rem] text-ink-muted">{describe(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
