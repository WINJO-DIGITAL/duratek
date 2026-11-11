import { cacheLife } from "next/cache";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { FinishImage } from "@/components/finish/finish-image";
import { ArrowRight } from "@/components/ui/icons";
import { getFinishes, grainImage } from "@/lib/catalogue";
import { EDITORIAL, pickByFileName } from "@/lib/catalogue/curation";
import { imagePool } from "@/lib/catalogue/image-pool";
import type { NavData } from "@/lib/catalogue/nav";
import { cn } from "@/lib/cn";
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
  // One tall room photograph opens the footer; each colour family gets a round swatch from one of its finishes.
  const finishes = await getFinishes();
  const photo = pickByFileName(imagePool(finishes, "room"), EDITORIAL.footer);
  const photoRoom = photo?.image.alt.match(/\bin an? (.+)$/i)?.[1];
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
              className="object-[50%_70%] transition-transform duration-[1400ms] ease-calm group-hover:scale-[1.03] motion-reduce:transition-none"
            />
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
            <span className="data absolute inset-x-0 bottom-0 p-5 text-[0.8125rem] text-white/85 sm:p-6">
              {photo.finish.name}
              {photoRoom && <> · {photoRoom}</>}
            </span>
          </Link>
        )}

        <div>
          {/* The five places people actually go, two to a row. */}
          <nav aria-label="Footer">
            <ul className="grid grid-cols-2 border-t border-white/15">
              {PRIMARY.map((l) => (
                <li
                  key={l.href}
                  className="border-b border-white/15 even:pl-4 last:col-span-2 sm:even:pl-6 [&:nth-child(odd):not(:last-child)]:border-r [&:nth-child(odd):not(:last-child)]:pr-4 sm:[&:nth-child(odd):not(:last-child)]:pr-6"
                >
                  <Link
                    href={l.href}
                    className="group flex min-h-16 items-center justify-between gap-3 py-3 font-display text-[1.3125rem] font-light leading-tight tracking-[-0.03em] text-on-dark transition-colors duration-300 hover:text-white sm:min-h-20 sm:text-[1.75rem] lg:text-[2rem]"
                  >
                    {l.label}
                    <ArrowRight
                      size={20}
                      className="shrink-0 text-green-on-navy transition-transform duration-300 ease-calm group-hover:translate-x-1 motion-reduce:transition-none"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-8 space-y-8">
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
            <div>
              <h2 className="eyebrow font-sans text-green-on-navy">Shop by colour</h2>
              <ul className="mt-3 grid grid-cols-2 gap-x-6 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                {nav.colourFamilies.map((c) => {
                  const swatch = swatchFor(c);
                  return (
                    <li key={c}>
                      <Link
                        href={`/range?colour=${c}`}
                        className="group flex min-h-12 items-center gap-3 text-[0.9375rem] text-on-dark underline decoration-white/0 underline-offset-[6px] transition-[text-decoration-color] duration-300 hover:decoration-green-on-navy"
                      >
                        <span className="relative size-[26px] shrink-0 overflow-hidden rounded-full bg-white/10 ring-1 ring-inset ring-white/30">
                          {swatch && <FinishImage image={{ ...swatch, alt: "" }} sizes="26px" />}
                        </span>
                        {colourFamilyLabel(c)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
            {nav.styles.length > 1 && (
              <LinkLine title="Shop by style">
                {nav.styles.map((st) => (
                  <LineLink key={st} href={`/range?style=${st}`}>
                    {STYLE_LABELS[st as keyof typeof STYLE_LABELS] ?? st}
                  </LineLink>
                ))}
              </LinkLine>
            )}
            <LinkLine title="More">
              {MORE.map((l) => (
                <LineLink key={l.href} href={l.href}>
                  {l.label}
                </LineLink>
              ))}
            </LinkLine>
          </div>
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
