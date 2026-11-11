import Link from "next/link";
import type { ReactNode } from "react";
import { logOut, logOutEverywhere, setCustomerView } from "@/app/trade/account/actions";
import { ButtonLink } from "@/components/ui/button";
import type { Account } from "@/lib/auth/session";
import { cn } from "@/lib/cn";

/** Every tab, and whether it may be shown to a customer (customer mode). */
export const TRADE_TABS = [
  { href: "/trade/account", label: "Dashboard", customer: false },
  { href: "/trade/account/catalogue", label: "Catalogue", customer: true },
  { href: "/trade/present", label: "Present", customer: true },
  { href: "/trade/account/projects", label: "Projects", customer: false },
  { href: "/trade/account/quotes", label: "Quotes", customer: false },
  { href: "/trade/account/customers", label: "Customers", customer: false },
  { href: "/trade/account/calculator", label: "Calculator", customer: true },
  { href: "/compare", label: "Compare", customer: true },
  { href: "/trade/account/shortlists", label: "Shortlists", customer: false },
  { href: "/trade/account/documents", label: "Documents", customer: false },
  { href: "/trade/account/settings", label: "Settings", customer: false },
] as const;

export type TradeTab = (typeof TRADE_TABS)[number]["href"];

/** The Trade mode / Customer mode switch: one tap either way. */
export function ModeSwitch({ customerView, back, compact = false }: { customerView: boolean; back: string; compact?: boolean }) {
  return (
    <form action={setCustomerView} className="inline-flex">
      <input type="hidden" name="back" value={back} />
      <input type="hidden" name="on" value={customerView ? "0" : "1"} />
      <div role="group" aria-label="Presentation mode" className="inline-flex rounded-control border border-navy/20 bg-white p-1">
        {(["trade", "customer"] as const).map((m) => {
          const active = (m === "customer") === customerView;
          return (
            <button
              key={m}
              type={active ? "button" : "submit"}
              aria-pressed={active}
              className={cn(
                "min-h-tap rounded-[7px] px-4 text-[0.9375rem] font-medium transition-colors",
                compact && "px-3 text-[0.875rem]",
                active ? (m === "customer" ? "bg-green-ink text-white" : "bg-navy text-off-white") : "text-navy hover:bg-cream",
              )}
            >
              {m === "trade" ? "Trade mode" : "Customer mode"}
            </button>
          );
        })}
      </div>
    </form>
  );
}

/**
 * The approved trader's area. In customer mode it shows nothing about the
 * account (name, email, links to admin) and only the tabs that are safe to
 * show a customer; trade-only pages render CustomerModeBlocked instead of
 * loading their data.
 */
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
  /** Where the mode switch returns to. */
  back: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  const tabs = TRADE_TABS.filter((t) => !customerView || t.customer);
  return (
    <div className="container-page pb-section pt-8 sm:pt-12">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        {customerView ? <p className="eyebrow">Duratek flooring</p> : <p className="eyebrow">{account.companyName || "Trade account"}</p>}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <ModeSwitch customerView={customerView} back={back} />
          {!customerView && account.isAdmin && (
            <ButtonLink href="/admin" variant="quiet" arrow={false}>
              Owner Admin
            </ButtonLink>
          )}
          {!customerView && (
            <>
              <form action={logOut}>
                <button type="submit" className="min-h-tap text-[0.9375rem] text-ink-muted underline underline-offset-4 hover:text-navy">
                  Log out
                </button>
              </form>
              <form action={logOutEverywhere} className="hidden sm:block">
                <button type="submit" className="min-h-tap text-[0.875rem] text-ink-muted underline underline-offset-4 hover:text-navy">
                  Log out everywhere
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <nav aria-label="Trade account" className="scrollbar-none -mx-gutter mt-4 overflow-x-auto px-gutter">
        <ul className="flex w-max gap-2">
          {tabs.map((t) => (
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

      {customerView && (
        <p className="mt-4 text-[0.875rem] text-ink-muted">Customer mode: trade prices, profit and account details are not on this screen.</p>
      )}

      <h1 className="mt-8 text-display-lg text-navy">{title}</h1>
      {intro && <div className="mt-lede max-w-[60ch] text-support text-navy/75">{intro}</div>}
      <div className="mt-8 sm:mt-10">{children}</div>
    </div>
  );
}

/** What a trade-only page shows in customer mode: nothing from the account. */
export function CustomerModeBlocked({ back }: { back: string }) {
  return (
    <div className="notice max-w-xl space-y-4 px-5 py-5 text-navy">
      <p className="font-medium">This is hidden in customer mode.</p>
      <p className="text-[0.9375rem] text-ink-muted">Switch back to trade mode to see your projects, quotes, customers and account.</p>
      <ModeSwitch customerView back={back} />
    </div>
  );
}

/** Placeholder while a trade page streams in. */
export function TradeSkeleton() {
  return <div aria-busy="true" className="container-page h-96 animate-pulse pt-16" />;
}
