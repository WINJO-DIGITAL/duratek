# Launch checklist and site audit

Audit date: 9 November 2026. Scope: the whole public site, the trade area, the owner admin, the database, the deployment configuration and the content. Sources: the code on `claude/bold-gauss-flm5ge` (commit 973c960), the local test suites, the Vercel project configuration (variable names only, no values), and the live site where the sandbox could reach it.

The checklist is ordered by what stops a launch. Work top to bottom. Items marked **client** need an answer or material from Duratek. Items marked **owner** are configuration you control in Vercel or Supabase.

## Verdict

Not ready for public launch. The code is in good shape and the automated checks pass locally (see "What is already verified"). Launch is blocked by configuration that is missing in production, by content the client has not yet supplied, and by one legal page that does not exist.

## Blockers (must be done before launch)

- [x] **Production database migrations are applied.** All eight migrations are in the live project (`yylabmndksmbfeuqgtmt`). They were applied by hand, so the migration history needed repairing before any `supabase db push`: see `docs/PRODUCTION_UPGRADE.md`.
- [ ] **Service-role key is not set in production.** `SUPABASE_SERVICE_ROLE_KEY` is missing from the Vercel project. Without it, online sample requests, enquiries, privacy requests, the view counter and the email log all stay closed or silent, and the owner-side code paths that use the service client do not run. *Owner.* Set it as a sensitive variable on Production only.
- [ ] **No email provider is configured.** `RESEND_API_KEY`, `EMAIL_FROM` and `OWNER_NOTIFY_EMAIL` are missing. Every transactional email (trade application received and approved, sample confirmation, owner alerts, dispatch, enquiries, privacy) will be logged as "not configured" and nothing will be sent. *Owner.* Verify a sending domain in Resend first; `EMAIL_FROM` must be on that domain.
- [ ] **Retention cron cannot run.** `CRON_SECRET` is missing, so `/api/cron/retention` refuses every call (correct, but personal data is never purged automatically). Set a long random value. *Owner.*
- [ ] **Terms page is missing.** The brief lists `/terms`, the footer links privacy and cookies only, and no `src/app/terms` exists. *Client to supply the terms; developer to publish.* Trade terms of business and the quote terms printed on PDFs need the same review.
- [ ] **Contact and company details are empty.** `src/lib/contact.ts` has no phone, email, locations, social profiles or company registration details. The footer hides those parts, but customers, the privacy notice ("write to us") and the legal strip (UK Companies Act disclosure) need them. *Client.*
- [x] **Photography rights.** The 11 finishes' photographs and specifications come from the Kwik Floors Duratek collection (`cdn.shopify.com`). The owner of Kwik Floors is also the owner of Duratek, who has confirmed (November 2026) that the images may be used. Record the permission in writing for the file. *Remaining, optional:* the images are loaded from Kwik's Shopify CDN, so if Kwik changes or removes a product the link breaks; copy them into Duratek's own Supabase Storage when convenient (needs network access to download). The specifications should still be confirmed as Duratek's.

## Required before launch (high)

- [ ] **Supabase Auth settings** (not in the repo; check in the Supabase dashboard for the production project): email confirmation on, minimum password length 10 or more, the site URL set to `https://duratek.vercel.app`, redirect allow-list containing only the site's own `/auth/confirm` and `/trade/reset-password` routes, custom SMTP pointed at the same email provider so confirmation and reset emails come from Duratek's domain, and rate limits left on. *Owner.*
- [ ] **Custom domain and `NEXT_PUBLIC_SITE_URL`.** The site URL is currently the Vercel address. Once a domain is chosen, update `NEXT_PUBLIC_SITE_URL`, the Supabase site URL and the Resend domain together. The domain is an open item for the client. *Client, then owner.*
- [ ] **Owner accounts.** Create the owner's admin account, grant the permissions each administrator needs (the admin screens are per permission), and confirm the people who will handle approvals, samples and stockists (open item in CLAUDE.md). *Client.*
- [ ] **Dave's Tiles listing.** The brief says do not publish it without verified details. It is not in the system. Keep it that way until the business confirms its address, contact and opening details, then add it as a verified stockist. *Client supplies details; owner adds.*
- [ ] **Stockist list.** The stockist and fitter list is an open item. Until it arrives the Where to buy page shows the empty state, which offers samples and an enquiry. That is acceptable, but say so to the client. *Client.*
- [ ] **Retention periods confirmed.** The proposed periods (sample requests and enquiries 24 months, rejected applications 12 months, email log 90 days, closed privacy requests 36 months) are in the privacy notice and in Settings. *Client's adviser to confirm; update the privacy notice if they change.*
- [ ] **Privacy notice reviewed by the client's adviser.** It describes the processing, the processors (Supabase, Resend, Vercel, postcodes.io), the retention periods and the rights. It has been written from the code, not reviewed by a lawyer.
- [ ] **Cookie position confirmed.** The site sets no advertising or analytics cookies and the view counter stores no visitor data. It does set the customer-view cookie, and the sample tray and saved finishes use the browser's storage at the visitor's request. Confirm with the client's adviser whether a consent banner is required under PECR. The brief asks for a compact banner if one is needed; none exists yet.
- [ ] **Warranty wording.** Every warranty mention carries the disclaimer (checked). The client should confirm the warranty terms themselves, which are not in the repo.
- [ ] **Product facts.** Confirm the specifications on each finish, especially thickness, wear layer, pack coverage and plank sizes, against Duratek's technical sheets (open item: full finish list with sizes and specs).
- [ ] **Brand assets.** Replace the placeholder wordmark, badge artwork and any placeholder photography with the client's files (open item: logo SVG and badges).

