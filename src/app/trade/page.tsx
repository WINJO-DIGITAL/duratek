import type { Metadata } from "next";
import { SectionIntro } from "@/components/content/section-intro";
import { PageTransition } from "@/components/layout/page-transition";
import { PageHero } from "@/components/content/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { getFinishes } from "@/lib/catalogue";
import { pickByFileName } from "@/lib/catalogue/curation";
import { imagePool } from "@/lib/catalogue/image-pool";
import { tradeApplicationsEnabled } from "@/lib/trade/settings";

export const metadata: Metadata = {
  title: "Trade accounts",
  description:
    "Duratek trade accounts for fitters, retailers, contractors and specifiers: your own prices, quotes for your customers, documents and shareable shortlists.",
};

const BENEFITS = [
  { title: "Your prices", body: "Trade prices for every finish, shown only to you when you’re logged in." },
  { title: "Quotes for your customers", body: "Measure the rooms, add fitting and extras, and send a quote under your own name and logo." },
  { title: "Packs and profit", body: "Work out the packs a job needs, always rounded up, and what it makes you at your price." },
  { title: "Documents", body: "Technical sheets, certificates and fitting guides, ready to download." },
  { title: "Shortlists to share", body: "Pick finishes for a job and send your customer a clean link, without prices." },
  { title: "Customer view", body: "One tap hides every price, so you can show the range to a homeowner on site." },
] as const;

const STEPS = [
  { title: "Apply", body: "A short form: your company, your trade and how to reach you." },
  { title: "We check your details", body: "Every application is read by a person. We’ll email you when you’re approved." },
  { title: "Log In", body: "Use the email and password you applied with to see your prices and documents." },
] as const;

export default async function TradePage() {
  const enabled = tradeApplicationsEnabled();
  const photo = pickByFileName(imagePool(await getFinishes(), "room"), [
    "Coniston_Oak_Luxury_Click_Vinyl_Flooring_5mm_hallway.png",
    "Windermere_Oak_XL_Luxury_Click_Vinyl_Flooring_7mm_hallway.png",
  ]);

  return (
    <PageTransition>
      <>
        <PageHero image={photo?.image} focus="object-[50%_70%]">
          <SectionIntro as="h1" size="lg" tone="dark" eyebrow="Trade accounts" title="For Fitters, Retailers, Contractors and Specifiers.">
            <p>Your own prices, the documents you need, and a clean way to show the range to your customers.</p>
          </SectionIntro>
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
            {enabled ? (
              <ButtonLink href="/trade/apply" size="lg" variant="on-dark">
                Apply for a Trade Account
              </ButtonLink>
            ) : (
              <p className="px-1 text-[0.9375rem] text-on-dark/85">Online trade applications open soon.</p>
            )}
            <ButtonLink href="/trade/login" variant="quiet-on-dark" arrow={false}>
              Log In
            </ButtonLink>
          </div>
        </PageHero>

        <section aria-labelledby="benefits-heading" className="py-section">
          <div className="container-page grid gap-10 lg:grid-cols-12 lg:gap-14">
            <h2 id="benefits-heading" className="title-rule text-display-md text-navy lg:col-span-4 lg:self-start">
              What Your Account Is For
            </h2>
            <dl className="lg:col-span-8">
              {BENEFITS.map((b) => (
                <div key={b.title} className="grid gap-2 border-t border-line py-6 sm:grid-cols-[14rem_1fr] sm:gap-8">
                  <dt className="font-display text-[1.25rem] tracking-[-0.02em] text-navy">{b.title}</dt>
                  <dd className="text-ink-muted">{b.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section aria-labelledby="steps-heading" className="py-section">
          <div className="container-page grid gap-10 lg:grid-cols-12 lg:gap-14">
            <h2 id="steps-heading" className="reveal text-display-md text-navy lg:col-span-4">
              How It Works
            </h2>
            <ol className="lg:col-span-8">
              {STEPS.map((s) => (
                <li key={s.title} className="reveal grid gap-1 border-t border-line py-5 sm:grid-cols-[14rem_1fr] sm:gap-6">
                  <p className="flex items-center gap-3 text-navy">
                    <span aria-hidden="true" className="size-2 shrink-0 bg-green" />
                    {s.title}
                  </p>
                  <p className="text-ink-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
          {enabled && (
            <div className="container-page mt-12 flex flex-wrap items-center justify-between gap-6 border-t border-line pt-8">
              <p className="text-lede text-navy">It takes about two minutes.</p>
              <ButtonLink href="/trade/apply">Apply for a Trade Account</ButtonLink>
            </div>
          )}
        </section>
      </>
    </PageTransition>
  );
}
