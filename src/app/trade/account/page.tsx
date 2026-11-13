import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SectionIntro } from "@/components/content/section-intro";
import { PageTransition } from "@/components/layout/page-transition";
import { Button, ButtonLink } from "@/components/ui/button";
import { byTone, getFinishes, grainImage } from "@/lib/catalogue";
import { getAccount, inCustomerView } from "@/lib/auth/session";
import { formatPence } from "@/lib/money";
import { QuoteStatusChip } from "@/components/trade/quote-status";
import { CustomerModeBlocked, TradeShell } from "@/components/trade/trade-shell";
import { userSupabase } from "@/lib/supabase/server";
import { listProjects, listSavedFinishIds } from "@/lib/trade/portal";
import { listQuotes } from "@/lib/trade/quotes";
import { logOut, logOutEverywhere } from "./actions";

export const metadata: Metadata = {
  title: "Your trade account",
  robots: { index: false },
};

export default function TradeAccountPage({ searchParams }: PageProps<"/trade/account">) {
  return (
    <PageTransition>
      <div className="container-page pb-section pt-12 sm:pt-16">
        <Suspense fallback={<div aria-busy="true" className="h-96 animate-pulse rounded-card bg-line/50" />}>
          <AccountContent searchParams={searchParams} />
        </Suspense>
      </div>
    </PageTransition>
  );
}

const ACCOUNT_NOTICE: Record<string, string> = {
  verified: "Thank you. Your email address is confirmed.",
  password: "Your new password is saved. Any other devices have been signed out.",
};

async function AccountContent({ searchParams }: { searchParams: PageProps<"/trade/account">["searchParams"] }) {
  const account = await getAccount();
  if (!account) redirect("/trade/login?next=/trade/account");
  const noticeText = ACCOUNT_NOTICE[String((await searchParams).notice ?? "")];
  const notice = noticeText && (
    <p role="status" className="notice mb-8 max-w-xl px-4 py-3 text-[0.9375rem] text-navy">
      {noticeText}
    </p>
  );

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <SectionIntro as="h1" size="lg" eyebrow="Trade account" title={account.companyName || "Your account"}>
        <p>{account.contactName ? `${account.contactName}, ${account.email}` : account.email}</p>
      </SectionIntro>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {account.isAdmin && (
          <ButtonLink href="/admin" variant="quiet">
            Owner Admin
          </ButtonLink>
        )}
        <form action={logOut}>
          <Button type="submit" variant="outline">
            Log Out
          </Button>
        </form>
        <form action={logOutEverywhere}>
          <button type="submit" className="min-h-tap text-[0.875rem] text-ink-muted underline underline-offset-4 hover:text-navy">
            Log out on all devices
          </button>
        </form>
      </div>
    </div>
  );

  if (account.status !== "approved") {
    return (
      <>
        {notice}
        {header}
        <div className="notice mt-stack max-w-xl px-5 py-4 text-navy">
          {account.status === "pending" ? (
            <>
              <p className="font-medium">Your application is waiting for approval.</p>
              <p className="mt-1 text-[0.9375rem] text-ink-muted">
                {account.emailConfirmed
                  ? `We check every application by hand and will email ${account.email} when your account is approved. Until then you can browse the range as normal.`
                  : `Please confirm your email address with the link we sent to ${account.email}. We then check every application by hand.`}
              </p>
            </>
          ) : account.status === "suspended" ? (
            <>
              <p className="font-medium">This trade account is suspended.</p>
              <p className="mt-1 text-[0.9375rem] text-ink-muted">
                Trade prices, quotes and documents are unavailable for now. Please contact us if you think this is a mistake.
              </p>
            </>
          ) : (
            <p className="font-medium">This account wasn’t approved, so trade prices aren’t available.</p>
          )}
        </div>
      </>
    );
  }

  const customerView = await inCustomerView();
  if (customerView) {
    return (
      <TradeShell account={account} customerView current="/trade/account" back="/trade/account" title="Dashboard">
        <CustomerModeBlocked back="/trade/account" />
      </TradeShell>
    );
  }
  return (
    <TradeShell
      account={account}
      customerView={false}
      current="/trade/account"
      back="/trade/account"
      title={`Hello${account.contactName ? `, ${account.contactName.split(/\s+/)[0]}` : ""}.`}
      intro={<p>Everything for your jobs in one place: price a room, quote it, and show your customer the range.</p>}
    >
      {notice}
      <Dashboard account={account} />
    </TradeShell>
  );
}

