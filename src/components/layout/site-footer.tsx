import { cacheLife } from "next/cache";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { ArrowRight } from "@/components/ui/icons";
import type { NavData } from "@/lib/catalogue/nav";
import { colourFamilyLabel, STYLE_LABELS } from "@/lib/config";
import { COMPANY, GENERAL_CONTACT, telHref } from "@/lib/contact";
import { FooterContact } from "./footer-contact";

type FooterLink = { href: string; label: string };

/** The five places people actually go, set large. */
const PRIMARY: FooterLink[] = [
  { href: "/range", label: "The range" },
  { href: "/inspiration", label: "Inspiration" },
  { href: "/samples", label: "Free samples" },
  { href: "/where-to-buy", label: "Where to buy" },
  { href: "/trade", label: "Trade accounts" },
];

const MORE: FooterLink[] = [
  { href: "/technology", label: "Technology" },
  { href: "/warranty", label: "Warranty" },
  { href: "/saved", label: "Saved finishes" },
  { href: "/contact", label: "Contact" },
  { href: "/trade/login", label: "Trade log in" },
];

const LEGAL: FooterLink[] = [
  { href: "/privacy", label: "Privacy" },
  { href: "/privacy/request", label: "Your data" },
  { href: "/cookies", label: "Cookies" },
  { href: "/terms", label: "Terms" },
];

/** A quiet labelled line of links that wraps. */
function LinkLine({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="eyebrow font-sans text-green-on-navy">{title}</h2>
      <ul className="-ml-1 mt-2 flex flex-wrap gap-x-5">{children}</ul>
    </div>
  );
}

function LineLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="inline-flex min-h-tap items-center px-1 text-[0.9375rem] text-on-dark underline decoration-white/0 underline-offset-[6px] transition-[text-decoration-color] duration-300 hover:decoration-green-on-navy"
      >
        {children}
      </Link>
    </li>
  );
}

/** Copyright year. Cached (re-checked daily) so the footer can still be prerendered. */
async function copyrightYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

/**
 * Site footer, top to bottom: the five primary destinations set large, with
 * a quiet column (description, call us, shop by style and colour, more);
 * Say hello and Stay in touch (from src/lib/contact.ts, hidden until
 * the client's details are entered); the oversized wordmark; and a darker
 * legal strip with legal links, copyright and registered company details.
 * Newsletter sign-up still to come (needs a consented storage location
 * agreed with the client).
 */
export async function SiteFooter({ nav }: { nav: NavData }) {
  const year = await copyrightYear();
  const companyLine = [
    COMPANY.legalName,
    COMPANY.registrationNumber && `Company no. ${COMPANY.registrationNumber}`,
    COMPANY.vatNumber && `VAT no. ${COMPANY.vatNumber}`,
    COMPANY.registeredOffice && `Registered office: ${COMPANY.registeredOffice}`,
  ].filter(Boolean);

  return (
    <footer className="on-dark mx-2 overflow-hidden rounded-t-card bg-navy text-on-dark sm:mx-[var(--spacing-gutter)]">
      <div className="container-page grid gap-12 py-section-sm lg:grid-cols-[1.3fr_1fr] lg:gap-20">
        {/* Primary destinations, large: what people come to the footer for. */}
        <nav aria-label="Footer">
          <ul className="border-t border-white/15">
            {PRIMARY.map((l) => (
              <li key={l.href} className="border-b border-white/15">
                <Link
                  href={l.href}
                  className="group flex min-h-16 items-center justify-between gap-6 py-3 font-display text-[1.75rem] font-light leading-tight text-on-dark transition-colors duration-300 hover:text-white sm:min-h-20 sm:text-[2.25rem]"
                >
                  {l.label}
                  <ArrowRight
                    size={24}
                    className="shrink-0 text-green-on-navy transition-transform duration-300 ease-calm group-hover:translate-x-1 motion-reduce:transition-none"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-8 lg:pt-1">
          <p className="max-w-[24ch] text-lede text-on-dark/85">
            Waterproof SPC click flooring, with free samples and trade accounts.
          </p>
          {GENERAL_CONTACT.phone && (
            <LinkLine title="Call us">
              <li>
                <a
                  href={telHref(GENERAL_CONTACT.phone)}
                  className="inline-flex min-h-tap items-center px-1 text-[0.9375rem] tabular-nums text-on-dark hover:text-white"
                >
                  {GENERAL_CONTACT.phone}
                </a>
              </li>
            </LinkLine>
          )}
          {nav.styles.length > 1 && (
            <LinkLine title="Shop by style">
              {nav.styles.map((st) => (
                <LineLink key={st} href={`/range?style=${st}`}>
                  {STYLE_LABELS[st as keyof typeof STYLE_LABELS] ?? st}
                </LineLink>
              ))}
            </LinkLine>
          )}
          <LinkLine title="Shop by colour">
            {nav.colourFamilies.map((c) => (
              <LineLink key={c} href={`/range?colour=${c}`}>
                {colourFamilyLabel(c)}
              </LineLink>
            ))}
          </LinkLine>
          <LinkLine title="More">
            {MORE.map((l) => (
              <LineLink key={l.href} href={l.href}>
                {l.label}
              </LineLink>
            ))}
          </LinkLine>
        </div>
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
