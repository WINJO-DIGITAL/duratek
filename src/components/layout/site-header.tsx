"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { Close, Menu, Search } from "@/components/ui/icons";
import type { NavData } from "@/lib/catalogue/nav";
import { cn } from "@/lib/cn";
import { TRADE_NAV } from "@/lib/config";
import { finishMenuNav, MobileMenu } from "./mobile-menu";
import { SampleTrayLink } from "@/components/samples/sample-tray-link";
import { SavedLink } from "./saved-link";
import { ScrollProgress } from "./scroll-progress";
import { RangeMenu } from "./range-menu";
import { SampleCount } from "./sample-count";

export { SampleCount };

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Pages whose hero is a full-bleed photo the header can sit over. */
const OVERLAY_ROUTES = new Set(["/"]);

const LEFT_NAV = [
  { href: "/inspiration", label: "Inspiration" },
  { href: "/where-to-buy", label: "Where to buy" },
];

export function SiteHeader({ nav }: { nav: NavData }) {
  const pathname = usePathname();
  // Search is open only on the page where it was opened, so it closes itself
  // when the route changes (e.g. after submitting to /range).
  const [searchOpenOn, setSearchOpenOn] = useState<string | null>(null);
  const searchOpen = searchOpenOn === pathname;
  const [scrolled, setScrolled] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const menuRef = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const onRangeOpenChange = useCallback((o: boolean) => setRangeOpen(o), []);

  // Transparent over the home hero until the page scrolls or a panel opens.
  const overlay = OVERLAY_ROUTES.has(pathname) && !scrolled && !searchOpen && !rangeOpen;

  // Close the menu on navigation, in the same commit as the new page (a
  // layout effect), so the page transition's new snapshot has no menu and the
  // old page never shows in between. Then clear the menu-navigation flag
  // once the fade has run.
  useLayoutEffect(() => {
    const d = menuRef.current;
    if (d?.open) {
      delete d.dataset.closing;
      d.close();
    }
    finishMenuNav();
  }, [pathname]);

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  const linkClass = (active: boolean) =>
    cn(
      "relative flex min-h-tap items-center gap-2 px-4 text-[0.9375rem] transition-colors duration-300",
      "after:absolute after:inset-x-4 after:bottom-2 after:h-px after:origin-left after:scale-x-0 after:bg-green after:transition-transform after:duration-300 after:ease-calm",
      "hover:after:scale-x-100",
      active && "after:scale-x-100",
      overlay ? "text-white hover:text-white/80" : "text-navy hover:text-green-ink",
    );

  return (
    <header
      style={{ viewTransitionName: "site-header" }}
      data-overlay={overlay || undefined}
      className={cn(
        "sticky top-0 z-40 border-b transition-[background-color,box-shadow,border-color,backdrop-filter] duration-300 ease-calm",
        overlay
          ? "border-white/15 bg-transparent"
          : "border-line bg-off-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-off-white/85",
        !overlay && scrolled && "border-transparent shadow-[0_10px_30px_-18px_rgb(24_54_76/0.35)]",
      )}
    >
      {/* Soft scrim so white text stays legible over any photo. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 -z-10 h-[180%] bg-gradient-to-b from-navy/45 to-transparent transition-opacity duration-300",
          overlay ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Reading progress: draws across as the page scrolls down, retracts on the way up. */}
      <ScrollProgress onDark={overlay} />
      <div className="container-page flex h-header items-center justify-between gap-6 lg:grid lg:grid-cols-[1fr_auto_1fr]">
        {/* Desktop: left nav */}
        <nav aria-label="Main" className="hidden items-center lg:-ml-4 lg:flex">
          <RangeMenu nav={nav} active={isActive(pathname, "/range")} onDark={overlay} onOpenChange={onRangeOpenChange} />
          {LEFT_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={linkClass(isActive(pathname, item.href))}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Wordmark: left on mobile, centred on desktop */}
        <Link href="/" className="-mx-2 flex min-h-tap items-center px-2 lg:mx-0 lg:justify-self-center" aria-label="Duratek home">
          <Wordmark tone={overlay ? "dark" : "light"} className="h-[22px] lg:h-[26px]" />
        </Link>

        {/* Desktop: right nav */}
        <div className="hidden items-center justify-self-end lg:-mr-3 lg:flex">
          <SavedLink onDark={overlay} />
          <SampleTrayLink
            aria-current={isActive(pathname, "/samples") ? "page" : undefined}
            className={linkClass(isActive(pathname, "/samples"))}
          >
            Samples
            <SampleCount />
          </SampleTrayLink>
          <span className={cn("mx-2 h-5 w-px transition-colors duration-300", overlay ? "bg-white/30" : "bg-line")} aria-hidden="true" />
          <Link
            href={TRADE_NAV.href}
            aria-current={isActive(pathname, TRADE_NAV.href) ? "page" : undefined}
            className={cn(
              "flex min-h-tap items-center px-3 text-[0.8125rem] font-medium uppercase tracking-[0.12em] transition-colors duration-300",
              overlay
                ? "text-white/85 hover:text-white"
                : "text-ink-muted hover:text-navy aria-[current=page]:text-green-ink",
            )}
          >
            {TRADE_NAV.label}
          </Link>
        </div>

        {/* Mobile and tablet controls */}
        <div className={cn("-mr-2 flex items-center transition-colors duration-300 lg:hidden", overlay ? "text-white" : "text-navy")}>
          <button
            type="button"
            className="flex size-tap items-center justify-center"
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
            className="flex size-tap items-center justify-center"
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
          "grid transition-[grid-template-rows,opacity] duration-300 ease-calm lg:hidden",
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
