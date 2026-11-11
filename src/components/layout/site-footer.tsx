import { cacheLife } from "next/cache";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { FinishImage } from "@/components/finish/finish-image";
import { getFinishes, grainImage } from "@/lib/catalogue";
import { EDITORIAL, pickByFileName } from "@/lib/catalogue/curation";
import { imagePool } from "@/lib/catalogue/image-pool";
import type { NavData } from "@/lib/catalogue/nav";
import { cn } from "@/lib/cn";
import { colourFamilyLabel } from "@/lib/config";
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
      { href: "/saved", label: "Saved Finishes" },
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
 * tagline, three link groups, shop by colour, a call line); the oversized
 * wordmark; then a darker legal strip with copyright and company details.
 */
export async function SiteFooter({ nav }: { nav: NavData }) {
  const year = await copyrightYear();
  // One tall room photograph opens the footer; each colour family gets a round swatch from one of its finishes.
  const finishes = await getFinishes();
  const photo = pickByFileName(imagePool(finishes, "closeup"), EDITORIAL.footer);
  const swatchFor = (family: string) => {
    const f = finishes.find((x) => x.colourFamily === family);
    return f ? grainImage(f) : undefined;
  };
  const companyLine = [
    COMPANY.legalName,
    COMPANY.registrationNumber && `Company no. ${COMPANY.registrationNumber}`,
    COMPANY.vatNumber && `VAT no. ${COMPANY.vatNumber}`,
    COMPANY.registeredOffice && `Registered office: ${COMPANY.registeredOffice}`,
  ].filter(Boolean);

  return (
    <footer className="on-dark mx-2 overflow-hidden rounded-t-card bg-navy text-on-dark sm:mx-[var(--spacing-gutter)]">
      <div className={cn("container-page grid gap-10 py-section-sm lg:gap-16", photo && "lg:grid-cols-[1fr_1.15fr] lg:items-start")}>
        {/* A room first: the finish is named like a caption, and the photograph opens it. */}
        {photo && (
          <Link
            href={`/range/${photo.finish.slug}`}
            className="group relative block aspect-[5/6] overflow-hidden rounded-card bg-white/5 lg:aspect-[4/5]"
          >
            <FinishImage
              image={photo.image}
              sizes="(min-width: 1024px) 42vw, 100vw"
              quality={80}
              className="object-cover object-center transition-transform duration-[1400ms] ease-calm group-hover:scale-[1.03] motion-reduce:transition-none"
            />
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
            <span className="data absolute inset-x-0 bottom-0 p-5 text-[0.8125rem] text-white/85 sm:p-6">
              {photo.finish.name}
            </span>
          </Link>
        )}

        <div>
          <p className="max-w-[26ch] font-display text-[1.5rem] font-light leading-snug tracking-[-0.02em] text-on-dark">
            Waterproof SPC click flooring, with free samples and trade accounts.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3">
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

          <div className="mt-10">
            <h2 className="eyebrow font-sans text-green-on-navy">Shop by Colour</h2>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
              {nav.colourFamilies.map((c) => {
                const swatch = swatchFor(c);
                return (
                  <li key={c}>
                    <Link
                      href={`/range?colour=${c}`}
                      className="group inline-flex min-h-tap items-center gap-2.5 text-[0.9375rem] text-on-dark underline decoration-white/0 underline-offset-[6px] transition-[text-decoration-color] duration-300 hover:decoration-green-on-navy"
                    >
                      <span className="relative size-[24px] shrink-0 overflow-hidden rounded-full bg-white/10 ring-1 ring-inset ring-white/30">
                        {swatch && <FinishImage image={{ ...swatch, alt: "" }} sizes="24px" />}
                      </span>
                      {colourFamilyLabel(c)}
                    </Link>
                  </li>
                );
              })}
            </ul>
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
