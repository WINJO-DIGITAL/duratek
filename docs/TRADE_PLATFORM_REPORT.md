# Duratek trade platform: technical report

November 2026. Branch `claude/bold-gauss-flm5ge`, built on the production branch `claude/dazzling-gauss-c8nd72` (fast-forward, no history rewritten). Design: `docs/ARCHITECTURE.md`.

## Audit findings that shaped the work

- Production deploys from `claude/dazzling-gauss-c8nd72`. That branch already had public RRP, trade login and application, tier prices, Customer view, and admin for prices and accounts. The work extends it; nothing was rebuilt.
- Production database: Supabase project `oxmwtjyfjbhajzctisbi` (eu-west-1). It is **not** reachable from this build environment (not in the connected Supabase account, and the network blocks it). The connected Supabase project `oqwkvrhkgmuhrrxfsahx` belongs to an unrelated application and was not touched.
- Production environment variables have no `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM` or `OWNER_NOTIFY_EMAIL`. Until they are set, sample requests and trade applications stay closed online (by design), and no emails are sent.
- Verified against the seed and the live site: eleven finishes; standard plank 5mm, 181 × 1219mm, 2.21 m² per pack; extra-long 7mm, 228 × 1492mm, 2.05 m² per pack; 0.55mm wear layer; Unilin click; no herringbone finish yet. No RRPs are set in production yet.

## What was built, by phase

| Phase | Delivered |
| --- | --- |
| Audit | `docs/ARCHITECTURE.md` |
| Database and security | Migration `20261108100000_trade_platform.sql` (additive): `trade_preferences`, `quotes`, `quote_lines`, `sample_requests.sent_at`, `get_shared_quote`, `respond_to_quote`, `admin_dashboard_stats`. RLS on every table. |
| Auth and permissions | `requireApprovedTrade()` alongside the existing `requireAdmin()`. Pending and rejected accounts reach no trade data. |
| Products | `/admin/finishes`: edit details, specification, RRP, publish; new finishes; photograph upload, alt text, kind, order. |
| Pricing engine | `src/lib/pricing/`: markup, margin, VAT, packs, whole-pack pricing, quote totals; account prices editable at `/admin/accounts/[id]`. |
| Trade registration | Existing flow kept; overview counts waiting applications. |
| Trade dashboard | Tabbed trade area: Prices, Quotes, Calculator, Shortlists, Documents, Settings. |
| Customer presentation | Customer view now also hides costs, profit, margins and settings across the trade area; `/s/[token]` shortlists and `/q/[token]` quotes show no trade prices. |
| Calculators | Trade packs and profit calculator (markup or target margin); homeowner "How many packs?" on each finish page (RRP only). |
| Quotations | Quote builder, email to customer, printable customer copy, accept or decline, status tracking. |
| Samples and stockists | `/admin/samples` (mark sent, CSV), `/admin/stockists` (stockists geocoded from postcode, online retailers). |
| Admin and analytics | `/admin` overview: work waiting, last 30 days, samples by week, most sampled and most quoted finishes. |
| Documents | `/admin/documents` PDF upload (private bucket); `/documents/[id]` 60 second signed links. |

## Tests executed

All run in this environment against a local Supabase stack (Postgres 17, Auth, Storage, PostgREST) started from the repository's own migrations and seed, and a production build (`next build` + `next start`). Final run from a clean `supabase db reset`:

| Suite | Result |
| --- | --- |
| `supabase db reset` (all three migrations from empty, then seed) | applied |
| pgTAP RLS tests (`supabase/tests/*.test.sql`) | 81/81 (44 existing, 37 new) |
| Unit tests (Vitest) | 104/104 in 27 files |
| ESLint, TypeScript strict | clean |
| `next build` | 52 routes, no prerender errors |
| Trade end-to-end, real browser (Playwright) | 40/40 |
| Admin end-to-end, real browser | 34/34 |
| Direct database API attacks (anon, pending, other trader) | 27/27 |
| Layout: 19 pages at 390, 768 and 1440px, no horizontal scroll, one h1 | 57/57 |
| Login limiter: ten attempts then blocked, even with the right password | pass |
| Vercel preview builds of both feature commits | READY |
| Preview against the production database (migration not yet applied): finish page with estimator | 200, no errors |

