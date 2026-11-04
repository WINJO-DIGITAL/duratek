import { cacheLife } from "next/cache";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import type { NavData } from "@/lib/catalogue/nav";
import { colourFamilyLabel, STYLE_LABELS } from "@/lib/config";
import { COMPANY, GENERAL_CONTACT, telHref } from "@/lib/contact";
import { FooterContact } from "./footer-contact";

type FooterLink = { href: string; label: string; tel?: boolean };

const HELP: FooterLink[] = [
  { href: "/samples", label: "Free samples" },
  { href: "/where-to-buy", label: "Where to buy" },
  { href: "/warranty", label: "Warranty" },
  { href: "/contact", label: "Contact" },
];

const TRADE: FooterLink[] = [
  { href: "/trade", label: "Trade accounts" },
  { href: "/trade/apply", label: "Apply" },
  { href: "/trade/login", label: "Log in" },
];

const LEGAL: FooterLink[] = [
  { href: "/privacy", label: "Privacy" },
  { href: "/cookies", label: "Cookies" },
  { href: "/terms", label: "Terms" },
];

/** Range column from the live catalogue: every style and colour family that has finishes. */
function rangeLinks(nav: NavData): FooterLink[] {
  return [
    { href: "/range", label: `All ${nav.finishCount} finishes` },
    ...nav.styles.map((s) => ({
      href: `/range?style=${s}`,
      label: STYLE_LABELS[s as keyof typeof STYLE_LABELS] ?? s,
    })),
    ...nav.colourFamilies.map((c) => ({ href: `/range?colour=${c}`, label: colourFamilyLabel(c) })),
    { href: "/inspiration", label: "Inspiration" },
    { href: "/technology", label: "Technology" },
  ];
}

function LinkGroup({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <h2 className="eyebrow font-sans text-green-on-navy">{title}</h2>
      <ul className="mt-3">
        {links.map((l) => (
          <li key={l.href}>
            {l.tel ? (
              <a
                href={l.href}
                className="flex min-h-tap items-center text-[0.9375rem] tabular-nums text-on-dark transition-colors hover:text-white"
              >
                {l.label}
              </a>
            ) : (
              <Link
                href={l.href}
                className="flex min-h-tap items-center text-[0.9375rem] text-on-dark-muted transition-colors hover:text-white"
              >
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Copyright year. Cached (re-checked daily) so the footer can still be prerendered. */
async function copyrightYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

/**
 * Site footer, top to bottom: brand line and link groups (Range, Need help?,
 * Trade); Say hello and Stay in touch (from src/lib/contact.ts, hidden until
 * the client's details are entered); the oversized wordmark; and a darker
 * legal strip with legal links, copyright and registered company details.
 * Newsletter sign-up still to come (needs a consented storage location
 * agreed with the client).
 */
export async function SiteFooter({ nav }: { nav: NavData }) {
  const year = await copyrightYear();
  const help: FooterLink[] = GENERAL_CONTACT.phone
    ? [{ href: telHref(GENERAL_CONTACT.phone), label: GENERAL_CONTACT.phone, tel: true }, ...HELP]
    : HELP;
  const companyLine = [
    COMPANY.legalName,
    COMPANY.registrationNumber && `Company no. ${COMPANY.registrationNumber}`,
    COMPANY.vatNumber && `VAT no. ${COMPANY.vatNumber}`,
    COMPANY.registeredOffice && `Registered office: ${COMPANY.registeredOffice}`,
  ].filter(Boolean);

  return (
    <footer className="on-dark border-t border-white/10 bg-navy text-on-dark">
      <div className="container-page grid gap-12 py-section-sm lg:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="max-w-[14ch] font-display text-display-md text-on-dark">
            Click flooring for homes that <span className="font-light">get used.</span>
          </p>
          <p className="mt-5 max-w-xs text-[0.9375rem] leading-relaxed text-on-dark-muted">
            Waterproof SPC click flooring, with free samples and trade accounts.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
          <LinkGroup title="Range" links={rangeLinks(nav)} />
          <LinkGroup title="Need help?" links={help} />
          <LinkGroup title="Trade" links={TRADE} />
        </nav>
      </div>

      <FooterContact />

      {/* Oversized wordmark: the closing signature of every page. */}
      <div className="container-page pb-10 sm:pb-14" aria-hidden="true">
        <Wordmark tone="dark" className="h-auto w-full" />
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
