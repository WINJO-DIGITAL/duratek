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
    <div className="container-page pb-section pt-6 sm:pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/trade/present" className="nav-link gap-2">
          <ArrowLeft size={16} /> All finishes
        </Link>
        <ModeSwitch customerView={customerView} back={back} compact />
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div>
          {rooms.length > 0 ? (
            <FinishGallery images={rooms} name={finish.name} aspect="aspect-[4/3]" sizes="(min-width: 1024px) 60vw, 100vw" />
          ) : (
            grain && (
              <div className="frame relative aspect-[4/3] bg-line">
                <Image src={grain.src} alt={grain.alt} fill sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover" priority />
              </div>
            )
          )}
        </div>

        <div className="space-y-6">
          <div>
            <p className="eyebrow">{colourFamilyLabel(finish.colourFamily)}</p>
            <h1 className="mt-3 text-display-lg text-navy">{finish.name}</h1>
            {finish.description && <p className="mt-3 max-w-[60ch] text-support text-navy/75">{finish.description}</p>}
            {finish.rrpPence !== undefined && (
              <p className="mt-4 text-navy">
                {finish.offerPence !== undefined && (
                  <>
                    <span className="data text-[1.25rem] font-medium text-green-ink">{formatPence(finish.offerPence)}</span> offer ·{" "}
                  </>
                )}
                <span className="data text-[1.25rem]">{formatPence(finish.rrpPence)}</span> <span className="text-[0.875rem] text-ink-muted">per m², RRP inc VAT</span>
              </p>
            )}
          </div>

          {grain && (
            <div className="frame relative aspect-[3/1] bg-line">
              <Image src={grain.src} alt={`${finish.name} plank, close up`} fill sizes="(min-width: 1024px) 35vw, 100vw" className="object-cover" />
            </div>
          )}

          <dl className="card divide-y divide-line px-5">
            {specRows(finish.specs).map((r) => (
              <div key={r.label} className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-[0.9375rem] text-ink-muted">{r.label}</dt>
                <dd className="data text-right text-[0.9375rem] text-navy">{r.value}</dd>
              </div>
            ))}
          </dl>

          {!customerView && buy !== undefined && prefs && (
            <ProfitPanel buyNetPerM2={buy} rrpGrossPerM2={finish.rrpPence} coverageM2={finish.specs.pack_coverage_m2} defaultMarkupBp={prefs.default_markup_bp} />
          )}
          {!customerView && buy === undefined && (
            <p className="notice px-4 py-3 text-[0.9375rem] text-navy">There’s no trade price on your account for this finish yet.</p>
          )}
        </div>
      </div>

      <section aria-labelledby="benefits-heading" className="mt-stack">
        <h2 id="benefits-heading" className="text-display-sm text-navy">Why Duratek</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCT_BENEFITS.map((b) => (
            <li key={b.title} className="card p-5">
              <p className="flex items-center gap-2 font-medium text-navy">
                <span aria-hidden="true" className="size-2 bg-green-ink" />
                {b.title}
              </p>
              <p className="mt-2 text-[0.9375rem] text-ink-muted">{b.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-[70ch] text-[0.9375rem] text-navy">Where it suits: {SUITABILITY}</p>
        <WarrantyDisclaimer className="mt-3" />
      </section>

      <nav aria-label="More finishes" className="mt-stack flex items-center justify-between gap-4 border-t border-line pt-6">
        <Link href={`/trade/present/${prev.slug}`} className="min-h-tap py-3 text-[0.9375rem] text-navy underline underline-offset-4">← {prev.name}</Link>
        <Link href={`/trade/present/${next.slug}`} className="min-h-tap py-3 text-right text-[0.9375rem] text-navy underline underline-offset-4">{next.name} →</Link>
      </nav>
    </div>
  );
}
