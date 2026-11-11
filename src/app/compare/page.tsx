import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { WarrantyDisclaimer } from "@/components/content/warranty";
import { canSeeTradePrices, getAccount } from "@/lib/auth/session";
import { formatPence } from "@/lib/money";
import { getTradePrices } from "@/lib/trade/prices";
import { SectionIntro } from "@/components/content/section-intro";
import { FinishImage } from "@/components/finish/finish-image";
import { PageTransition } from "@/components/layout/page-transition";
import { SaveButton } from "@/components/saved/save-button";
import { AddToSamplesButton } from "@/components/samples/add-to-samples-button";
import { byTone, getFinishes, grainImage, imagesOfKind } from "@/lib/catalogue";
import { compareRows, type CompareRow } from "@/lib/catalogue/compare";
import { FORMAT_LABELS, plankFormat } from "@/lib/catalogue/format";
import { relatedFinishes } from "@/lib/catalogue/related";
import type { Finish } from "@/lib/catalogue/types";
import { cn } from "@/lib/cn";
import { colourFamilyLabel } from "@/lib/config";
import { COMPARE_LIMIT, compareHref, readCompare } from "@/lib/saved/saved";

export const metadata: Metadata = {
  title: "Compare finishes",
  description: "Compare up to three Duratek finishes side by side: colour, plank size, thickness and specification.",
  alternates: { canonical: "/compare" },
  robots: { index: false },
};

export default function ComparePage({ searchParams }: PageProps<"/compare">) {
  return (
    <PageTransition>
      <div className="container-page pb-section pt-12 sm:pt-16">
        <SectionIntro as="h1" size="lg" eyebrow="Compare" title="Side by Side.">
          <p>Up to {COMPARE_LIMIT} finishes. The link keeps your choice, so you can send it to someone.</p>
        </SectionIntro>
        <Suspense fallback={<CompareSkeleton />}>
          <Comparison searchParams={searchParams} />
        </Suspense>
      </div>
    </PageTransition>
  );
}

const detail = (f: Finish) => {
  const format = plankFormat(f.specs);
  return [colourFamilyLabel(f.colourFamily), format && FORMAT_LABELS[format]].filter(Boolean).join(" · ");
};

