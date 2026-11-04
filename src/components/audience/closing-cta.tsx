"use client";

import { ButtonLink } from "@/components/ui/button";
import { useAudience } from "@/lib/audience";

const CTAS = {
  none: { primary: { href: "/range", label: "Explore the range" }, secondary: { href: "/samples", label: "Order free samples" } },
  homeowner: { primary: { href: "/samples", label: "Order free samples" }, secondary: { href: "/where-to-buy", label: "Where to buy" } },
  trade: { primary: { href: "/trade/apply", label: "Apply for a trade account" }, secondary: { href: "/trade/login", label: "Trade log in" } },
} as const;

/** One primary action, tailored to the audience chosen on the home page. */
export function ClosingCtaActions() {
  const [audience] = useAudience();
  const cta = CTAS[audience ?? "none"];
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
      <ButtonLink href={cta.primary.href} variant="on-dark">
        {cta.primary.label}
      </ButtonLink>
      <ButtonLink href={cta.secondary.href} variant="quiet-on-dark" arrow={false}>
        {cta.secondary.label}
      </ButtonLink>
    </div>
  );
}
