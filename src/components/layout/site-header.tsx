"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { Close, Menu, Search } from "@/components/ui/icons";
import type { NavData } from "@/lib/catalogue/nav";
import { cn } from "@/lib/cn";
import { PRIMARY_NAV, TRADE_NAV } from "@/lib/config";
import { MobileMenu } from "./mobile-menu";
import { RangeMenu } from "./range-menu";
import { SampleCount } from "./sample-count";

export { SampleCount };

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ nav }: { nav: NavData }) {
  const pathname = usePathname();
  // Search is open only on the page where it was opened, so it closes itself
  // when the route changes (e.g. after submitting to /range).
  const [searchOpenOn, setSearchOpenOn] = useState<string | null>(null);
  const searchOpen = searchOpenOn === pathname;
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  // Close the menu dialog on navigation.
  useEffect(() => {
    menuRef.current?.close();
  }, [pathname]);

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);

  // A soft shadow once the page scrolls under the header.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      style={{ viewTransitionName: "site-header" }}
      className={cn(
        "sticky top-0 z-40 border-b bg-off-white/95 backdrop-blur-md transition-[box-shadow,border-color] duration-500 supports-[backdrop-filter]:bg-off-white/85",
        scrolled ? "border-transparent shadow-[0_10px_30px_-18px_rgb(24_54_76/0.35)]" : "border-line",
      )}
    >
      <div className="container-page flex h-header items-center justify-between gap-6">
        <Link href="/" className="-mx-2 flex min-h-tap items-center px-2" aria-label="Duratek home">
          <Wordmark />
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          <RangeMenu nav={nav} active={isActive(pathname, "/range")} />
          {PRIMARY_NAV.filter((i) => i.href !== "/range").map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={cn(
                "relative flex min-h-tap items-center gap-2 px-4 text-[0.9375rem] text-navy transition-colors duration-300 hover:text-green-ink",
                "after:absolute after:inset-x-4 after:bottom-2 after:h-px after:origin-left after:scale-x-0 after:bg-green after:transition-transform after:duration-500 after:ease-calm",
                "hover:after:scale-x-100 aria-[current=page]:after:scale-x-100",
              )}
            >
              {item.label}
              {item.href === "/samples" && <SampleCount />}
            </Link>
          ))}
          <span className="mx-3 h-5 w-px bg-line" aria-hidden="true" />
          <Link
            href={TRADE_NAV.href}
            aria-current={isActive(pathname, TRADE_NAV.href) ? "page" : undefined}
            className="flex min-h-tap items-center px-3 text-[0.8125rem] font-medium uppercase tracking-[0.12em] text-ink-muted transition-colors duration-300 hover:text-navy aria-[current=page]:text-green-ink"
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
            <span className="relative block size-5">
              <Search className={cn("absolute inset-0 transition-[opacity,rotate] duration-300", searchOpen && "rotate-90 opacity-0")} />
              <Close className={cn("absolute inset-0 transition-[opacity,rotate] duration-300", !searchOpen && "-rotate-90 opacity-0")} />
            </span>
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

      {/* Search: grid-rows 0fr -> 1fr animates the height smoothly. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-500 ease-calm lg:hidden",
          searchOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
        inert={!searchOpen}
      >
        <div className="overflow-hidden">
          <form id="site-search" role="search" action="/range" className="container-page flex gap-2 border-t border-line pb-3 pt-3">
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
              className="min-h-tap w-full border border-line bg-white px-4 text-base text-navy placeholder:text-ink-muted"
            />
            <button
              type="submit"
              className="min-h-tap shrink-0 bg-green-ink px-4 text-[0.9375rem] font-medium text-white transition-colors hover:bg-green-ink-hover"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      <MobileMenu nav={nav} ref={menuRef} />
    </header>
  );
}
