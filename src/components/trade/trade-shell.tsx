import Link from "next/link";
import type { ReactNode } from "react";
import { logOut, logOutEverywhere, setCustomerView } from "@/app/trade/account/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import type { Account } from "@/lib/auth/session";
import { cn } from "@/lib/cn";

export const TRADE_TABS = [
  { href: "/trade/account", label: "Prices" },
  { href: "/trade/account/quotes", label: "Quotes" },
  { href: "/trade/account/calculator", label: "Calculator" },
  { href: "/trade/account/shortlists", label: "Shortlists" },
  { href: "/trade/account/documents", label: "Documents" },
  { href: "/trade/account/settings", label: "Settings" },
] as const;

export type TradeTab = (typeof TRADE_TABS)[number]["href"];

/** The approved trader's area: account header, tabs, and the Customer view switch. */
export function TradeShell({
  account,
  customerView,
  current,
  back,
  title,
  intro,
  children,
}: {
  account: Account;
  customerView: boolean;
  current: TradeTab;
  /** Where the Customer view switch returns to. */
  back: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="container-page pb-section pt-12 sm:pt-16">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="eyebrow">{account.companyName || "Trade account"}</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          {account.isAdmin && (
            <ButtonLink href="/admin" variant="quiet" arrow={false}>
              Owner admin
            </ButtonLink>
          )}
          <form action={logOut}>
            <button type="submit" className="min-h-tap text-[0.9375rem] text-ink-muted underline underline-offset-4 hover:text-navy">
              Log out
            </button>
          </form>
          <form action={logOutEverywhere}>
            <button type="submit" className="min-h-tap text-[0.875rem] text-ink-muted underline underline-offset-4 hover:text-navy">
              Log out everywhere
            </button>
          </form>
        </div>
      </div>

      <nav aria-label="Trade account" className="scrollbar-none -mx-gutter mt-4 overflow-x-auto px-gutter">
        <ul className="flex w-max gap-2">
          {TRADE_TABS.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={t.href === current ? "page" : undefined}
                className={cn(
                  "flex min-h-tap items-center rounded-control border px-4 text-[0.9375rem] transition-colors",
                  t.href === current ? "border-navy bg-navy text-off-white" : "border-navy/20 text-navy hover:border-navy",
                )}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <form
        action={setCustomerView}
        className={cn(
          "mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-control border px-4 py-3",
          customerView ? "border-green-ink bg-white" : "border-line bg-white/60",
        )}
      >
        <input type="hidden" name="back" value={back} />
        <input type="hidden" name="on" value={customerView ? "0" : "1"} />
        <p className="text-[0.9375rem] text-navy">
          {customerView ? (
            <>
              <span className="font-medium">Customer view is on.</span>{" "}
              <span className="text-ink-muted">Trade prices, costs and margins are hidden everywhere.</span>
            </>
          ) : (
            <span className="text-ink-muted">Showing a customer? Hide every trade price, cost and margin with one tap.</span>
          )}
        </p>
        <Button type="submit" variant={customerView ? "primary" : "outline"}>
          {customerView ? "Exit Customer view" : "Customer view"}
        </Button>
      </form>

      <h1 className="mt-10 text-display-lg text-navy">{title}</h1>
      {intro && <div className="mt-lede max-w-[60ch] text-support text-navy/75">{intro}</div>}
      <div className="mt-10">{children}</div>
    </div>
  );
}

/** Placeholder while a trade page streams in. */
export function TradeSkeleton() {
  return <div aria-busy="true" className="container-page h-96 animate-pulse pt-16" />;
}
