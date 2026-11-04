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
 */
export function MobileBottomBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Quick links"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-off-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden"
    >
      <ul className="mx-auto grid h-bottom-bar max-w-xl grid-cols-4">
        {ITEMS.map(({ href, label, icon: IconC }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium tracking-wide",
                  active ? "text-green-ink" : "text-ink-muted",
                )}
              >
                <span className="relative">
                  <IconC size={22} />
                  {href === "/samples" && <SampleCount className="absolute -right-3 -top-2" />}
                </span>
                {label}
                {active && <span className="absolute inset-x-6 top-0 h-0.5 bg-green-ink" aria-hidden="true" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
