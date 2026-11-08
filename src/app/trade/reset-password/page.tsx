import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SectionIntro } from "@/components/content/section-intro";
import { PageTransition } from "@/components/layout/page-transition";
import { ResetPasswordForm } from "@/components/trade/password-forms";
import { getAccount } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <PageTransition>
      <div className="container-page grid gap-12 pb-section pt-12 sm:pt-16 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-4">
          <SectionIntro as="h1" size="lg" title="Choose a new password." className="mt-6">
            <p>You’ll be signed out everywhere else.</p>
          </SectionIntro>
        </div>
        <div className="lg:col-span-7 lg:col-start-6">
          <Suspense fallback={<div aria-busy="true" className="h-72 max-w-md animate-pulse rounded-card bg-line/50" />}>
            <Panel />
          </Suspense>
        </div>
      </div>
    </PageTransition>
  );
}

/** Only reachable with the session a reset link opens. */
async function Panel() {
  if (!(await getAccount())) {
    return (
      <p className="notice max-w-md px-4 py-3 text-[0.9375rem] text-navy">
        This page opens from the link in your reset email, and the link has expired or was already used.{" "}
        <Link href="/trade/forgot-password" className="underline underline-offset-4">Ask for a new link</Link>.
      </p>
    );
  }
  return <ResetPasswordForm />;
}
