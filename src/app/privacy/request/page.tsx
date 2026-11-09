import type { Metadata } from "next";
import { SectionIntro } from "@/components/content/section-intro";
import { PrivacyRequestForm } from "@/components/contact/privacy-request-form";
import { PageTransition } from "@/components/layout/page-transition";

export const metadata: Metadata = {
  title: "Your data",
  description: "Ask to see, correct or delete the information Duratek holds about you.",
};

export default function PrivacyRequestPage() {
  return (
    <PageTransition>
      <div className="container-page pb-section pt-12 sm:pt-16">
        <SectionIntro as="h1" size="lg" eyebrow="Privacy" title="Your information, your choice.">
          <p>Ask to see what we hold about you, correct it, delete it or stop marketing. We&rsquo;ll reply within one month.</p>
        </SectionIntro>
        <div className="mt-stack max-w-xl">
          <PrivacyRequestForm />
          <p className="mt-6 text-[0.875rem] text-ink-muted">
            Trade customers can also download or delete their own information from Settings, once signed in. Read the full <a href="/privacy" className="underline underline-offset-4">privacy notice</a>.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
