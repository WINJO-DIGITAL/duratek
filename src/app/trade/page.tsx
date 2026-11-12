import type { Metadata } from "next";
import { SectionIntro } from "@/components/content/section-intro";
import { PageTransition } from "@/components/layout/page-transition";
import { PageHero } from "@/components/content/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { CalculatorIcon, DocumentIcon, EyeIcon, QuoteIcon, ShareIcon, TagIcon } from "@/components/ui/icons";
import { getFinishes } from "@/lib/catalogue";
import { pageHero } from "@/lib/catalogue/heroes";
import { tradeApplicationsEnabled } from "@/lib/trade/settings";

export const metadata: Metadata = {
  title: "Trade accounts",
  description:
    "Duratek trade accounts for fitters, retailers, contractors and specifiers: your own prices, quotes for your customers, documents and shareable shortlists.",
};

const BENEFITS = [
  { icon: TagIcon, title: "Your prices", body: "Trade prices for every finish, shown only to you when you’re logged in." },
  { icon: QuoteIcon, title: "Quotes for your customers", body: "Measure the rooms, add fitting and extras, and send a quote under your own name and logo." },
  { icon: CalculatorIcon, title: "Packs and profit", body: "Work out the packs a job needs, always rounded up, and what it makes you at your price." },
  { icon: DocumentIcon, title: "Documents", body: "Technical sheets, certificates and fitting guides, ready to download." },
  { icon: ShareIcon, title: "Shortlists to share", body: "Pick finishes for a job and send your customer a clean link, without prices." },
  { icon: EyeIcon, title: "Customer view", body: "One tap hides every price, so you can show the range to a homeowner on site." },
] as const;

/** The steps match what can happen today: with online applications closed, the first step is a request. */
function stepsFor(enabled: boolean) {
  return enabled
    ? ([
        { title: "Apply", body: "A short form: your company, your trade and how to reach you." },
        { title: "We Check Your Details", body: "Every application is read by a person. We’ll email you when you’re approved." },
        { title: "Log In", body: "Use the email and password you applied with to see your prices and documents." },
      ] as const)
    : ([
        { title: "Ask for an Account", body: "Tell us your company, your trade and how to reach you." },
        { title: "We Check Your Details", body: "Every request is read by a person, and we get in touch when your account is ready." },
        { title: "Log In", body: "Use the details we send you to see your prices and documents." },
      ] as const);
}

export default async function TradePage() {
  const enabled = tradeApplicationsEnabled();
  const photo = pageHero(await getFinishes(), "trade");
  const steps = stepsFor(enabled);
  // Applications are open when email is set up; until then, the contact form is the way in.
  const joinHref = enabled ? "/trade/apply" : "/contact";
  const joinLabel = enabled ? "Apply for a Trade Account" : "Request a Trade Account";

  return (
    <PageTransition>
      <>
        <PageHero image={photo?.image} focus="object-[50%_70%]">
          <SectionIntro as="h1" size="lg" tone="dark" eyebrow="Trade accounts" title="For Fitters, Retailers, Contractors and Specifiers.">
            <p>Your own prices, the documents you need, and a clean way to show the range to your customers.</p>
          </SectionIntro>
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
            <ButtonLink href={joinHref} size="lg" variant="on-dark">
              {joinLabel}
            </ButtonLink>
            <ButtonLink href="/trade/login" variant="quiet-on-dark" arrow={false}>
              Log In
            </ButtonLink>
          </div>
        </PageHero>

        <section aria-labelledby="benefits-heading" className="py-section">
          <div className="container-page">
            <h2 id="benefits-heading" className="title-rule text-display-md text-navy">
              What your account is for
            </h2>
            <dl className="mt-stack grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map(({ icon: Icon, title, body }) => (
                <div key={title} className="reveal min-w-0 border-t border-line pt-6">
                  <Icon size={26} className="text-oak" />
                  <dt className="mt-4 font-display text-[1.25rem] tracking-[-0.02em] text-navy">{title}</dt>
                  <dd className="mt-2 text-ink-muted">{body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section aria-labelledby="steps-heading" className="bg-cream py-section">
          <div className="container-page">
            <h2 id="steps-heading" className="reveal title-rule text-display-md text-navy">
              How it works
            </h2>
            <ol className="mt-stack grid gap-10 lg:grid-cols-3 lg:gap-12">
              {steps.map((s) => (
                <li key={s.title} className="reveal min-w-0 border-t border-line pt-6">
                  <p className="flex items-center gap-3 font-display text-[1.25rem] tracking-[-0.02em] text-navy">
                    <span aria-hidden="true" className="size-2 shrink-0 bg-green" />
                    {s.title}
                  </p>
                  <p className="mt-2 text-ink-muted">{s.body}</p>
                </li>
              ))}
            </ol>
            <div className="mt-12 flex flex-wrap items-center justify-between gap-6 border-t border-line pt-8">
              <p className="text-lede text-navy">Fitting or specifying? Open an account.</p>
              <ButtonLink href={joinHref}>{joinLabel}</ButtonLink>
            </div>
          </div>
        </section>
      </>
    </PageTransition>
  );
}
