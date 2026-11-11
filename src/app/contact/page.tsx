import type { Metadata } from "next";
import { Suspense } from "react";
import { SectionIntro } from "@/components/content/section-intro";
import { EnquiryForm } from "@/components/contact/enquiry-form";
import { PageTransition } from "@/components/layout/page-transition";
import { getFinishes } from "@/lib/catalogue";
import { COMPANY, CONTACT_LOCATIONS, GENERAL_CONTACT } from "@/lib/contact";
import { getStockists } from "@/lib/where-to-buy";

export const metadata: Metadata = {
  title: "Contact",
  description: "Ask Duratek or a Duratek stockist a question.",
};

export default function ContactPage({ searchParams }: PageProps<"/contact">) {
  return (
    <PageTransition>
      <div className="container-page pb-section pt-12 sm:pt-16">
        <SectionIntro as="h1" size="lg" eyebrow="Contact" title="Ask Us Anything.">
          <p>Questions about a finish, a stockist or a trade account. We reply by email.</p>
        </SectionIntro>
        <div className="mt-stack grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <Suspense fallback={<div aria-busy="true" className="card h-96 animate-pulse" />}>
            <Form searchParams={searchParams} />
          </Suspense>
          <aside aria-label="Other ways to reach us" className="space-y-4 text-[0.9375rem] text-navy/75">
            {GENERAL_CONTACT.email && <p>Email <a className="text-navy underline underline-offset-4" href={`mailto:${GENERAL_CONTACT.email}`}>{GENERAL_CONTACT.email}</a></p>}
            {GENERAL_CONTACT.phone && <p>Phone {GENERAL_CONTACT.phone}</p>}
            {CONTACT_LOCATIONS.length === 0 && !GENERAL_CONTACT.email && !GENERAL_CONTACT.phone && <p>The form is the quickest way to reach us.</p>}
            {COMPANY.legalName && <p className="text-[0.8125rem] text-ink-muted">{COMPANY.legalName}</p>}
            <p className="text-[0.8125rem] text-ink-muted">
              Stockists are independent businesses. Contact them to check prices and availability.
            </p>
          </aside>
        </div>
      </div>
    </PageTransition>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/contact">["searchParams"] }) {
  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const [stockists, finishes] = await Promise.all([one("stockist") ? getStockists() : Promise.resolve([]), one("finish") ? getFinishes() : Promise.resolve([])]);
  const s = stockists.find((x) => x.id === one("stockist"));
  const f = finishes.find((x) => x.slug === one("finish"));
  return <EnquiryForm stockist={s ? { id: s.id, name: s.name } : undefined} finish={f ? { id: f.id, name: f.name } : undefined} />;
}
