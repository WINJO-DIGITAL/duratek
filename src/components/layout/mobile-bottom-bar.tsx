"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { Briefcase, Pin, Planks, Swatches } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { isActive, SampleCount } from "./site-header";

const ITEMS: { href: string; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { href: "/range", label: "Range", icon: Planks },
  { href: "/samples", label: "Samples", icon: Swatches },
  { href: "/where-to-buy", label: "Where to buy", icon: Pin },
  { href: "/trade", label: "Trade", icon: Briefcase },
];

/**
 * Sticky bottom bar on phones and tablets: the key actions stay one thumb-tap
 * away for fitters on site. Hidden on desktop, where the header nav takes over.
 * A single green marker glides between tabs as the section changes.
 */
export function MobileBottomBar() {
  const pathname = usePathname();
  const activeIndex = ITEMS.findIndex((i) => isActive(pathname, i.href));

  return (
    <nav
      aria-label="Quick links"
      style={{ viewTransitionName: "bottom-bar" }}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-off-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="relative mx-auto max-w-xl">
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-0 left-0 h-0.5 w-1/4 px-6 transition-[translate,opacity] duration-500 ease-calm",
            activeIndex < 0 && "opacity-0",
          )}
          style={{ translate: `${Math.max(activeIndex, 0) * 100}% 0` }}
        >
          <span className="block h-full bg-green-ink" />
        </span>
        <ul className="grid h-bottom-bar grid-cols-4">
          {ITEMS.map(({ href, label, icon: IconC }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium tracking-wide transition-colors duration-300",
                    active ? "text-green-ink" : "text-ink-muted active:text-navy",
                  )}
                >
                  <span className={cn("relative transition-transform duration-500 ease-calm", active && "-translate-y-0.5")}>
                    <IconC size={22} />
                    {href === "/samples" && <SampleCount className="absolute -right-3 -top-2" />}
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
