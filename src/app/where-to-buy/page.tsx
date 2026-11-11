import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/content/page-hero";
import { SectionIntro } from "@/components/content/section-intro";
import { PageTransition } from "@/components/layout/page-transition";
import { OrderSamplesButton } from "@/components/samples/order-samples-button";
import { ButtonLink } from "@/components/ui/button";
import { ArrowUpRight, Phone } from "@/components/ui/icons";
import { PostcodeSearch } from "@/components/where-to-buy/postcode-search";
import { getFinishes, getOnlineRetailers } from "@/lib/catalogue";
import { pageHero } from "@/lib/catalogue/heroes";
import { normalisePostcode } from "@/lib/postcode";
import {
  formatMiles,
  geocodePostcode,
  getStockists,
  nearest,
  STOCKIST_TYPE_LABELS,
  type Stockist,
} from "@/lib/where-to-buy";

export const metadata: Metadata = {
  title: "Where to buy",
  description: "Find a Duratek stockist near you by postcode, or buy Duratek flooring online.",
};

const MAX_MILES = 60;
const MAX_RESULTS = 10;

export default async function WhereToBuyPage({ searchParams }: PageProps<"/where-to-buy">) {
  const hero = pageHero(await getFinishes(), "where-to-buy");
  return (
    <PageTransition>
      <>
        <PageHero image={hero?.image} focus="object-[50%_58%]">
          <SectionIntro as="h1" size="lg" tone="dark" eyebrow="Where to buy" title="Find duratek Near You.">
            <p>See it at a local stockist, or buy it online.</p>
          </SectionIntro>
        </PageHero>
        <header className="container-page pb-section-sm pt-8 sm:pt-10">
          <div>
            <Suspense fallback={<PostcodeSearch id="postcode" className="lg:justify-self-end" />}>
              <SearchWithValue searchParams={searchParams} />
            </Suspense>
          </div>
        </header>

        {/* Results and the retailers arrive together, behind a placeholder that
            keeps the footer below the fold, so nothing on screen moves. */}
        <Suspense fallback={<div aria-hidden="true" className="min-h-[70svh]" />}>
          <Results searchParams={searchParams} />
          <OnlineRetailers />
        </Suspense>
      </>
    </PageTransition>
  );
}

async function postcodeParam(searchParams: PageProps<"/where-to-buy">["searchParams"]) {
  const raw = (await searchParams).postcode;
  return (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 12) ?? "";
}

async function SearchWithValue({ searchParams }: { searchParams: PageProps<"/where-to-buy">["searchParams"] }) {
  const raw = await postcodeParam(searchParams);
  return <PostcodeSearch id="postcode" defaultValue={normalisePostcode(raw) ?? raw} className="lg:justify-self-end" />;
}