The new pgTAP tests were checked to fail by temporarily adding a permissive policy to `quote_lines` (three isolation tests failed), then passed again once it was removed.

### Failures found and fixed

- **Typed values lost after a validation error.** React 19 resets uncontrolled fields after a form action, so a trader who mistyped an email lost the whole form and the resubmission was empty. Every new form now echoes values back. A regression check is in the trade suite.
- **Calculator and quote disagreed by pennies.** The calculator priced 22.1 m² × £22.22 (£491.06); the quote priced 10 packs × £49.11 (£491.10). Packs are now priced whole everywhere, with a regression test.
- **Labels on multi-form admin pages pointed at the wrong inputs.** `Field` ignored an explicit `id`; it now honours one.
- **The weekly chart drew a single full-width green block** (against the brand rule). It now shows all twelve weeks with slim navy bars.
- **The customer quote page had no h1.** Fixed.
- A unit test of mine wrongly expected an exact 40% markup after penny rounding; the code was right, the test now states the 1 basis point tolerance.

Other early failures were in the test scripts (selectors, waits for streamed content, an old server left running), not the application. They are not counted as fixes.

### Not tested here

- Real email delivery (no Resend key in this environment). Email paths fail closed: a failed email never loses a saved record.
- Postcode geocoding (postcodes.io is blocked here). Stockists saved without coordinates are flagged "No location" in admin, and the owner is told to save again.
- Demo photography from cdn.shopify.com (blocked here). It loads on Vercel.

## What remains outstanding

These need you, or Duratek. Nothing here was guessed:

- **Apply the migration to production.** This environment cannot reach the production database.
- **Set the production environment variables** listed below.
- **Promote to production.** The code is on `claude/bold-gauss-flm5ge`; production deploys from `claude/dazzling-gauss-c8nd72`.
- **Business decisions:** whether quote emails should come from the Duratek address (now: Duratek's `EMAIL_FROM`, with replies going to the trader); real RRPs and tier prices; who administers day to day.
- **Content:** documents (technical sheets, warranty, certificates, brochure), stockist list, real photography, confirmed specifications (all finishes are still demo data).

## Deployment instructions

Run the steps in this order. The migration is additive: it creates three tables, three functions and one nullable column, and changes or deletes nothing that exists. The public site does not depend on it (verified on the preview against production), but the new trade and admin pages do, so apply it before the code goes live.

1. **Back up.** In the Supabase dashboard for project `oxmwtjyfjbhajzctisbi`: Database, Backups. Confirm a recent backup exists.
2. **Apply the migration.** Either `npx supabase link --project-ref oxmwtjyfjbhajzctisbi && npx supabase db push`, which applies only `20261108100000_trade_platform.sql`, or paste that file into the SQL editor and run it once.
3. **Run the RLS tests against a branch or staging copy** if you have one: `npx supabase test db --linked`. They roll back and leave no data.
4. **Set Vercel environment variables (Production):**
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase, Settings, API, service role. Server only; never prefix with `NEXT_PUBLIC_`.
   - `RESEND_API_KEY`, `EMAIL_FROM` (on a domain verified in Resend), `OWNER_NOTIFY_EMAIL`.
   - Optional: `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`, a stable 32-byte base64 key, so in-flight forms survive deploys.
5. **Make the first owner an admin**, if not done yet (see README).
6. **Deploy.** Open a pull request from `claude/bold-gauss-flm5ge` into `claude/dazzling-gauss-c8nd72` and merge it. Vercel builds and promotes it.
7. **Smoke test on production:** log in as the owner and open `/admin` (figures load). As an approved trader, create a quote, add a flooring line, mark it sent, and open the customer link in a private window. Upload one PDF at `/admin/documents` and download it as the trader.
8. **Roll back if needed:** promote the previous deployment in Vercel (Deployments, ⋯, Promote). The database needs no rollback, because the old code ignores the new tables.
