import { cacheLife } from "next/cache";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { COMPANY, GENERAL_CONTACT, telHref } from "@/lib/contact";
import { FooterContact } from "./footer-contact";

type FooterLink = { href: string; label: string };

/** Short groups: every destination once, the header and bottom bar already cover the rest. */
const GROUPS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Shop",
    links: [
      { href: "/range", label: "The Range" },
      { href: "/samples", label: "Free Samples" },
      { href: "/where-to-buy", label: "Where to Buy" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/inspiration", label: "Inspiration" },
      { href: "/technology", label: "Technology" },
      { href: "/warranty", label: "Warranty" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Trade",
    links: [
      { href: "/trade", label: "Trade Accounts" },
      { href: "/trade/login", label: "Trade Log In" },
    ],
  },
];

const LEGAL: FooterLink[] = [
  { href: "/privacy", label: "Privacy" },
  { href: "/privacy/request", label: "Your Data" },
  { href: "/cookies", label: "Cookies" },
  { href: "/terms", label: "Terms" },
];

/** Copyright year. Cached (re-checked daily) so the footer can still be prerendered. */
async function copyrightYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

/**
 * Site footer, top to bottom: a grain close-up beside a short column (the
 * tagline, three link groups, a call line); the wordmark, signed small; then
 * a darker legal strip with copyright and company details.
 */
export async function SiteFooter() {
  const year = await copyrightYear();
  const companyLine = [
    COMPANY.legalName,
    COMPANY.registrationNumber && `Company no. ${COMPANY.registrationNumber}`,
    COMPANY.vatNumber && `VAT no. ${COMPANY.vatNumber}`,
    COMPANY.registeredOffice && `Registered office: ${COMPANY.registeredOffice}`,
  ].filter(Boolean);

  return (
    <footer className="on-dark mx-2 overflow-hidden rounded-t-card bg-navy text-on-dark sm:mx-[var(--spacing-gutter)]">
      <div className="container-page grid gap-10 py-section-sm lg:gap-16">
        <div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3">
            {GROUPS.map((g) => (
              <nav key={g.title} aria-label={g.title}>
                <h2 className="eyebrow font-sans text-green-on-navy">{g.title}</h2>
                <ul className="mt-3 space-y-1">
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="inline-flex min-h-tap items-center text-[1rem] text-on-dark underline decoration-white/0 underline-offset-[6px] transition-[text-decoration-color] duration-300 hover:decoration-green-on-navy"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          {GENERAL_CONTACT.phone && (
            <p className="mt-8 text-[0.9375rem] text-on-dark/85">
              Call us{" "}
              <a href={telHref(GENERAL_CONTACT.phone)} className="tabular-nums text-on-dark underline underline-offset-4 hover:text-white">
                {GENERAL_CONTACT.phone}
              </a>
            </p>
          )}
        </div>
      </div>

      <FooterContact />

      {/* The wordmark, signed small: the closing signature of every page. */}
      <div className="container-page pb-8 sm:pb-10" aria-hidden="true">
        <Wordmark tone="dark" className="h-auto! w-44! sm:w-56!" />
      </div>

      <div className="bg-navy-deep">
        <div className="container-page flex flex-col gap-3 py-6 text-[0.8125rem] text-on-dark-muted lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <nav aria-label="Legal">
            <ul className="-ml-3 flex flex-wrap">
              {LEGAL.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="flex min-h-tap items-center px-3 transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="space-y-1 lg:text-right">
            <p>© {year} Duratek. All rights reserved.</p>
            {companyLine.length > 0 && <p>{companyLine.join(" · ")}</p>}
          </div>
        </div>
      </div>
    </footer>
  );
}
