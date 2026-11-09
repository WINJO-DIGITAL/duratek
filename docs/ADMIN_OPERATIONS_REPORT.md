# Administration, samples, stockists and privacy

Migration: `20261111090000_admin_operations`. Additive: new tables, columns and functions. It replaces one storage policy (see "A bug fixed") and the audit trigger on finishes and sample requests. No data is dropped or rewritten.

## What the owner can do from the dashboard

| Area | Screen | Permission |
| --- | --- | --- |
| Overview: products, variants, accounts, stockists, samples, enquiries, quote activity (counts only), recent activity | `/admin` | view_reports |
| Analytics: views, samples, enquiries, accounts, quotes, with what each number means | `/admin/analytics` | view_reports |
| Products: create, edit, archive and restore, specifications, photographs, variants with pack coverage, VAT and dimensions | `/admin/finishes` | manage_products |
| Prices: RRP, trade, tiers, per-account, promotions, dated future prices, volume breaks, and a price history (who, what, when) | `/admin/prices`, `/admin/prices/history` | manage_pricing |
| Trade accounts: review, approve, reject (emailed), suspend, tiers, permissions, delete on request | `/admin/accounts` | manage_accounts (delete: manage_settings) |
| Stockists: details, hours, public email, range carried, verification, private lead address, notes, commercial terms | `/admin/stockists` | manage_stockists |
| Enquiries: inbox, status, notes, pass to the stockist | `/admin/enquiries` | manage_stockists |
| Samples: requests, packing, dispatch details, customer email, cancel, CSV, availability per finish | `/admin/samples` | manage_samples |
| Documents: brochures, datasheets, guides, warranties, certificates, marketing photography, brand assets (public or trade only) | `/admin/documents` | manage_documents |
| Privacy: requests, export, erase, retention, consent records, email log | `/admin/privacy` | manage_settings |

## Decisions worth knowing

- **Stockists are verified before they go live.** A database rule (not only the form) refuses to publish a stockist with no verification. Dave's Tiles can be added as a draft; nothing about it is published or invented until the owner has confirmed its details with the business and ticks Verified.
- **No stock promises.** "Range carried" is what a stockist says it sells. Every place it appears says to contact the stockist to check availability. No inventory is connected.
- **Enquiries are passed to a stockist only with the customer's consent.** The wording they agreed to is stored. The stockist's lead address is private (a separate table the public cannot read). If the email fails, the screen says so and the owner can pass it on or contact the stockist.
- **Resale prices.** The RRP stays a recommendation. The stockist terms form says not to record a price a stockist must charge, and the public pages say stockists set their own prices.
- **Samples are free.** No payment is taken. Requests are validated and rate limited (address, email, site-wide), refused if the same person asks again for the same finish within 30 days, or if one address collects many, and refused if a finish is marked out of stock (checked from the database, not the browser).
- **Reporting separates measures.** Views are page loads, not people. Enquiries are messages. Quotes are the traders' own quotes to their customers and an accepted quote is not a Duratek sale. Actual sales show as "Not tracked" because Duratek has no ordering. No revenue figure is shown.
- **Views** are a daily count per finish. No cookie, address or visitor id is stored, and Do Not Track and Global Privacy Control are respected.

## Email

The site already sends through Resend (`src/lib/email.ts`). It stays the recommendation: transactional, a verified sending domain, an inbox API. To switch it on set `RESEND_API_KEY`, `EMAIL_FROM` (an address on a domain verified in Resend) and `OWNER_NOTIFY_EMAIL`. The Supabase auth emails (confirmation, password reset) are separate and go through Supabase's own mail settings: point them at the same provider (custom SMTP) for production.

Every email attempt is written to the email log with its real result: Sent (the provider accepted it), Failed, or Not configured. Nothing is shown as delivered unless the provider accepted it. Kinds: application received and owner notice, account approved, account rejected (the internal reason is never sent), sample confirmation and owner notice, sample dispatched, enquiry received, owner notice and stockist forward, privacy request received. Password recovery is Supabase's.

## Privacy and retention

- Privacy requests: a public form at `/privacy/request` (honeypot, rate limited), logged with a one-month deadline. The owner checks identity, then exports or erases.
- Export: everything held against an email address as JSON. Traders can download their own information, and delete their own account (type DELETE), from Settings. The owner can delete an account on request.
- Erase: anonymises sample requests, enquiries and consent records for an email, and deletes the emails logged to it. Dispatch records stay without the person.
- Retention (settings, owner-editable; **proposed defaults, to confirm with your adviser, not legal advice**): sample requests and enquiries 24 months, rejected applications 12 months, email log 90 days, closed privacy requests 36 months. A daily job applies them (`vercel.json`, needs `CRON_SECRET` and the service key); the owner can also run it from the Privacy screen. The privacy notice states these periods: keep it in step if they change.
- Consent is recorded when someone ticks the marketing box or agrees to share an enquiry, with the words shown, where and when.
- The audit log is append-only. It no longer copies personal details for sample requests, enquiries or privacy requests, and the one narrow exception (clearing copied personal data from older entries on erasure) is limited to those tables and can clear only the copied row data.

## A bug fixed on the way

Visitors could not download public documents (brochures): one storage policy served visitors and traders and called a function visitors may not execute, so the download failed with "permission denied". It was found by the new end-to-end test, which downloads as a visitor (the earlier tests only downloaded as a signed-in trader). The policy is now split: public files for everyone, trade-only files for approved accounts. Who may read what is unchanged. A second bug found the same way: finishes have column-level update grants, so the new `archived_at` column needed its own.

## Verification actually run (local stack)

| Check | Result |
| --- | --- |
| Unit (vitest) | 158 of 158 |
| pgTAP, clean database | 243 of 243 (57 new: roles, RLS, publish guard, consent, erase, export, retention, account deletion, storage, audit contents) |
| Lint, typecheck, production build | clean |
| E2E trade, admin, auth, security, portal | 39, 35, 52, 65, 38 |
| E2E ops (new) | 73 of 73: sample request journey, stockist enquiry journey, privacy journey, permissions, analytics, documents, variants and archive |
| Layout sweep, 390 / 768 / 1440 px, 19 pages | no horizontal overflow, every page has an h1 |
| Production-shaped database (first two migrations only) | build succeeds and every public page, plus the document, view and cron endpoints, respond; the RRP still shows |

## Not verified

- **Real email delivery.** The local suites run with a placeholder key, so every email logs as Failed, and the tests assert that no email is reported as sent. Delivery needs real Resend keys and a verified domain.
- **The live postcode locator.** postcodes.io isn't reachable from the test environment, so postcode search was not run; the enquiry form is tested through the stockist link instead.
- **Production.** The production database is behind these migrations, and its environment has no service key, so online samples, enquiries, privacy requests and view counts stay closed until the key is added. Apply the three newer migrations (with approval) before merging.
- Dave's Tiles has not been added: its details need to come from the business.
