import { ButtonLink } from "@/components/ui/button";
import { PageTransition } from "@/components/layout/page-transition";

export default function NotFound() {
  return (
    <PageTransition>
      <div className="container-page py-section">
        <p className="eyebrow">Page not found</p>
        <h1 className="mt-4 max-w-[18ch] text-display-lg text-navy">We couldn&apos;t find that page.</h1>
        <p className="mt-5 max-w-prose text-lede text-ink-muted">
          It may have moved, or the finish may no longer be in the range.
        </p>
        <ButtonLink href="/range" className="mt-10">
          Explore the range
        </ButtonLink>
      </div>
    </PageTransition>
  );
}
