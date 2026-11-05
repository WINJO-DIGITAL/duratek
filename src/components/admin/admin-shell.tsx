import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/admin/prices", label: "Prices" },
  { href: "/admin/accounts", label: "Trade accounts" },
] as const;

/** The owner's screens: a quiet header with two tabs. */
export function AdminShell({
  current,
  title,
  intro,
  children,
}: {
  current: (typeof TABS)[number]["href"];
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="container-page pb-section pt-12 sm:pt-16">
      <p className="eyebrow">Owner admin</p>
      <nav aria-label="Admin" className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.href === current ? "page" : undefined}
            className={cn(
              "flex min-h-tap items-center rounded-control border px-4 text-[0.9375rem] transition-colors",
              t.href === current ? "border-navy bg-navy text-off-white" : "border-navy/20 text-navy hover:border-navy",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <h1 className="mt-8 text-display-lg text-navy">{title}</h1>
      <p className="mt-lede max-w-[60ch] text-support text-navy/75">{intro}</p>
      <div className="mt-10">{children}</div>
    </div>
  );
}