async function Dashboard({ account }: { account: NonNullable<Awaited<ReturnType<typeof getAccount>>> }) {
  const db = await userSupabase();
  const [finishes, quotes, projects, saved, docs, tier] = await Promise.all([
    getFinishes().then(byTone),
    listQuotes(),
    listProjects(),
    listSavedFinishIds(),
    db.from("documents").select("id", { count: "exact", head: true }),
    account.tierId ? db.from("price_tiers").select("name").eq("id", account.tierId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const savedFinishes = saved.map((id) => finishes.find((f) => f.id === id)).filter((f) => f !== undefined).slice(0, 6);
  const open = quotes.filter((q) => q.status === "sent");
  const won = quotes.filter((q) => q.status === "accepted");

  return (
    <div className="space-y-12">
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { href: "/trade/account/projects#new", label: "New Project", note: "Measure rooms" },
          { href: "/trade/account/quotes", label: "New Quote", note: "Price a job" },
          { href: "/trade/present", label: "Present", note: "Show the range" },
          { href: "/trade/account/calculator", label: "Calculator", note: "Packs and profit" },
        ].map((a) => (
          <li key={a.href}>
            <Link href={a.href} className="card flex min-h-24 flex-col justify-center p-4 transition-colors hover:border-navy/40">
              <span className="text-[1.0625rem] font-medium text-navy">{a.label}</span>
              <span className="text-[0.8125rem] text-ink-muted">{a.note}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="quotes-heading">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="quotes-heading" className="text-display-sm text-navy">Recent Quotes</h2>
            <Link href="/trade/account/quotes" className="text-[0.9375rem] text-navy underline underline-offset-4">All quotes</Link>
          </div>
          <p className="mt-1 text-[0.875rem] text-ink-muted">{open.length} waiting for an answer · {won.length} accepted</p>
          {quotes.length === 0 ? <p className="mt-4 text-ink-muted">No quotes yet.</p> : (
            <ul className="mt-4 space-y-2">
              {quotes.slice(0, 5).map((q) => (
                <li key={q.id}>
                  <Link href={`/trade/account/quotes/${q.id}`} className="card flex items-center justify-between gap-4 p-4 hover:border-navy/40">
                    <span className="min-w-0"><span className="data block text-[0.8125rem] text-ink-muted">{q.reference}</span><span className="block truncate text-navy">{q.customerName}</span></span>
                    <span className="flex items-center gap-3"><span className="data text-navy">{formatPence(q.totals.totalPence)}</span><QuoteStatusChip status={q.status} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="projects-heading">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="projects-heading" className="text-display-sm text-navy">Projects</h2>
            <Link href="/trade/account/projects" className="text-[0.9375rem] text-navy underline underline-offset-4">All projects</Link>
          </div>
          {projects.length === 0 ? <p className="mt-4 text-ink-muted">No projects yet. Start one when you measure up.</p> : (
            <ul className="mt-4 space-y-2">
              {projects.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <Link href={`/trade/account/projects/${p.id}`} className="card flex items-center justify-between gap-4 p-4 hover:border-navy/40">
                    <span className="min-w-0"><span className="block truncate text-navy">{p.name}</span><span className="block text-[0.8125rem] text-ink-muted">{p.customerName ?? "No customer"}</span></span>
                    <span className="data text-[0.875rem] text-navy">{p.rooms.length} {p.rooms.length === 1 ? "room" : "rooms"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="saved-heading">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="saved-heading" className="text-display-sm text-navy">Saved Finishes</h2>
          <Link href="/trade/account/catalogue" className="text-[0.9375rem] text-navy underline underline-offset-4">Catalogue and your prices</Link>
        </div>
        {savedFinishes.length === 0 ? (
          <p className="mt-4 text-ink-muted">Save finishes from the catalogue to keep them here.</p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {savedFinishes.map((f) => {
              const img = grainImage(f);
              return (
                <li key={f.id}>
                  <Link href={`/trade/present/${f.slug}`} className="group block">
                    <span className="frame relative block aspect-square bg-line">{img && <Image src={img.src} alt="" fill sizes="160px" quality={70} className="object-cover" />}</span>
                    <span className="mt-2 block text-[0.9375rem] text-navy">{f.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="account-heading" className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5 sm:p-6">
          <h2 id="account-heading" className="text-display-sm text-navy">Your Account</h2>
          <dl className="mt-4 text-[0.9375rem]">
            {[
              ["Status", "Approved trade account"],
              ["Business", account.companyName || "—"],
              ["Contact", account.contactName || "—"],
              ["Email", account.email],
              ["Price list", tier.data?.name ?? "Standard trade"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-line py-2 last:border-b-0">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="text-right text-navy">{v}</dd>
              </div>
            ))}
          </dl>
          <Link href="/trade/account/settings" className="mt-4 inline-block py-2 text-[0.9375rem] text-navy underline decoration-green underline-offset-4">Settings and branding</Link>
        </div>
        <div className="card p-5 sm:p-6">
          <h2 className="text-display-sm text-navy">Technical Documents</h2>
          <p className="mt-2 text-[0.9375rem] text-ink-muted">{docs.count ? `${docs.count} technical sheets, fitting guides and certificates.` : "Technical sheets, fitting guides and certificates appear here as Duratek adds them."}</p>
          <Link href="/trade/account/documents" className="mt-4 inline-block py-2 text-[0.9375rem] text-navy underline decoration-green underline-offset-4">Documents</Link>
        </div>
      </section>
    </div>
  );
}
