"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type RefObject } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { ArrowRight, Close } from "@/components/ui/icons";
import type { NavData } from "@/lib/catalogue/nav";
import { cn } from "@/lib/cn";
import { PRIMARY_NAV, TRADE_NAV } from "@/lib/config";
import { NavSwatch } from "./nav-swatch";
import { SampleCount } from "./sample-count";

const SECONDARY = [
  { href: "/technology", label: "Technology" },
  { href: "/warranty", label: "Warranty" },
  { href: "/contact", label: "Contact" },
  { href: TRADE_NAV.href, label: "Trade accounts" },
];

const CLOSE_FALLBACK = 600; // ms; a little longer than the CSS close transition

/**
 * Animated close. The sheet stays modal (in the top layer, full screen) while
 * the curtain rolls up, and only then is the dialog closed. Closing first and
 * animating after relies on `transition-behavior: allow-discrete` for
 * `overlay`, which iOS Safari lacks: there the sheet dropped out of the top
 * layer mid-animation and rendered, half laid out, under the header.
 */
export function closeMenu(dialog: HTMLDialogElement | null) {
  if (!dialog?.open || "closing" in dialog.dataset) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    dialog.close();
    return;
  }
  dialog.dataset.closing = "";
  const done = () => {
    dialog.removeEventListener("transitionend", onEnd);
    clearTimeout(fallback);
    delete dialog.dataset.closing;
    if (dialog.open) dialog.close();
  };
  const onEnd = (e: TransitionEvent) => {
    if (e.target === dialog && e.propertyName === "clip-path") done();
  };
  dialog.addEventListener("transitionend", onEnd);
  const fallback = setTimeout(done, CLOSE_FALLBACK);
}

/**
 * Full-screen menu for phones and tablets. Native <dialog> gives focus
 * trapping; CSS (.menu-sheet) unfolds it on open, closeMenu() rolls it up,
 * and items stagger in each time it opens.
 */
export function MobileMenu({ nav, ref }: { nav: NavData; ref: RefObject<HTMLDialogElement | null> }) {
  const pathname = usePathname();
  // Remount the content on each open so the stagger replays.
  const [openCount, setOpenCount] = useState(0);
  const close = () => closeMenu(ref.current);

  return (
    <dialog
      ref={ref}
      aria-label="Menu"
      className="menu-sheet fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-off-white p-0 text-navy open:flex open:flex-col lg:hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      onCancel={(e) => {
        // Escape: run the same animated close instead of the instant one.
        e.preventDefault();
        close();
      }}
      onToggle={(e) => {
        if ((e.currentTarget as HTMLDialogElement).open) setOpenCount((n) => n + 1);
      }}
    >
      <div className="container-page relative flex h-header shrink-0 items-center justify-between border-b border-line">
        <span aria-hidden="true" className="dropdown-line absolute inset-x-0 -bottom-px block h-px bg-green" />
        <Link href="/" onClick={close} aria-label="Duratek home" className="-mx-2 flex min-h-tap items-center px-2">
          <Wordmark className="h-[22px]" />
        </Link>
        <button type="button" className="-mr-2 flex size-tap items-center justify-center" onClick={close} autoFocus>
          <Close />
          <span className="sr-only">Close menu</span>
        </button>
      </div>

      <nav aria-label="Menu" key={openCount} className="container-page flex flex-1 flex-col overflow-y-auto pb-10 pt-4">
        <ul className="stagger-in flex flex-col">
          {[{ href: "/", label: "Home" }, ...PRIMARY_NAV].map((item, i) => {
            const current = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href} style={{ "--i": i } as React.CSSProperties} className="border-b border-line">
                <Link
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  onClick={close}
                  className="group flex min-h-16 items-center justify-between gap-4"
                >
                  {/* Green underline draws in under the label: full for the current page, on hover otherwise. */}
                  <span
                    className={cn(
                      "relative font-display text-display-sm transition-colors duration-300",
                      "after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:bg-green after:transition-transform after:duration-500 after:ease-calm",
                      current
                        ? "text-green-ink after:scale-x-100"
                        : "after:scale-x-0 group-hover:text-green-ink group-hover:after:scale-x-100 group-focus-visible:after:scale-x-100",
                    )}
                  >
                    {item.label}
                  </span>
                  {item.href === "/samples" ? (
                    <SampleCount />
                  ) : (
                    <ArrowRight
                      size={18}
                      className="-translate-x-2 text-green opacity-0 transition-[opacity,translate] duration-500 ease-calm group-hover:translate-x-0 group-hover:opacity-100"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {nav.featured.length > 0 && (
          <div className="stagger-in mt-10">
            <div style={{ "--i": 6 } as React.CSSProperties}>
              <div className="flex items-baseline justify-between">
                <p className="eyebrow">Finishes</p>
                <Link href="/range" onClick={close} className="text-[0.875rem] text-navy underline-offset-4 hover:underline">
                  All {nav.finishCount}
                </Link>
              </div>
              <div className="swatch-reveal scrollbar-none -mx-[var(--spacing-gutter)] mt-4 flex snap-x scroll-px-[var(--spacing-gutter)] gap-3 overflow-x-auto px-[var(--spacing-gutter)] sm:grid sm:grid-cols-4 sm:overflow-visible">
                {nav.featured.map((f, i) => (
                  <NavSwatch
                    key={f.id}
                    finish={f}
                    onNavigate={close}
                    sizes="(min-width: 640px) 22vw, 36vw"
                    className="w-[36vw] shrink-0 snap-start sm:w-auto"
                    style={{ "--i": i + 4 } as React.CSSProperties}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <ul className="stagger-in mt-10 grid grid-cols-2 gap-x-6">
          {SECONDARY.map((item, i) => (
            <li key={item.href} style={{ "--i": 7 + i } as React.CSSProperties}>
              <Link href={item.href} onClick={close} className="nav-link min-h-tap">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </dialog>
  );
}
