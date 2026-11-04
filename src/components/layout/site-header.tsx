"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { Close, Menu, Search } from "@/components/ui/icons";
import { PRIMARY_NAV, TRADE_NAV } from "@/lib/config";
import { cn } from "@/lib/cn";
import { useSamples } from "@/lib/samples/use-samples";

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SampleCount({ className }: { className?: string }) {
  const { count } = useSamples();
  if (count === 0) return null;
  return (
    <span
      className={cn(
        "inline-flex size-5 items-center justify-center rounded-full bg-green-ink text-[0.6875rem] font-semibold text-white tabular-nums",
        className,
      )}
    >
      {count}
      <span className="sr-only"> chosen</span>
    </span>
  );
}

export { SampleCount };

export function SiteHeader() {
  const pathname = usePathname();
  // Search is open only on the page where it was opened, so it closes itself
  // when the route changes (e.g. after submitting to /range).
  const [searchOpenOn, setSearchOpenOn] = useState<string | null>(null);
  const searchOpen = searchOpenOn === pathname;
  const menuRef = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  // Close the menu dialog on navigation.
  useEffect(() => {
    menuRef.current?.close();
  }, [pathname]);

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-stone bg-cream/95 backdrop-blur-sm supports-[backdrop-filter]:bg-cream/85">
      <div className="container-page flex h-header items-center justify-between gap-6">
        <Link href="/" className="-mx-2 flex min-h-tap items-center px-2" aria-label="Duratek home">
          <Wordmark />
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={cn(
                "relative flex min-h-tap items-center gap-2 px-4 text-[0.9375rem] text-navy transition-colors hover:text-green-ink",
                "after:absolute after:inset-x-4 after:bottom-2 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300",
                "aria-[current=page]:after:scale-x-100",
              )}
            >
              {item.label}
              {item.href === "/samples" && <SampleCount />}
            </Link>
          ))}
          <span className="mx-3 h-5 w-px bg-stone" aria-hidden="true" />
          <Link
            href={TRADE_NAV.href}
            aria-current={isActive(pathname, TRADE_NAV.href) ? "page" : undefined}
            className="flex min-h-tap items-center px-3 text-[0.8125rem] font-medium uppercase tracking-[0.12em] text-ink-muted transition-colors hover:text-navy aria-[current=page]:text-navy"
          >
            {TRADE_NAV.label}
          </Link>
        </nav>

        {/* Mobile and tablet controls */}
        <div className="-mr-2 flex items-center lg:hidden">
          <button
            type="button"
            className="flex size-tap items-center justify-center text-navy"
            aria-expanded={searchOpen}
            aria-controls="site-search"
            onClick={() => setSearchOpenOn(searchOpen ? null : pathname)}
          >
            {searchOpen ? <Close /> : <Search />}
            <span className="sr-only">{searchOpen ? "Close search" : "Search finishes"}</span>
          </button>
          <button
            type="button"
            className="flex size-tap items-center justify-center text-navy"
            aria-haspopup="dialog"
            onClick={() => menuRef.current?.showModal()}
          >
            <Menu />
            <span className="sr-only">Open menu</span>
          </button>
        </div>
      </div>

      {searchOpen && (
        <form
          id="site-search"
          role="search"
          action="/range"
          className="container-page flex gap-2 border-t border-stone pb-3 pt-3 lg:hidden"
        >
          <label htmlFor="site-search-input" className="sr-only">
            Search finishes
          </label>
          <input
            ref={searchInput}
            id="site-search-input"
            name="q"
            type="search"
            placeholder="Search finishes, e.g. Keswick"
            autoComplete="off"
            className="min-h-tap w-full border border-stone bg-white px-4 text-base text-navy placeholder:text-ink-muted"
          />
          <button type="submit" className="min-h-tap shrink-0 bg-green-ink px-4 text-[0.9375rem] font-medium text-white">
            Search
          </button>
        </form>
      )}

      <dialog
        ref={menuRef}
        aria-label="Menu"
        className="m-0 h-dvh max-h-none w-full max-w-none bg-cream p-0 text-navy backdrop:bg-navy-deep/40 open:flex open:flex-col lg:hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <div className="container-page flex h-header shrink-0 items-center justify-between border-b border-stone">
          <Wordmark />
          <button
            type="button"
            className="-mr-2 flex size-tap items-center justify-center"
            onClick={() => menuRef.current?.close()}
            autoFocus
          >
            <Close />
            <span className="sr-only">Close menu</span>
          </button>
        </div>
        <nav aria-label="Menu" className="container-page flex flex-1 flex-col overflow-y-auto py-6">
          <ul className="flex flex-col">
            {[{ href: "/", label: "Home" }, ...PRIMARY_NAV].map((item) => (
              <li key={item.href} className="border-b border-stone">
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className="flex min-h-14 items-center justify-between font-display text-display-sm aria-[current=page]:text-green-ink"
                  onClick={() => menuRef.current?.close()}
                >
                  {item.label}
                  {item.href === "/samples" && <SampleCount />}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-8 grid grid-cols-2 gap-x-6 text-[0.9375rem] text-ink-muted">
            {[
              { href: "/technology", label: "Technology" },
              { href: "/warranty", label: "Warranty" },
              { href: "/contact", label: "Contact" },
              { href: TRADE_NAV.href, label: "Trade accounts" },
            ].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="flex min-h-tap items-center hover:text-navy" onClick={() => menuRef.current?.close()}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </dialog>
    </header>
  );
}
