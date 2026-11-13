import Link from "next/link";
import type { ReactNode } from "react";
import { adminAreasFor } from "@/lib/auth/admin";
import type { AdminArea } from "@/lib/auth/permissions";
import { getAccount } from "@/lib/auth/session";
import { cn } from "@/lib/cn";



/** The owner's screens: a quiet header with the tabs this person may open. */
export async function AdminShell({
  current,
  title,
  intro,
  children,
}: {
  current: AdminArea;
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  const account = await getAccount();
  const tabs = account ? adminAreasFor(account) : [];
  return (
    <div className="container-page pb-section pt-12 sm:pt-16">
      <p className="eyebrow">Owner admin</p>
      <nav aria-label="Admin" className="scrollbar-none -mx-gutter mt-4 flex gap-2 overflow-x-auto px-gutter">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.href === current ? "page" : undefined}
            className={cn(
              "flex min-h-tap shrink-0 items-center rounded-control border px-4 text-[0.9375rem] transition-colors",
              t.href === current ? "border-navy bg-navy text-off-white" : "border-navy/20 text-navy hover:border-navy",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <h1 className="mt-8 text-display-lg text-navy">{title}</h1>
      <div className="mt-lede max-w-[60ch] text-support text-navy/75">{intro}</div>
      <div className="mt-10">{children}</div>
    </div>
  );
}
