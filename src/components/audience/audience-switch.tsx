"use client";

import { ButtonLink } from "@/components/ui/button";
import { useAudience, type Audience } from "@/lib/audience";
import { cn } from "@/lib/cn";

const PATHS: {
  id: Exclude<Audience, null>;
  label: string;
  title: string;
  body: string;
  primary: { href: string; label: string };
  secondary: { href: string; label: string };
}[] = [
  {
    id: "homeowner",
    label: "Homeowner",
    title: "Choosing for your home",
    body: "Order up to three free samples, see them in your own light, then find a stockist or buy online.",
    primary: { href: "/samples", label: "Order free samples" },
    secondary: { href: "/where-to-buy", label: "Where to buy" },
  },
  {
    id: "trade",
    label: "Trade professional",
    title: "Fitting, supplying or specifying",
    body: "Open a trade account to see your prices, download technical documents and share shortlists with customers.",
    primary: { href: "/trade/apply", label: "Apply for a trade account" },
    secondary: { href: "/trade/login", label: "Trade log in" },
  },
];

/**
 * "What describes you best?" Tailors the calls to action and remembers the
 * choice for the session. Not a gate: both paths are always visible.
 */
export function AudienceSwitch() {
  const [audience, setAudience] = useAudience();

  return (
    <div>
      <div role="group" aria-label="What describes you best?" className="inline-flex border border-navy/20 p-1">
        {PATHS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={audience === p.id}
            onClick={() => setAudience(audience === p.id ? null : p.id)}
            className={cn(
              "min-h-tap px-4 text-[0.9375rem] font-medium transition-colors duration-300 sm:px-6",
              audience === p.id ? "bg-navy text-cream" : "text-navy hover:bg-sage",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-px bg-stone md:grid-cols-2">
        {PATHS.map((p) => {
          const chosen = audience === p.id;
          const muted = audience !== null && !chosen;
          return (
            <section
              key={p.id}
              aria-labelledby={`audience-${p.id}`}
              className={cn(
                "flex flex-col p-6 transition-colors duration-500 sm:p-10",
                chosen ? "on-dark bg-navy text-on-dark" : "bg-cream",
              )}
            >
              <p className={cn("eyebrow", chosen && "text-green-light")}>{p.label}</p>
              <h3 id={`audience-${p.id}`} className={cn("mt-3 text-display-sm", chosen ? "text-on-dark" : "text-navy")}>
                {p.title}
              </h3>
              <p className={cn("mt-3 max-w-md", chosen ? "text-on-dark-muted" : "text-ink-muted")}>{p.body}</p>
              <div className="mt-auto flex flex-wrap items-center gap-x-8 gap-y-2 pt-8">
                <ButtonLink href={p.primary.href} variant={chosen ? "on-dark" : muted ? "outline" : "primary"}>
                  {p.primary.label}
                </ButtonLink>
                <ButtonLink href={p.secondary.href} variant={chosen ? "quiet-on-dark" : "quiet"} arrow={false}>
                  {p.secondary.label}
                </ButtonLink>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
