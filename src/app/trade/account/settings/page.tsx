import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { BrandingForm, SettingsForm } from "@/components/trade/settings-form";
import { CustomerModeBlocked, TradeShell, TradeSkeleton } from "@/components/trade/trade-shell";
import { Button } from "@/components/ui/button";
import { requireApprovedTrade } from "@/lib/auth/trade";
import { getFullPreferences, logoUrl } from "@/lib/trade/preferences";
import { deleteMyAccount, removeLogo, uploadLogo } from "./actions";

export const metadata: Metadata = { title: "Trade settings", robots: { index: false } };

export default function SettingsPage({ searchParams }: PageProps<"/trade/account/settings">) {
  return (
    <PageTransition>
      <Suspense fallback={<TradeSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}

const NOTICE: Record<string, string> = {
  "logo-saved": "Logo saved. It appears on your quotes and PDFs.",
  "logo-removed": "Logo removed.",
  "logo-missing": "Choose a logo file.",
  "logo-size": "That file is over 1 MB. Please use a smaller version.",
  "logo-type": "Use a PNG or JPEG image.",
  "logo-failed": "The upload didn’t work. Please try again.",
  "delete-confirm": "Type DELETE in capitals to confirm.",
  "delete-failed": "Your account couldn’t be deleted. Please try again or contact us.",
};

async function Content({ searchParams }: { searchParams: PageProps<"/trade/account/settings">["searchParams"] }) {
  const { account, customerView } = await requireApprovedTrade("/trade/account/settings");
  const shell = { account, customerView, current: "/trade/account/settings" as const, back: "/trade/account/settings", title: "Settings" };
  if (customerView) return <TradeShell {...shell}><CustomerModeBlocked back="/trade/account/settings" /></TradeShell>;
  const [prefs, sp] = await Promise.all([getFullPreferences(), searchParams]);
  const notice = NOTICE[String(sp.notice ?? "")];
  const logo = logoUrl(prefs.logo_path);
  const name = prefs.display_name || account.companyName || "Your business";

  return (
    <TradeShell {...shell} intro={<p>Your defaults and how your quotes look. Only you can see these.</p>}>
      {notice && <p role="status" className="notice mb-6 max-w-xl px-4 py-3 text-[0.9375rem] text-navy">{notice}</p>}
      <section aria-labelledby="defaults-heading">
        <h2 id="defaults-heading" className="text-display-sm text-navy">Pricing defaults</h2>
        <div className="mt-6">
          <SettingsForm prefs={prefs} />
        </div>
      </section>

      <section id="branding" aria-labelledby="branding-heading" className="mt-stack scroll-mt-24">
        <h2 id="branding-heading" className="text-display-sm text-navy">Your branding on quotes</h2>
        <p className="mt-2 max-w-[60ch] text-[0.9375rem] text-ink-muted">Customers see your business, not Duratek’s prices: your name, logo and contact details head every quote and PDF.</p>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
          <div className="card space-y-8 p-5 sm:p-8">
            <BrandingForm branding={prefs} />
            <form action={uploadLogo} encType="multipart/form-data" className="space-y-3 border-t border-line pt-6">
              <label htmlFor="logo" className="text-[0.9375rem] font-medium text-navy">Logo</label>
              <p className="text-[0.8125rem] text-ink-muted">PNG or JPEG, up to 1 MB. A wide logo on a white background works best.</p>
              <input id="logo" name="logo" type="file" accept="image/png,image/jpeg" required className="block w-full text-[0.9375rem] text-navy file:mr-4 file:min-h-tap file:rounded-control file:border file:border-navy/40 file:bg-white file:px-4 file:text-navy" />
              <Button type="submit" variant="outline">Upload logo</Button>
            </form>
            {logo && (
              <form action={removeLogo}>
                <Button type="submit" variant="quiet">Remove logo</Button>
              </form>
            )}
          </div>
          <aside aria-label="Preview" className="card overflow-hidden">
            <div className="h-1.5" style={{ background: prefs.brand_colour ?? "var(--color-navy)" }} />
            <div className="p-5">
              <p className="text-[0.75rem] uppercase tracking-[0.14em] text-ink-muted">Preview</p>
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  {logo ? (
                    <Image src={logo} alt={`${name} logo`} width={150} height={56} unoptimized className="h-14 w-auto max-w-[150px] object-contain object-left" />
                  ) : (
                    <p className="font-display text-[1.25rem] text-navy">{name}</p>
                  )}
                  <p className="mt-2 text-[0.8125rem] text-ink-muted">{[prefs.contact_phone, prefs.contact_email].filter(Boolean).join(" · ") || "Your contact details"}</p>
                </div>
                <p className="text-right text-[0.75rem] font-semibold uppercase tracking-[0.14em]" style={{ color: prefs.brand_colour ?? "var(--color-navy)" }}>Quotation</p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    
      <section id="your-data" aria-labelledby="data-heading" className="mt-stack scroll-mt-24 border-t border-line pt-10">
        <h2 id="data-heading" className="text-display-sm text-navy">Your information</h2>
        <p className="mt-2 max-w-[60ch] text-[0.9375rem] text-ink-muted">
          Download everything we hold on your account, or delete it. Only you can see your customers, projects and quotes, and deleting removes them.
        </p>
        <p className="mt-4">
          <a href="/trade/account/settings/export" className="min-h-tap py-3 text-[0.9375rem] text-navy underline decoration-green underline-offset-4">
            Download my information (JSON)
          </a>
        </p>
        <form action={deleteMyAccount} className="card mt-6 max-w-xl space-y-3 p-5">
          <p className="font-medium text-navy">Delete my account</p>
          <p className="text-[0.875rem] text-ink-muted">
            This removes your account, customers, projects, quotes, shortlists and settings for good. Quote links you sent will stop working. It can&rsquo;t be undone.
          </p>
          <label htmlFor="delete-confirm" className="block text-[0.875rem] text-navy">Type DELETE to confirm</label>
          <input id="delete-confirm" name="confirm" autoComplete="off" className="min-h-tap w-full rounded-control border border-navy/25 bg-white px-3 text-[0.9375rem] text-navy" />
          <Button type="submit" variant="outline">Delete my account</Button>
        </form>
      </section>
</TradeShell>
  );
}
