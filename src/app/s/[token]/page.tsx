import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SectionIntro } from "@/components/content/section-intro";
import { FinishCard } from "@/components/finish/finish-card";
import { PrintButton } from "@/components/trade/print-button";
import { ButtonLink } from "@/components/ui/button";
import { getFinishes } from "@/lib/catalogue";
import { isShareToken } from "@/lib/ids";
import { publicSupabase } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: "Your Duratek shortlist",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function SharedShortlistPage({ params }: PageProps<"/s/[token]">) {
  return (
    <Suspense fallback={<div aria-busy="true" className="container-page h-96 animate-pulse py-16" />}>
      <Content params={params} />
    </Suspense>
  );
}

/** A trader's shortlist, opened by its link. Never shows prices. */
async function Content({ params }: { params: PageProps<"/s/[token]">["params"] }) {
  const { token } = await params;
  if (!isShareToken(token)) notFound();
  const { data } = await publicSupabase().rpc("get_shared_shortlist", { share_token: token });
  const list = data?.[0];
  if (!list) notFound();
  const all = await getFinishes();
  const finishes = list.finish_ids.map((id) => all.find((f) => f.id === id)).filter((f) => f !== undefined);

  return (
    <div className="container-page pb-section pt-12 sm:pt-16">
      <SectionIntro as="h1" size="lg" eyebrow="Your shortlist" title={list.name}>
        <p>
          {finishes.length} Duratek {finishes.length === 1 ? "finish" : "finishes"} chosen for you. Order up to three free samples to see them at
          home.
        </p>
      </SectionIntro>
      {finishes.length === 0 ? (
        <p className="mt-stack text-ink-muted">These finishes are no longer in the range.</p>
      ) : (
        <ul className="mt-stack grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {finishes.map((f) => (
            <li key={f.id}>
              <FinishCard finish={f} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" headingLevel="h2" showPrice={false} />
            </li>
          ))}
        </ul>
      )}
      <div className="mt-stack flex flex-wrap items-center gap-x-6 gap-y-3" data-print-hide>
        <ButtonLink href="/samples">Order Free Samples</ButtonLink>
        <PrintButton label="Print" />
      </div>
    </div>
  );
}
