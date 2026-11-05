"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight } from "@/components/ui/icons";
import type { NavData } from "@/lib/catalogue/nav";
import { cn } from "@/lib/cn";
import { colourFamilyLabel, STYLE_LABELS } from "@/lib/config";
import { NavSwatch } from "./nav-swatch";

const OPEN_DELAY = 120; // hover intent, so passing the cursor over doesn't open it
const CLOSE_DELAY = 220; // grace period to move the cursor into the panel

/**
 * Desktop "Range" dropdown. Hover opens it after a short delay; the chevron
 * button opens it for keyboard and touch users (and keeps a hover-opened
 * panel open). Escape, clicking outside or leaving closes it.
 * "Range" itself stays a normal link to /range.
 */
export function RangeMenu({
  nav,
  active,
  onDark = false,
  onOpenChange,
}: {
  nav: NavData;
  active: boolean;
  /** Header is transparent over a dark hero: use light text. */
  onDark?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  // How the panel was opened. Hovering the chevron opens it before the click
  // lands, so a click on a hover-opened panel keeps it open instead of
  // closing it; only a click-opened panel toggles shut.
  const openedBy = useRef<"hover" | "click">("hover");

  // Closes itself when the route changes.
  const isOpen = open && openedOn === pathname;

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  const schedule = (next: boolean, delay: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setOpen(next);
      if (next) {
        openedBy.current = "hover";
        setOpenedOn(pathname);
      }
    }, delay);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [isOpen]);

  const close = () => setOpen(false);

  return (
    <div
      ref={root}
      data-open={isOpen || undefined}
      className="flex items-center"
      onMouseEnter={() => schedule(true, OPEN_DELAY)}
      onMouseLeave={() => schedule(false, CLOSE_DELAY)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) close();
      }}
    >
      <Link
        href="/range"
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex min-h-tap items-center pl-4 pr-1 text-[0.9375rem] transition-colors duration-300",
          onDark
            ? "text-white hover:text-white/80"
            : "text-navy hover:text-green-ink",
          "after:absolute after:inset-x-4 after:bottom-2 after:right-1 after:h-px after:origin-left after:scale-x-0 after:bg-green after:transition-transform after:duration-300",
          (active || isOpen) && "after:scale-x-100",
        )}
      >
        Range
      </Link>
      <button
        ref={toggle}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => {
          clearTimeout(timer.current);
          const next = isOpen && openedBy.current === "click" ? false : true;
          openedBy.current = "click";
          setOpen(next);
          setOpenedOn(pathname);
        }}
        className={cn(
          "-mx-1.5 flex size-tap items-center justify-center transition-colors duration-300",
          onDark ? "text-white" : "text-navy hover:text-green-ink",
        )}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden="true"
          className={cn(
            "transition-transform duration-300 ease-calm",
            isOpen && "rotate-180",
          )}
        >
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
        <span className="sr-only">
          {isOpen ? "Close range menu" : "Open range menu"}
        </span>
      </button>

      {/* Dims and softens the page behind the open panel. */}
      <div
        aria-hidden="true"
        className="dropdown-scrim absolute inset-x-0 top-full h-[100dvh] bg-navy/15"
      />

      {/* Panel spans the full width under the header and unfolds from it. */}
      <div
        id={panelId}
        role="region"
        aria-label="The range"
        inert={!isOpen}
        className="dropdown-panel absolute inset-x-0 top-full border-b border-line bg-off-white shadow-card-hover"
      >
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 block h-px bg-green"
        />
        {/* Always rendered so the swatch photos load with the page. */}
        <div className="container-page grid grid-cols-12 gap-10 py-10">
          <div className="col-span-3">
            <p className="eyebrow">The collection</p>
            <Link
              href="/range"
              onClick={close}
              className="group mt-3 inline-flex items-center gap-3 font-display text-display-sm text-navy"
            >
              All {nav.finishCount} finishes
              <ArrowRight
                size={20}
                className="text-green transition-transform duration-500 ease-calm group-hover:translate-x-1"
              />
            </Link>
            <ul className="mt-5 space-y-1">
              {nav.styles.map((s) => (
                <li key={s}>
                  <Link
                    href={`/range?style=${s}`}
                    onClick={close}
                    className="nav-link"
                  >
                    {STYLE_LABELS[s as keyof typeof STYLE_LABELS] ?? s}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-span-2">
            <p className="eyebrow">By colour</p>
            <ul className="mt-4 space-y-1">
              {nav.colourFamilies.map((c) => (
                <li key={c}>
                  <Link
                    href={`/range?colour=${c}`}
                    onClick={close}
                    className="nav-link"
                  >
                    {colourFamilyLabel(c)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-span-2">
            <p className="eyebrow">Discover</p>
            <ul className="mt-4 space-y-1">
              {[
                { href: "/inspiration", label: "Inspiration" },
                { href: "/technology", label: "Technology" },
                { href: "/warranty", label: "Warranty" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} onClick={close} className="nav-link">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-span-5">
            <div className="grid grid-cols-4 gap-4">
              {nav.featured.map((f) => (
                <NavSwatch
                  key={f.id}
                  finish={f}
                  onNavigate={close}
                  eager
                  sizes="140px"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
