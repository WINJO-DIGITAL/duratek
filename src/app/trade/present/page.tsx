import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { TradeShell, TradeSkeleton } from "@/components/trade/trade-shell";
import { byTone, getFinishes, leadImage } from "@/lib/catalogue";
import { measureLine } from "@/lib/catalogue/format";
import { requireApprovedTrade } from "@/lib/auth/trade";
import { formatPence } from "@/lib/money";

export const metadata: Metadata = { title: "Present", robots: { index: false } };

export default function PresentPage() {
  return (
    <PageTransition>
      <Suspense fallback={<TradeSkeleton />}>
        <Content />
      </Suspense>
    </PageTransition>
  );
}

/** The range, to show a customer: big photographs, names, sizes and RRP. Nothing from the account. */
async function Content() {
  const { account, customerView } = await requireApprovedTrade("/trade/present");
  const finishes = byTone(await getFinishes());
  return (
    <TradeShell account={account} customerView={customerView} current="/trade/present" back="/trade/present" title="Present the range" intro={<p>Tap a finish to show it full size. Switch to customer mode before you hand over the tablet.</p>}>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {finishes.map((f, i) => {
          const img = leadImage(f);
          return (
            <li key={f.id}>
              <Link href={`/trade/present/${f.slug}`} className="group block">
                <div className="frame relative aspect-[4/3] bg-line">
                  {img && <Image src={img.src} alt={img.alt} fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw" quality={70} priority={i < 3} className="object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none" />}
                </div>
                <p className="mt-3 font-display text-[1.25rem] text-navy">{f.name}</p>
                <p className="data text-[0.8125rem] text-ink-muted">
                  {measureLine(f.specs)}
                  {f.rrpPence !== undefined && ` · ${formatPence(f.rrpPence)} per m² RRP`}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </TradeShell>
  );
}
