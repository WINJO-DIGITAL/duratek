import type { Metadata } from "next";
import Link from "next/link";
import { SectionIntro } from "@/components/content/section-intro";
import { PageTransition } from "@/components/layout/page-transition";
import { ForgotPasswordForm } from "@/components/trade/password-forms";
import { ArrowLeft } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Forgotten password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <PageTransition>
      <div className="container-page grid gap-12 pb-section pt-12 sm:pt-16 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-4">
          <Link href="/trade/login" className="nav-link gap-2">
            <ArrowLeft size={16} /> Trade log in
          </Link>
          <SectionIntro as="h1" size="lg" title="Forgotten your password?" className="mt-6">
            <p>We’ll email you a link to choose a new one.</p>
          </SectionIntro>
        </div>
        <div className="lg:col-span-7 lg:col-start-6">
          <ForgotPasswordForm />
        </div>
      </div>
    </PageTransition>
  );
}
