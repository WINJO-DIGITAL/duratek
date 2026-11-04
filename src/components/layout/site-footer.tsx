import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

const GROUPS = [
  {
    title: "Range",
    links: [
      { href: "/range", label: "All finishes" },
      { href: "/inspiration", label: "Inspiration" },
      { href: "/technology", label: "Technology" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/samples", label: "Free samples" },
      { href: "/where-to-buy", label: "Where to buy" },
      { href: "/warranty", label: "Warranty" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Trade",
    links: [
      { href: "/trade", label: "Trade accounts" },
      { href: "/trade/apply", label: "Apply" },
      { href: "/trade/login", label: "Log in" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/cookies", label: "Cookies" },
      { href: "/terms", label: "Terms" },
    ],
  },
] as const;

/*
 * Still to add once the client supplies them: contact details, registered
 * company details and the newsletter sign-up (needs a consented storage
 * location agreed with the client).
 */
export function SiteFooter() {
  return (
    <footer className="on-dark bg-navy-deep text-on-dark">
      <div className="container-page grid gap-12 py-section-sm lg:grid-cols-[1fr_2fr]">
        <div className="max-w-xs">
          <Wordmark tone="dark" className="text-[1.75rem]" />
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-on-dark-muted">
            Waterproof SPC click flooring. Beautifully considered. Built to perform.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <h2 className="eyebrow font-sans text-green-light">{group.title}</h2>
              <ul className="mt-3">
                {group.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="flex min-h-tap items-center text-[0.9375rem] text-on-dark-muted transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="container-page py-6 text-[0.8125rem] text-on-dark-muted">
          © Duratek. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
