import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { WarrantyDisclaimer } from "@/components/content/warranty";
import { FinishGallery } from "@/components/finish/finish-gallery";
import { ProfitPanel } from "@/components/trade/profit-panel";
import { ModeSwitch } from "@/components/trade/trade-shell";
import { ArrowLeft } from "@/components/ui/icons";
import { byTone, getFinishes, grainImage, imagesOfKind, specRows } from "@/lib/catalogue";
import { PRODUCT_BENEFITS, SUITABILITY } from "@/lib/catalogue/benefits";
import { colourFamilyLabel } from "@/lib/config";
import { requireApprovedTrade } from "@/lib/auth/trade";
import { formatPence } from "@/lib/money";
import { getPreferences } from "@/lib/trade/preferences";
import { getTradePrices } from "@/lib/trade/prices";

export const metadata: Metadata = { title: "Present", robots: { index: false } };

export default function PresentFinishPage({ params }: PageProps<"/trade/present/[slug]">) {
  return (
    <Suspense fallback={<div aria-busy="true" className="container-page h-[80vh] animate-pulse pt-16" />}>
      <Content params={params} />
    </Suspense>
  );
}

/**
 * A finish, presented. Customer mode: photography, specification, benefits
 * and RRP. Trade mode adds the trader's buying price and a profit calculator.
 * The buying price is only fetched, and only sent, in trade mode.
 */
async function Content({ params }: { params: PageProps<"/trade/present/[slug]">["params"] }) {
  const { slug } = await params;
  const { account, customerView } = await requireApprovedTrade(`/trade/present/${slug}`);
  const all = byTone(await getFinishes());
  const i = all.findIndex((f) => f.slug === slug);
  if (i < 0) notFound();
  const finish = all[i];
  const prev = all[(i - 1 + all.length) % all.length];
  const next = all[(i + 1) % all.length];
  const [prices, prefs] = customerView ? [null, null] : await Promise.all([getTradePrices(account), getPreferences()]);
  const buy = prices?.get(finish.id)?.pence;
  const rooms = [...imagesOfKind(finish, "room"), ...imagesOfKind(finish, "closeup")];
  const grain = grainImage(finish);
  const back = `/trade/present/${finish.slug}`;

  return (
    <div className="pb-section pt-6 sm:pt-8">
      <div className="container-page flex flex-wrap items-center justify-between gap-3">
        <Link href="/trade/present" className="nav-link gap-2">
          <ArrowLeft size={16} /> All finishes
        </Link>
        <ModeSwitch customerView={customerView} back={back} compact />
      </div>

      {/* The room first: full width, swipe for the next photograph. */}
      <div className="mt-6 sm:mt-8">
        {rooms.length > 0 ? (
          <FinishGallery images={rooms} name={finish.name} aspect="aspect-[4/5] sm:aspect-[16/9]" sizes="100vw" />
        ) : (
          grain && (
            <div className="relative aspect-[4/5] bg-line sm:aspect-[16/9]">
              <Image src={grain.src} alt={grain.alt} fill sizes="100vw" className="object-cover" priority />
            </div>
          )
        )}
      </div>

      <div className="container-page mt-10 grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-7">
          <p className="eyebrow">{colourFamilyLabel(finish.colourFamily)}</p>
          <h1 className="mt-3 text-display-lg text-navy">{finish.name}</h1>
          {finish.description && <p className="mt-5 max-w-[60ch] text-lede text-navy/80">{finish.description}</p>}
          {finish.rrpPence !== undefined && (
            <p className="mt-6 text-navy">
              {finish.offerPence !== undefined && (
                <>
                  <span className="data text-[1.25rem] font-medium text-green-ink">{formatPence(finish.offerPence)}</span> offer ·{" "}
                </>
              )}
              <span className="data text-[1.25rem]">{formatPence(finish.rrpPence)}</span>{" "}
              <span className="text-[0.875rem] text-ink-muted">per m², RRP inc VAT</span>
            </p>
          )}
          {!customerView && buy !== undefined && prefs && (
            <div className="mt-8">
              <ProfitPanel buyNetPerM2={buy} rrpGrossPerM2={finish.rrpPence} coverageM2={finish.specs.pack_coverage_m2} defaultMarkupBp={prefs.default_markup_bp} />
            </div>
          )}
          {!customerView && buy === undefined && (
            <p className="notice mt-8 px-4 py-3 text-[0.9375rem] text-navy">There’s no trade price on your account for this finish yet.</p>
          )}
        </div>

        <dl className="lg:col-span-4 lg:col-start-9 lg:self-end">
          {specRows(finish.specs).map((r) => (
            <div key={r.label} className="flex items-baseline justify-between gap-4 border-t border-line py-3">
              <dt className="text-[0.9375rem] text-ink-muted">{r.label}</dt>
              <dd className="data text-right text-[0.9375rem] text-navy">{r.value}</dd>
            </div>
          ))}
          <div className="border-t border-line" />
        </dl>
      </div>

      <section aria-labelledby="benefits-heading" className="container-page mt-stack">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <h2 id="benefits-heading" className="title-rule text-display-sm text-navy lg:col-span-4 lg:self-start">
            Why duratek
          </h2>
          <dl className="lg:col-span-8">
            {PRODUCT_BENEFITS.map((b) => (
              <div key={b.title} className="grid gap-1 border-t border-line py-5 sm:grid-cols-[14rem_1fr] sm:gap-8">
                <dt className="font-display text-[1.125rem] tracking-[-0.02em] text-navy">{b.title}</dt>
                <dd className="text-ink-muted">{b.body}</dd>
              </div>
            ))}
            <div className="border-t border-line pt-5">
              <p className="text-navy">Where it suits: {SUITABILITY}</p>
              <WarrantyDisclaimer className="mt-3" />
            </div>
          </dl>
        </div>
      </section>

      <nav aria-label="More finishes" className="container-page mt-stack flex items-center justify-between gap-4 border-t border-line pt-6">
        <Link href={`/trade/present/${prev.slug}`} className="min-h-tap py-3 font-display text-[1.25rem] text-navy underline underline-offset-4">
          ← {prev.name}
        </Link>
        <Link href={`/trade/present/${next.slug}`} className="min-h-tap py-3 text-right font-display text-[1.25rem] text-navy underline underline-offset-4">
          {next.name} →
        </Link>
      </nav>
    </div>
  );
}
