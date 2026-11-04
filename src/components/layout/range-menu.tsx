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
 * button opens it for keyboard and touch users. Escape or leaving closes it.
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
  const [hasOpened, setHasOpened] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

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
        setOpenedOn(pathname);
        setHasOpened(true);
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
          "relative flex min-h-tap items-center pl-4 pr-1 text-[0.9375rem] transition-colors duration-500",
          onDark ? "text-white hover:text-white/80" : "text-navy hover:text-green-ink",
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
          setOpen(!isOpen);
          setOpenedOn(pathname);
          setHasOpened(true);
        }}
        className={cn(
          "flex size-8 items-center justify-center transition-colors duration-500",
          onDark ? "text-white" : "text-navy hover:text-green-ink",
        )}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden="true"
          className={cn("transition-transform duration-500 ease-calm", isOpen && "rotate-180")}
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        <span className="sr-only">{isOpen ? "Close range menu" : "Open range menu"}</span>
      </button>

      {/* Panel spans the full width under the header. */}
      <div
        id={panelId}
        role="region"
        aria-label="The range"
        inert={!isOpen}
        className={cn(
          "absolute inset-x-0 top-full border-b border-line bg-off-white shadow-[0_24px_48px_-24px_rgb(24_54_76/0.25)]",
          "transition-[opacity,translate,visibility] duration-500 ease-calm",
          isOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0",
        )}
      >
        {hasOpened && (
          <div className={cn("container-page grid grid-cols-12 gap-10 py-10", isOpen && "stagger-in")}>
            <div className="col-span-3" style={{ "--i": 0 } as React.CSSProperties}>
              <p className="eyebrow">The collection</p>
              <Link
                href="/range"
                onClick={close}
                className="group mt-3 inline-flex items-center gap-3 font-display text-display-sm text-navy"
              >
                All {nav.finishCount} finishes
                <ArrowRight size={20} className="text-green transition-transform duration-500 ease-calm group-hover:translate-x-1" />
              </Link>
              <ul className="mt-5 space-y-1">
                {nav.styles.map((s) => (
                  <li key={s}>
                    <Link href={`/range?style=${s}`} onClick={close} className="nav-link">
                      {STYLE_LABELS[s as keyof typeof STYLE_LABELS] ?? s}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="col-span-2" style={{ "--i": 1 } as React.CSSProperties}>
              <p className="eyebrow">By colour</p>
              <ul className="mt-4 space-y-1">
                {nav.colourFamilies.map((c) => (
                  <li key={c}>
                    <Link href={`/range?colour=${c}`} onClick={close} className="nav-link">
                      {colourFamilyLabel(c)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="col-span-2" style={{ "--i": 2 } as React.CSSProperties}>
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
            <div className="col-span-5 grid grid-cols-4 gap-4" style={{ "--i": 3 } as React.CSSProperties}>
              {nav.featured.map((f) => (
                <NavSwatch key={f.id} finish={f} onNavigate={close} sizes="140px" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