async function Comparison({ searchParams }: { searchParams: PageProps<"/compare">["searchParams"] }) {
  const all = byTone(await getFinishes());
  const bySlug = new Map(all.map((f) => [f.slug, f]));
  const slugs = readCompare((await searchParams).f, new Set(bySlug.keys()));
  const chosen = slugs.map((s) => bySlug.get(s)!);

  if (chosen.length === 0) {
    return (
      <div className="mt-12">
        <h2 className="text-display-sm text-navy">Choose a Finish to Start.</h2>
        <p className="mt-2 text-ink-muted">Then add up to two more.</p>
        <Picker options={all} chosen={[]} className="mt-6" />
      </div>
    );
  }

  const { different, shared } = compareRows(chosen);
  // An approved trader in trade mode also sees their own price, read on the
  // server; anyone else (or customer mode) is never sent it.
  const account = await getAccount();
  if (await canSeeTradePrices(account)) {
    const prices = await getTradePrices(account!);
    const values = chosen.map((f) => (prices.get(f.id) ? `${formatPence(prices.get(f.id)!.pence)} ex VAT` : "Not set"));
    different.unshift({ label: "Your Trade Price per m²", values, same: false, measured: true });
  }
  // Suggestions for empty slots: closest to the first finish, not already chosen.
  const suggestions = relatedFinishes(all, chosen[0], all.length).filter((f) => !slugs.includes(f.slug));
  const columns = COMPARE_LIMIT;

  return (
    <div className="mt-12 lg:mt-16">
      {/* Column heads */}
      <div className="grid gap-3 sm:gap-6 lg:grid-cols-[12rem_1fr]">
        <div className="hidden lg:block" />
        <ul className="grid gap-3 sm:gap-6" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }, (_, i) => {
            const f = chosen[i];
            if (!f) {
              return (
                <li key={`add-${i}`}>
                  <AddSlot slugs={slugs} options={suggestions} first={i === chosen.length} />
                </li>
              );
            }
            const grain = grainImage(f);
            const sample = { id: f.id, slug: f.slug, name: f.name, unavailable: f.sampleAvailable === false };
            return (
              <li key={f.slug} className="relative flex flex-col">
                <Link href={`/range/${f.slug}`} className="relative block aspect-[4/5] overflow-hidden rounded-card bg-line shadow-card">
                  {grain && <FinishImage image={{ ...grain, alt: "" }} sizes="(min-width: 1024px) 26vw, 31vw" />}
                  <span className="sr-only">{f.name}</span>
                </Link>
                <SaveButton finish={sample} variant="overlay" className="absolute right-1.5 top-1.5 sm:right-2 sm:top-2" />
                <h2 className="mt-3 text-[1.0625rem] leading-tight text-navy sm:text-[1.375rem]">
                  <Link href={`/range/${f.slug}`} className="-my-2 inline-block py-2 hover:text-green-ink">
                    {f.name}
                  </Link>
                </h2>
                <p className="mt-1 hidden text-[0.8125rem] text-ink-muted sm:block">{detail(f)}</p>
                <AddToSamplesButton finish={sample} size="compact" short className="mt-1 sm:hidden" />
                <AddToSamplesButton finish={sample} size="compact" className="mt-1 hidden sm:flex" />
                {chosen.length > 1 && (
                  <Link
                    href={compareHref(slugs.filter((s) => s !== f.slug))}
                    replace
                    scroll={false}
                    className="-mt-1 min-h-tap self-start py-3 text-[0.8125rem] text-ink-muted underline-offset-4 hover:text-navy hover:underline"
                  >
                    Remove<span className="sr-only"> {f.name} from the comparison</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {different.length > 0 && (
        <RowGroup title="What’s different" rows={different} columns={columns} highlight />
      )}
      <RowGroup title={chosen.length > 1 ? "The same on every one" : "Specification"} rows={shared} columns={columns} />
      <WarrantyDisclaimer className="mt-6" />
    </div>
  );
}

function RowGroup({
  title,
  rows,
  columns,
  highlight = false,
}: {
  title: string;
  rows: CompareRow[];
  columns: number;
  highlight?: boolean;
}) {
  return (
    <section className="mt-12">
      <h2 className="eyebrow font-sans">{title}</h2>
      <dl className="mt-4 border-t border-line">
        {rows.map((r) => (
          <div key={r.label} className="grid gap-x-6 gap-y-1 border-b border-line py-3 lg:grid-cols-[12rem_1fr]">
            <dt className="flex items-center gap-2 text-[0.875rem] text-ink-muted">
              {highlight && <span aria-hidden="true" className="size-1.5 bg-green" />}
              {r.label}
            </dt>
            {r.same ? (
              <dd className={cn("text-[0.9375rem] text-navy", r.measured && "data")}>{r.values[0] || "Not stated"}</dd>
            ) : (
              <dd
                className="grid gap-3 sm:gap-6"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: columns }, (_, i) => (
                  <span key={i} className={cn("text-[0.8125rem] text-navy sm:text-[0.9375rem]", r.measured && "data text-[0.75rem] sm:text-[0.875rem]")}>
                    {r.values[i] ?? ""}
                  </span>
                ))}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}

/** An empty column: suggestions as swatches, plus the full list. */
function AddSlot({ slugs, options, first }: { slugs: string[]; options: Finish[]; first: boolean }) {
  if (!first) return <div aria-hidden="true" className="aspect-[4/5] rounded-card border border-dashed border-navy/15" />;
  return (
    <div className="flex aspect-[4/5] flex-col rounded-card border border-dashed border-oak/40 bg-white/60 p-2 sm:p-4">
      <p className="text-[0.8125rem] text-navy sm:text-[0.9375rem]">Add a finish</p>
      <Picker options={options} chosen={slugs} compact className="mt-2 min-h-0 flex-1 overflow-y-auto" />
    </div>
  );
}

/** Round swatch links; each adds that finish to the comparison. */
function Picker({
  options,
  chosen,
  compact = false,
  className,
}: {
  options: Finish[];
  chosen: string[];
  compact?: boolean;
  className?: string;
}) {
  return (
    <ul className={cn(compact ? "flex flex-col" : "grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {options.map((f) => {
        const swatch = imagesOfKind(f, "swatch")[0] ?? grainImage(f);
        return (
          <li key={f.slug}>
            <Link
              href={compareHref([...chosen, f.slug])}
              scroll={false}
              className="group flex min-h-tap items-center gap-2 text-navy sm:gap-3"
            >
              <span className="relative block size-6 shrink-0 overflow-hidden rounded-full bg-line sm:size-8">
                {swatch && <Image src={swatch.src} alt="" fill sizes="32px" quality={70} className="object-cover" />}
              </span>
              <span
                className={cn(
                  "leading-tight group-hover:underline group-hover:underline-offset-4",
                  compact ? "text-[0.75rem] sm:text-[0.875rem]" : "text-[0.9375rem]",
                )}
              >
                <span className="sr-only">Compare </span>
                {f.name}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Same footprint as the loaded comparison, so nothing jumps when it arrives. */
function CompareSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading comparison" className="mt-12 lg:mt-16">
      <div className="grid gap-3 sm:gap-6 lg:grid-cols-[12rem_1fr]">
        <div className="hidden lg:block" />
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <div className="aspect-[4/5] animate-pulse bg-line/70" />
              <div className="mt-3 h-6 w-3/4 bg-line/70" />
              <div className="mt-2 h-11 w-1/2 bg-line/50" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-12 h-64 bg-line/40" />
    </div>
  );
}