## Recommended (before or shortly after launch)

- [ ] Restore the ability to test the live deployment: run `npm run test:qa` and `npm run test:e2e` against a Vercel preview with the migrations applied, not only locally.
- [ ] Raise the login rate limit default review (currently 10 attempts per 15 minutes per address, counting successes). A busy office behind one address can lock itself out. Consider a higher limit that counts only failures.
- [ ] Browser coverage: test in Safari and Firefox, and on a real iPhone and an Android device, including the sticky bottom bar and the finish explorer's swipe.
- [ ] Accessibility: run a screen reader pass (VoiceOver and NVDA) over the sample request, the enquiry form and the trade apply form, and an automated axe scan over the public pages.
- [ ] Performance: check Core Web Vitals on the home page and a finish page on a mid-range phone over a slow connection. Confirm the hero video and images are lazy-loaded below the fold.
- [ ] Set up monitoring: Vercel runtime error alerts, and a weekly check of the email log for "failed" entries.
- [ ] Storage: Supabase Storage does not send `X-Content-Type-Options` on public files. Files are checked as real images on upload, so this is low risk, but confirm the platform's behaviour.
- [ ] Backups: confirm Supabase point-in-time recovery is enabled on the production project.
- [ ] Write the owner's runbook: how to approve an account, send a sample, pass on an enquiry, export or erase a person, and run retention. The admin screens are built for this; a one-page guide helps the day-to-day administrators.
- [ ] Decide the email address that receives privacy requests and owner alerts, and set `OWNER_NOTIFY_EMAIL` to it.

## What is already verified

These are checked by automated tests against the local stack, using a fresh database for each suite. They pass on the commit listed above.

- Unit tests: 191 of 191.
- Database tests (pgTAP): 243 of 243, covering roles, row level security, the publish guard, consent, export, erase, retention, account deletion, storage access and audit contents.
- End-to-end suites: trade 39, admin 35, auth 52, security 65, portal 38, ops 73 (302 checks in total).
- QA suite: 8,100 price resolver answers against an independent model, 47 trade price confidentiality checks across 9 kinds of caller, 44 HTTP security checks, 28 functional journeys.
- Lint, typecheck and the production build are clean. `npm audit --omit=dev` reports no known vulnerabilities.
- Layout at 390, 768 and 1440 px: no horizontal overflow and one h1 on each of 19 pages checked.
- Public pages against the production-shaped schema: build succeeds and each public page responds.
- No secrets are committed (only `.env.example` is tracked). No seeded accounts with known passwords exist in the seed.
- Live site: one finish page responds with no trade price fields, and Vercel reports no runtime errors in the last 7 days.

## What is not verified

- The live site's newer features. The production deployment runs older code against an older database, so the portal, enquiries, privacy and analytics are not live.
- Real email delivery, the real postcodes.io service, and a live check of the Supabase Auth settings.
- Real browsers beyond Chromium, screen readers, mobile devices and load.
- Legal wording, the terms of business and the consent position.
- Content accuracy: the RRPs, trade tiers, product specifications and warranty terms are unconfirmed.

## Owner and client responsibilities at a glance

- Owner (configuration): service-role key, email keys and sending domain, cron secret, applying the migrations, Supabase Auth settings, custom domain, backups, monitoring.
- Client (content and decisions): terms, contact and company details, RRPs and trade tiers, photography rights or replacements, product specifications, warranty wording, retention periods, cookie position, stockist list and Dave's Tiles details, the people who administer the site.
