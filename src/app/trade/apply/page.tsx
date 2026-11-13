import type { Metadata } from "next";
import Link from "next/link";
import { SectionIntro } from "@/components/content/section-intro";
import { PageTransition } from "@/components/layout/page-transition";
import { TradeApplicationForm } from "@/components/trade/trade-application-form";
import { ArrowLeft } from "@/components/ui/icons";
import { tradeApplicationsEnabled } from "@/lib/trade/settings";

export const metadata: Metadata = {
  title: "Apply for a Trade Account",
  description: "Apply for a Duratek Trade Account. Every application is checked by hand.",
};

export default function TradeApplyPage() {
  const enabled = tradeApplicationsEnabled();
  return (
    <PageTransition>
      <div className="container-page grid gap-12 pb-section pt-12 sm:pt-16 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-4">
          <Link href="/trade" className="nav-link gap-2">
            <ArrowLeft size={16} /> Trade accounts
          </Link>
          <SectionIntro as="h1" size="lg" title="Apply for a Trade Account." className="mt-6">
            <p>We read every application and email you when your account is approved.</p>
          </SectionIntro>
        </div>
        <div className="lg:col-span-7 lg:col-start-6">
          {enabled ? (
            <TradeApplicationForm />
          ) : (
            <p className="max-w-xl notice px-5 py-4 text-navy">
              Online trade applications open soon.
            </p>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
