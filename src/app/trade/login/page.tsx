import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SectionIntro } from "@/components/content/section-intro";
import { PageTransition } from "@/components/layout/page-transition";
import { LoginForm } from "@/components/trade/login-form";
import { ArrowLeft } from "@/components/ui/icons";
import { getAccount } from "@/lib/auth/session";
import { safeNext } from "@/lib/auth/login";

export const metadata: Metadata = {
  title: "Trade log in",
  description: "Log in to your Duratek trade account to see your prices.",
  robots: { index: false },
};

export default function TradeLoginPage({ searchParams }: PageProps<"/trade/login">) {
  return (
    <PageTransition>
      <div className="container-page grid gap-12 pb-section pt-12 sm:pt-16 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-4">
          <Link href="/trade" className="nav-link gap-2">
            <ArrowLeft size={16} /> Trade accounts
          </Link>
          <SectionIntro as="h1" size="lg" title="Trade log in." className="mt-6">
            <p>See your own prices and documents.</p>
          </SectionIntro>
        </div>
        <div className="lg:col-span-7 lg:col-start-6">
          <Suspense fallback={<div aria-busy="true" className="h-72 max-w-md animate-pulse rounded-card bg-line/50" />}>
            <LoginPanel searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </PageTransition>
  );
}

const LOGIN_NOTICE: Record<string, string> = {
  link: "That link has expired or was already used. Log in, or ask for a new password link.",
  busy: "Too many attempts. Please try again in a few minutes.",
  signedout: "You’ve been signed out on every device.",
};

async function LoginPanel({ searchParams }: { searchParams: PageProps<"/trade/login">["searchParams"] }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  // Already signed in: straight to where they were going.
  if (await getAccount()) redirect(next);
  const notice = LOGIN_NOTICE[String(sp.notice ?? "")];
  return (
    <>
      {notice && (
        <p role="status" className="notice mb-6 max-w-md px-4 py-3 text-[0.9375rem] text-navy">
          {notice}
        </p>
      )}
      <LoginForm next={next} />
      <p className="mt-8 max-w-md text-[0.9375rem] text-ink-muted">
        No account yet?{" "}
        <Link href="/trade/apply" className="text-navy underline underline-offset-4 hover:text-green-ink">
          Apply for a trade account
        </Link>
        .
      </p>
    </>
  );
}
