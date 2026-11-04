import type { ReactNode } from "react";
import { PageTransition } from "@/components/layout/page-transition";

/** Plain, readable layout for policy pages: a narrow measure, quiet headings. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <PageTransition>
      <article className="container-page pb-section pt-12 sm:pt-16">
        <header className="max-w-prose">
          <h1 className="text-display-lg text-navy">{title}</h1>
          <p className="mt-4 text-[0.875rem] text-ink-muted">Last updated {updated}</p>
        </header>
        <div className="legal mt-10 max-w-prose space-y-5 text-ink-muted [&_a]:text-navy [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-12 [&_h2]:font-display [&_h2]:text-display-sm [&_h2]:text-navy [&_li]:pl-1 [&_strong]:font-medium [&_strong]:text-navy [&_ul]:list-[square] [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:marker:text-green">
          {children}
        </div>
      </article>
    </PageTransition>
  );
}
