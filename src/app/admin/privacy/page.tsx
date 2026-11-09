import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/admin";
import { emailConfigured } from "@/lib/email";
import { PRIVACY_KINDS } from "@/lib/privacy";
import { userSupabase } from "@/lib/supabase/server";
import { addPrivacyRequest, erasePerson, runRetention, updatePrivacyRequest } from "./actions";

export const metadata: Metadata = { title: "Privacy", robots: { index: false } };

export default function AdminPrivacyPage({ searchParams }: PageProps<"/admin/privacy">) {
  return (
    <PageTransition>
      <Suspense fallback={<div aria-busy="true" className="container-page h-96 animate-pulse py-16" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}

const dateTime = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
const KIND = Object.fromEntries(PRIVACY_KINDS.map((k) => [k.value, k.label]));
const STATUS_LABEL: Record<string, string> = { new: "New", verifying: "Checking who they are", done: "Done", refused: "Refused" };

const input = "mt-1 min-h-tap w-full rounded-control border border-navy/25 bg-white px-3 text-[0.9375rem] text-navy";

async function Content({ searchParams }: { searchParams: PageProps<"/admin/privacy">["searchParams"] }) {
  await requireAdmin("manage_settings", "/admin/privacy");
  const sp = await searchParams;
  const one = (k: string) => String(Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] ?? ""));
  const notice =
    {
      added: "Request logged.",
      saved: "Saved.",
      invalid: "Check the details and try again.",
      confirm: "Tick the box to confirm. Erasing can't be undone.",
      error: "That didn't work. Please try again.",
      erased: `Erased: ${one("s")} sample requests, ${one("e")} enquiries, ${one("c")} consent records and ${one("l")} email log entries anonymised or removed.`,
      retention: `Retention run: ${one("s")} sample requests and ${one("e")} enquiries anonymised, ${one("l")} email log entries and ${one("a")} rejected accounts removed.`,
    }[one("notice")] ?? null;

  const db = await userSupabase();
  const [requests, log, consent, settings] = await Promise.all([
    db.from("privacy_requests").select("*").order("created_at", { ascending: false }).limit(100),
    db.from("notification_log").select("*").order("created_at", { ascending: false }).limit(100),
    db.from("consent_records").select("*").order("created_at", { ascending: false }).limit(50),
    db.from("system_settings").select("key, value").like("key", "retention_%"),
  ]);
  const open = (requests.data ?? []).filter((r) => r.status === "new" || r.status === "verifying");
  const closed = (requests.data ?? []).filter((r) => r.status === "done" || r.status === "refused");
  const periods = Object.fromEntries((settings.data ?? []).map((s) => [s.key, String(s.value)]));

  return (
    <AdminShell
      current="/admin/privacy"
      title="Privacy"
      intro="Requests from people about their information, exports and erasure, how long personal data is kept, what people agreed to, and the emails the site has sent."
    >
      {notice && <p role="status" className="notice mb-6 max-w-2xl px-4 py-3 text-[0.9375rem] text-navy">{notice}</p>}

      <section aria-labelledby="requests-heading">
        <h2 id="requests-heading" className="text-display-sm text-navy">Requests</h2>
        <p className="mt-2 max-w-[65ch] text-[0.9375rem] text-ink-muted">
          People can ask at <a href="/privacy/request" className="underline underline-offset-4">/privacy/request</a>. Under UK GDPR you have one month to reply. Check who is asking before you share or delete anything.
        </p>
        {open.length === 0 ? (
          <p className="mt-4 text-ink-muted">No open requests.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {open.map((r) => (
              <li key={r.id} className="card p-5">
                <p className="text-navy">{r.email} <span className="ml-2 text-[0.8125rem] text-ink-muted">{KIND[r.kind]}</span></p>
                <p className="mt-1 text-[0.8125rem] text-ink-muted">Received {day.format(new Date(r.created_at))} · reply by {day.format(new Date(r.due_at))} · {STATUS_LABEL[r.status]}</p>
                {r.details && <p className="mt-2 max-w-[70ch] whitespace-pre-line text-[0.9375rem] text-navy">{r.details}</p>}
                <form action={updatePrivacyRequest} className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
                  <input type="hidden" name="id" value={r.id} />
                  <label className="text-[0.8125rem] text-ink-muted">
                    Outcome note
                    <input name="outcome_note" defaultValue={r.outcome_note ?? ""} maxLength={1000} className={input} />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {r.status === "new" && <Button type="submit" name="status" value="verifying" variant="outline">Checking identity</Button>}
                    <Button type="submit" name="status" value="done">Mark done</Button>
                    <Button type="submit" name="status" value="refused" variant="quiet">Refuse</Button>
                  </div>
                </form>
                <p className="mt-3 text-[0.8125rem] text-ink-muted">
                  <a href={`/admin/privacy/export?email=${encodeURIComponent(r.email)}`} className="underline underline-offset-4">Download their data</a> for an access request, or erase below.
                </p>
              </li>
            ))}
          </ul>
        )}
        <details className="mt-6 max-w-xl">
          <summary className="min-h-tap cursor-pointer text-[0.9375rem] text-navy underline decoration-green underline-offset-4">Log a request received by email or post</summary>
          <form action={addPrivacyRequest} className="card mt-3 space-y-3 p-5">
            <label className="block text-[0.8125rem] text-ink-muted">Email<input name="email" type="email" required maxLength={254} className={input} /></label>
            <label className="block text-[0.8125rem] text-ink-muted">
              Type
              <select name="kind" className={input}>{PRIVACY_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select>
            </label>
            <label className="block text-[0.8125rem] text-ink-muted">Details<input name="details" maxLength={2000} className={input} /></label>
            <Button type="submit">Log request</Button>
          </form>
        </details>
        {closed.length > 0 && (
          <p className="mt-4 text-[0.8125rem] text-ink-muted">
            {closed.length} closed: {closed.slice(0, 5).map((r) => `${KIND[r.kind]} (${STATUS_LABEL[r.status].toLowerCase()})`).join(", ")}{closed.length > 5 ? "…" : ""}
          </p>
        )}
      </section>

      <section aria-labelledby="person-heading" className="mt-stack">
        <h2 id="person-heading" className="text-display-sm text-navy">Find or erase a person</h2>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <form action="/admin/privacy/export" method="get" className="card space-y-3 p-5">
            <p className="font-medium text-navy">Export their data</p>
            <p className="text-[0.8125rem] text-ink-muted">A JSON file of their sample requests, enquiries, consent, requests and the emails sent to them.</p>
            <label className="block text-[0.8125rem] text-ink-muted">Email<input name="email" type="email" required maxLength={254} className={input} /></label>
            <Button type="submit" variant="outline">Download JSON</Button>
          </form>
          <form action={erasePerson} className="card space-y-3 p-5">
            <p className="font-medium text-navy">Erase their data</p>
            <p className="text-[0.8125rem] text-ink-muted">Anonymises their sample requests, enquiries and consent records and deletes the emails logged to them. The counts stay for reporting. A trade account is deleted from its own page under Trade accounts.</p>
            <label className="block text-[0.8125rem] text-ink-muted">Email<input name="email" type="email" required maxLength={254} className={input} /></label>
            <label className="flex min-h-tap items-center gap-2 text-[0.875rem] text-navy">
              <input type="checkbox" name="confirm" value="yes" className="size-5 accent-green-ink" />
              I have checked who is asking. Erase for good.
            </label>
            <Button type="submit" variant="outline">Erase</Button>
          </form>
        </div>
      </section>

      <section aria-labelledby="retention-heading" className="mt-stack">
        <h2 id="retention-heading" className="text-display-sm text-navy">How long data is kept</h2>
        <ul className="mt-4 max-w-2xl divide-y divide-line border-y border-line text-[0.9375rem]">
          {[
            ["Sample requests", `${periods.retention_sample_requests_months ?? "24"} months, then anonymised`],
            ["Enquiries", `${periods.retention_enquiries_months ?? "24"} months, then anonymised`],
            ["Rejected trade applications", `${periods.retention_rejected_accounts_months ?? "12"} months, then the account is deleted`],
            ["Email log", `${periods.retention_email_log_days ?? "90"} days, then deleted`],
            ["Closed privacy requests", `${periods.retention_privacy_requests_months ?? "36"} months, then anonymised`],
          ].map(([what, rule]) => (
            <li key={what} className="flex flex-wrap justify-between gap-x-4 py-2"><span className="text-navy">{what}</span><span className="text-ink-muted">{rule}</span></li>
          ))}
        </ul>
        <p className="mt-3 max-w-[65ch] text-[0.8125rem] text-ink-muted">
          Change the periods in Settings. A daily job applies them when the site has CRON_SECRET and the service key set; you can also run it now. Confirm these periods with your adviser: they are proposals, not legal advice.
        </p>
        <form action={runRetention} className="mt-4"><Button type="submit" variant="outline">Run retention now</Button></form>
      </section>

      <section aria-labelledby="consent-heading" className="mt-stack">
        <h2 id="consent-heading" className="text-display-sm text-navy">What people agreed to</h2>
        {(consent.data ?? []).length === 0 ? (
          <p className="mt-4 text-ink-muted">No consent recorded yet. A record is made when someone ticks the marketing box on a sample request, or agrees to share an enquiry with a stockist.</p>
        ) : (
          <div className="card relative mt-6 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left text-[0.875rem]">
              <caption className="sr-only">Consent records</caption>
              <thead><tr className="border-b border-line text-[0.8125rem] text-ink-muted"><th scope="col" className="px-4 py-3 font-medium">When</th><th scope="col" className="px-4 py-3 font-medium">Who</th><th scope="col" className="px-4 py-3 font-medium">For</th><th scope="col" className="px-4 py-3 font-medium">Wording they saw</th></tr></thead>
              <tbody>
                {(consent.data ?? []).map((c) => (
                  <tr key={c.id} className="border-b border-line align-top last:border-b-0">
                    <td className="data whitespace-nowrap px-4 py-3 text-ink-muted">{dateTime.format(new Date(c.created_at))}</td>
                    <td className="break-all px-4 py-3 text-navy">{c.anonymised_at ? "Anonymised" : c.email}</td>
                    <td className="px-4 py-3 text-navy">{c.purpose === "marketing" ? "Marketing" : "Share with stockist"}{c.granted ? "" : " (withdrawn)"}</td>
                    <td className="px-4 py-3 text-ink-muted">{c.wording}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="log-heading" className="mt-stack">
        <h2 id="log-heading" className="text-display-sm text-navy">Email log</h2>
        <p className="mt-2 max-w-[65ch] text-[0.9375rem] text-ink-muted">
          Every email the site tried to send. “Sent” means the email provider accepted it, not that it was read. “Not configured” means no email provider is set up, so nothing left the site.
          {emailConfigured() ? " An email provider is set up." : " No email provider is set up right now."}
        </p>
        {(log.data ?? []).length === 0 ? (
          <p className="mt-4 text-ink-muted">Nothing logged yet.</p>
        ) : (
          <div className="card relative mt-6 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left text-[0.875rem]">
              <caption className="sr-only">Emails sent</caption>
              <thead><tr className="border-b border-line text-[0.8125rem] text-ink-muted"><th scope="col" className="px-4 py-3 font-medium">When</th><th scope="col" className="px-4 py-3 font-medium">Kind</th><th scope="col" className="px-4 py-3 font-medium">To</th><th scope="col" className="px-4 py-3 font-medium">Subject</th><th scope="col" className="px-4 py-3 font-medium">Result</th></tr></thead>
              <tbody>
                {(log.data ?? []).map((l) => (
                  <tr key={l.id} className="border-b border-line align-top last:border-b-0">
                    <td className="data whitespace-nowrap px-4 py-3 text-ink-muted">{dateTime.format(new Date(l.created_at))}</td>
                    <td className="px-4 py-3 text-navy">{l.kind.replaceAll("_", " ")}</td>
                    <td className="break-all px-4 py-3 text-navy">{l.recipient}</td>
                    <td className="px-4 py-3 text-ink-muted">{l.subject}</td>
                    <td className={l.status === "sent" ? "px-4 py-3 text-green-ink" : l.status === "failed" ? "px-4 py-3 text-error" : "px-4 py-3 text-ink-muted"}>{l.status === "not_configured" ? "Not configured" : l.status === "sent" ? "Sent" : "Failed"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