async function Results({ searchParams }: { searchParams: PageProps<"/where-to-buy">["searchParams"] }) {
  const raw = await postcodeParam(searchParams);
  if (!raw) return null;

  const postcode = normalisePostcode(raw);
  if (!postcode) {
    return <Notice title="That doesn't look like a UK postcode.">Check it and try again, for example SW1A 1AA.</Notice>;
  }

  const [geo, stockists, finishes] = await Promise.all([geocodePostcode(postcode), getStockists(), getFinishes()]);
  const finishNames = new Map(finishes.map((f) => [f.id, f.name]));
  if (!geo.ok) {
    return geo.reason === "not-found" ? (
      <Notice title={`We couldn't find ${postcode}.`}>Check the postcode and try again.</Notice>
    ) : (
      <Notice title="We couldn't look up that postcode just now.">Please try again in a moment.</Notice>
    );
  }

  const results = nearest(geo.point, stockists, { maxMiles: MAX_MILES, limit: MAX_RESULTS });

  return (
    <section aria-labelledby="results-heading" aria-live="polite" className="container-page pb-section-sm">
      <div className="border-t border-line pt-10">
        {results.length > 0 ? (
          <>
            <h2 id="results-heading" className="text-display-sm text-navy">
              Nearest to {postcode}
            </h2>
            <ul className="mt-6 border-t border-line">
              {results.map((s) => (
                <StockistRow key={s.id} stockist={s} miles={s.miles} finishNames={finishNames} />
              ))}
            </ul>
            <p className="mt-6 max-w-prose text-[0.8125rem] text-ink-muted">
              Stockists are independent businesses and set their own prices and stock. The recommended retail price on this site is a guide only.
            </p>
          </>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-xl">
              <h2 id="results-heading" className="text-display-sm text-navy">
                No stockists near {postcode} yet.
              </h2>
              <p className="mt-3 text-ink-muted">
                We&rsquo;re adding showrooms and fitters across the UK. In the meantime, order free samples to see the
                finishes at home, or buy Duratek online below.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <OrderSamplesButton />
              <ButtonLink href="#online" variant="quiet" arrow={false}>
                Buy Online
              </ButtonLink>
              <ButtonLink href="/contact" variant="quiet" arrow={false}>
                Send Us an Enquiry
              </ButtonLink>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-live="polite" className="container-page pb-section-sm">
      <div className="notice px-5 py-4 sm:px-6">
        <p className="font-medium text-navy">{title}</p>
        <p className="mt-1 text-[0.9375rem] text-ink-muted">{children}</p>
      </div>
    </section>
  );
}

function StockistRow({ stockist: s, miles, finishNames }: { stockist: Stockist; miles: number; finishNames: Map<string, string> }) {
  const range = s.finishIds.map((id) => finishNames.get(id)).filter((n): n is string => Boolean(n));
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${s.address}, ${s.postcode}`)}`;
  return (
    <li className="grid gap-4 border-b border-line py-6 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-10">
      <div>
        <p className="eyebrow">{STOCKIST_TYPE_LABELS[s.type]}</p>
        <h3 className="mt-2 text-display-sm text-navy">{s.name}</h3>
        <address className="mt-2 text-[0.9375rem] not-italic leading-relaxed text-ink-muted">
          {s.address}, {s.postcode}
        </address>
        {s.description && <p className="mt-2 max-w-prose text-[0.9375rem] text-navy/75">{s.description}</p>}
        {s.openingHours && (
          <p className="mt-2 whitespace-pre-line text-[0.875rem] text-ink-muted">
            <span className="font-medium text-navy">Opening: </span>
            {s.openingHours}
          </p>
        )}
        {range.length > 0 && (
          <p className="mt-2 max-w-prose text-[0.875rem] text-ink-muted">
            <span className="font-medium text-navy">Range carried: </span>
            {range.join(", ")}. Stock changes, so please contact {s.name} to check availability.
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1 sm:items-end">
        <p className="text-[0.9375rem] font-medium text-navy tabular-nums">{formatMiles(miles)}</p>
        <div className="-ml-3 flex flex-wrap sm:ml-0 sm:-mr-3 sm:justify-end">
          {s.phone && (
            <a
              href={`tel:${s.phone.replace(/[^\d+]/g, "")}`}
              className="inline-flex min-h-tap items-center gap-2 px-3 text-[0.9375rem] text-navy hover:text-green-ink"
            >
              <Phone size={16} />
              <span className="tabular-nums">{s.phone}</span>
            </a>
          )}
          {s.website && (
            <a
              href={s.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-tap items-center gap-1.5 px-3 text-[0.9375rem] text-navy hover:text-green-ink"
            >
              Website <ArrowUpRight size={16} />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
          {s.email && (
            <a href={`mailto:${s.email}`} className="inline-flex min-h-tap items-center px-3 text-[0.9375rem] text-navy hover:text-green-ink">
              Email
              <span className="sr-only"> {s.name}</span>
            </a>
          )}
          <a
            href={`/contact?stockist=${s.id}`}
            className="inline-flex min-h-tap items-center px-3 text-[0.9375rem] font-medium text-navy underline decoration-green underline-offset-4"
          >
            Ask this stockist
            <span className="sr-only"> ({s.name})</span>
          </a>
          <a
            href={directions}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-tap items-center gap-1.5 px-3 text-[0.9375rem] text-navy hover:text-green-ink"
          >
            Directions <ArrowUpRight size={16} />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </div>
    </li>
  );
}

async function OnlineRetailers() {
  const retailers = await getOnlineRetailers();
  if (retailers.length === 0) return null;
  return (
    <section id="online" aria-labelledby="online-heading" className="scroll-mt-24 bg-cream py-section-sm">
      <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-start">
        <SectionIntro eyebrow="Buy online" title={<span id="online-heading">Order duratek online.</span>}>
          <p>Buy Duratek from our online retailers.</p>
        </SectionIntro>
        <ul className="border-t border-line">
          {retailers.map((r) => (
            <li key={r.id} className="border-b border-line">
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-h-24 items-center justify-between gap-6 py-6"
              >
                <span>
                  <span className="block font-display text-display-sm text-navy">{r.name}</span>
                  <span className="mt-1 block text-[0.9375rem] text-ink-muted">Shop the Duratek collection</span>
                </span>
                <ArrowUpRight
                  size={24}
                  className="shrink-0 text-green-ink transition-transform duration-300 ease-calm group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
