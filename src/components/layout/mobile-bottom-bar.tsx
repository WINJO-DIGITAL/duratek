"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type ComponentProps, type ComponentType, type MouseEvent } from "react";
import { Briefcase, Pin, Planks, Swatches } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { SampleTrayLink } from "@/components/samples/sample-tray-link";
import { isActive, SampleCount } from "./site-header";

/** Samples opens the tray rather than navigating; the rest are plain links. */
function TabLink({ href, ...props }: ComponentProps<typeof Link> & { href: string }) {
  return href === "/samples" ? <SampleTrayLink {...props} /> : <Link href={href} {...props} />;
}

const ITEMS: { href: string; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { href: "/range", label: "Range", icon: Planks },
  { href: "/samples", label: "Samples", icon: Swatches },
  { href: "/where-to-buy", label: "Where to Buy", icon: Pin },
  { href: "/trade", label: "Trade", icon: Briefcase },
];

const PENDING_TIMEOUT = 8000; // ms; drop the optimistic state if a navigation never lands

/**
 * Sticky bottom bar on phones and tablets: the key actions stay one thumb-tap
 * away for fitters on site. Hidden on desktop, where the header nav takes over.
 *
 * The tapped tab responds at once (colour and underline) rather than waiting
 * for the next page to load. Each tab has its own short green underline that
 * draws out from the centre, and the previous one retracts, so there is no
 * marker sliding to or from pages that have no tab.
 */
export function MobileBottomBar() {
  const pathname = usePathname();
  // Optimistic selection, tied to the page it was made on: once the path
  // changes it no longer applies, so it never needs clearing on arrival.
  const [pending, setPending] = useState<{ href: string; from: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingHref = pending && pending.from === pathname ? pending.href : null;

  const onTap = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (isActive(pathname, href) || href === "/samples") return;
    setPending({ href, from: pathname });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPending(null), PENDING_TIMEOUT);
  };

  return (
    <nav
      aria-label="Quick links"
      style={{ viewTransitionName: "bottom-bar" }}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-off-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid h-bottom-bar max-w-xl grid-cols-4">
        {ITEMS.map(({ href, label, icon: IconC }) => {
          const current = isActive(pathname, href);
          const selected = pendingHref ? pendingHref === href : current;
          return (
            <li key={href} className="relative">
              {/* Underline: draws out from the centre when selected, retracts when not. */}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-6 -top-px h-0.5 origin-center bg-green-ink transition-transform duration-300 ease-calm motion-reduce:transition-none",
                  selected ? "scale-x-100" : "scale-x-0",
                )}
              />
              <TabLink
                href={href}
                aria-current={current ? "page" : undefined}
                onClick={(e) => onTap(e, href)}
                className={cn(
                  "group flex h-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium tracking-wide transition-colors duration-300 ease-calm motion-reduce:transition-none",
                  selected ? "text-green-ink" : "text-ink-muted",
                )}
              >
                {/* Lifts slightly when selected; dips under the thumb while pressed. */}
                <span
                  className={cn(
                    "relative transition-transform duration-300 ease-calm group-active:scale-[0.92] group-active:duration-100 motion-reduce:transition-none",
                    selected && "-translate-y-0.5",
                  )}
                >
                  <IconC size={22} />
                  {href === "/samples" && <SampleCount className="absolute -right-3 -top-2" />}
                </span>
                {label}
              </TabLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
