import type { Metadata } from "next";
import { SectionIntro } from "@/components/content/section-intro";
import { FinishImage } from "@/components/finish/finish-image";
import { PageTransition } from "@/components/layout/page-transition";
import { ButtonLink } from "@/components/ui/button";
import { DocumentIcon, EyeIcon, ShareIcon, TagIcon } from "@/components/ui/icons";
import { getFinishes } from "@/lib/catalogue";
import { pickByFileName } from "@/lib/catalogue/curation";
import { imagePool } from "@/lib/catalogue/image-pool";
import { tradeApplicationsEnabled } from "@/lib/trade/settings";

export const metadata: Metadata = {
  title: "Trade accounts",
  description:
    "Duratek trade accounts for fitters, retailers, contractors and specifiers: your own prices, documents and shareable shortlists.",
};

const BENEFITS = [
  { title: "Your prices", body: "Trade prices for every finish, shown only to you when you’re logged in." },
  { title: "Documents", body: "Technical sheets, warranty documents and certificates, ready to download." },
  { title: "Shortlists to share", body: "Pick finishes for a job and send your customer a clean link, without prices." },
  { title: "Customer view", body: "One tap hides every price, so you can show the range to a homeowner on site." },
] as const;

/** One icon per benefit, in BENEFITS order. */
const BENEFIT_ICONS = [TagIcon, DocumentIcon, ShareIcon, EyeIcon];

const STEPS = [
  { title: "Apply", body: "A short form: your company, your trade and how to reach you." },
  { title: "We check your details", body: "Every application is read by a person. We’ll email you when you’re approved." },
  { title: "Log in", body: "Use the email and password you applied with to see your prices and documents." },
] as const;

export default async function TradePage() {
  const enabled = tradeApplicationsEnabled();
  const photo = pickByFileName(imagePool(await getFinishes(), "room"), [
    "Fellside_Oak_XL_Luxury_Click_Vinyl_Flooring_7mm_kitchen_2.png",
    "Coniston_Oak_Luxury_Click_Vinyl_Flooring_5mm_hallway.png",
  ]);

  return (
    <PageTransition>
      <>
        <section className="container-page grid gap-10 pb-section-sm pt-12 sm:pt-16 lg:grid-cols-12 lg:items-end lg:gap-14">
          <div className="lg:col-span-6">
            <SectionIntro as="h1" size="lg" eyebrow="Trade accounts" title="For fitters, retailers, contractors and specifiers.">
              <p>Your own prices, the documents you need, and a clean way to show the range to your customers.</p>
            </SectionIntro>
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
              {enabled ? (
                <ButtonLink href="/trade/apply" size="lg">
                  Apply for a trade account
                </ButtonLink>
              ) : (
                <p className="notice px-4 py-3 text-[0.9375rem] text-navy">
                  Online trade applications open soon.
                </p>
              )}
              <ButtonLink href="/trade/login" variant="quiet" arrow={false}>
                Log in
              </ButtonLink>
            </div>
          </div>
          {photo && (
            <figure className="lg:col-span-5 lg:col-start-8">
              <div className="reveal-img frame relative aspect-[4/5] bg-line shadow-card">
                <FinishImage image={photo.image} sizes="(min-width: 1024px) 38vw, 100vw" className="object-[50%_70%]" />
              </div>
              <figcaption className="mt-3 text-[0.8125rem] text-ink-muted">{photo.finish.name}</figcaption>
            </figure>
          )}
        </section>

        <section aria-labelledby="benefits-heading" className="bg-cream py-section">
          <div className="container-page">
            <h2 id="benefits-heading" className="reveal text-display-md text-navy">
              What your account is for
            </h2>
            <ul className="mt-stack grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {BENEFITS.map((b, i) => {
                const IconC = BENEFIT_ICONS[i] ?? TagIcon;
                return (
                  <li key={b.title} className="card reveal p-6">
                    <IconC size={26} className="text-oak" />
                    <p className="mt-6 font-display text-display-sm text-navy">{b.title}</p>
                    <p className="mt-2 text-[0.9375rem] text-ink-muted">{b.body}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section aria-labelledby="steps-heading" className="py-section">
          <div className="container-page grid gap-10 lg:grid-cols-12 lg:gap-14">
            <h2 id="steps-heading" className="reveal text-display-md text-navy lg:col-span-4">
              How it works
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
              <ButtonLink href="/trade/apply">Apply for a trade account</ButtonLink>
            </div>
          )}
        </section>
      </>
    </PageTransition>
  );
}
