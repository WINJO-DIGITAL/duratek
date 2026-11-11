import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/admin";
import { userSupabase } from "@/lib/supabase/server";
import { saveSetting } from "./actions";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default function AdminSettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  return (
    <PageTransition>
      <Suspense fallback={<div aria-busy="true" className="container-page h-96 animate-pulse py-16" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}

const LABELS: Record<string, { label: string; display: (v: unknown) => string; editable: boolean; hint: string }> = {
  currency: { label: "Currency", display: (v) => String(v), editable: false, hint: "GBP only for now." },
  default_vat_rate_bp: { label: "Standard VAT Rate", display: (v) => `${Number(v) / 100}`, editable: true, hint: "Percent. Applies to new products; each product keeps its own rate." },
  sample_limit: { label: "Free Samples per Request", display: (v) => String(v), editable: true, hint: "1 to 10." },
  retention_sample_requests_months: { label: "Keep Sample Requests for", display: (v) => String(v), editable: true, hint: "Months, then the customer's details are anonymised. The count stays for reporting." },
  retention_enquiries_months: { label: "Keep Enquiries for", display: (v) => String(v), editable: true, hint: "Months, then anonymised." },
  retention_rejected_accounts_months: { label: "Keep Rejected Applications for", display: (v) => String(v), editable: true, hint: "Months after the decision, then the account is deleted." },
  retention_email_log_days: { label: "Keep the Email Log for", display: (v) => String(v), editable: true, hint: "Days." },
  retention_privacy_requests_months: { label: "Keep Closed Privacy Requests for", display: (v) => String(v), editable: true, hint: "Months, then anonymised." },
  quote_validity_days: { label: "Quote Validity", display: (v) => String(v), editable: true, hint: "Days, suggested to traders." },
};

const NOTICE: Record<string, string> = { saved: "Saved.", invalid: "That value isn’t allowed.", failed: "Couldn’t save. Please try again." };

async function Content({ searchParams }: { searchParams: PageProps<"/admin/settings">["searchParams"] }) {
  await requireAdmin("manage_settings", "/admin/settings");
  const notice = NOTICE[String((await searchParams).notice ?? "")];
  const db = await userSupabase();
  const { data } = await db.from("system_settings").select("key, value, is_public, description, updated_at").order("key");
  return (
    <AdminShell current="/admin/settings" title="Settings" intro="Business settings used across the site. Every change is in the audit log.">
      {notice && <p role="status" className="notice mb-6 max-w-xl px-4 py-3 text-[0.9375rem] text-navy">{notice}</p>}
      <ul className="max-w-2xl space-y-3">
        {(data ?? []).map((s) => {
          const meta = LABELS[s.key] ?? { label: s.key, display: (v: unknown) => JSON.stringify(v), editable: false, hint: s.description };
          return (
            <li key={s.key} className="card p-5">
              <form action={saveSetting} className="flex flex-wrap items-end justify-between gap-4">
                <input type="hidden" name="key" value={s.key} />
                <div className="min-w-0">
                  <label htmlFor={`setting-${s.key}`} className="text-[0.9375rem] font-medium text-navy">{meta.label}</label>
                  <p className="mt-1 text-[0.8125rem] text-ink-muted">{meta.hint}{s.is_public ? " Public." : " Internal."}</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    id={`setting-${s.key}`}
                    name="value"
                    defaultValue={meta.display(s.value)}
                    readOnly={!meta.editable}
                    inputMode="decimal"
                    className="data min-h-tap w-28 rounded-control border border-navy/25 bg-white px-3 text-right text-navy read-only:bg-cream"
                  />
                  {meta.editable && <Button type="submit" variant="outline">Save</Button>}
                </div>
              </form>
            </li>
          );
        })}
      </ul>
    </AdminShell>
  );
}
