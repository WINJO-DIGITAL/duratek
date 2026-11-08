# Database, security and pricing engine: report

November 2026, branch `claude/bold-gauss-flm5ge`. Reference: `docs/DATABASE.md`, `docs/SECURITY.md`, `docs/PRICING.md`.

## Built on the existing project

The existing architecture is kept: Next.js 16 server components and actions, Supabase Postgres with Row Level Security, and Supabase Auth. Nothing was rebuilt.

- `finishes` stays the product record; variants hang off it, so there are no duplicate products.
- The trade platform from the previous phase (quotes, shortlists, documents) now runs on the new resolver.
- Migrations only add. No existing table, column or row was dropped, and old price data is copied, not moved.

## What each requirement maps to

| Requirement | Where |
| --- | --- |
| Users, roles | `auth.users`, `profiles.role` (super_admin, admin, trade, stockist), `admin_permissions` (nine permissions) |
| Trade applications, businesses | `trade_applications` (submission and review), `businesses` (address, postcode, company number, VAT number, website). Statuses pending, approved, rejected, suspended on `profiles.status` |
| Products, collections, variants, specifications, images, documents | `finishes`, `collections`, `product_variants` (SKU, unit of sale, measurements, VAT rate), `finishes.specs`, `finish_images`, `documents` |
| Public prices, trade lists, tiers, negotiated, stockist, product-specific, promotions, volume, future | `price_lists` (rrp, trade, tier, stockist, account, promotion) and `price_list_items` (per variant, unit, volume break, dates) |
| GBP and UK VAT, units | GBP enforced; list-level VAT inclusive or exclusive; per-variant VAT rate; unit of sale and price unit |
| Saved products and projects, quotations | `saved_products`, `projects`, `project_items`, `quotes` (linked to projects) |
| Audit logs | `audit_log`, written by triggers, append-only even for the owner |
| System settings | `system_settings` |
| Email verification, login, reset, sessions, approval, suspension | `/auth/confirm`, login, `/trade/forgot-password`, `/trade/reset-password`, log out everywhere, `/admin/accounts` |
| Owner manages all pricing | `/admin/prices`, its list pages, account prices |
| Correct price for the user | `_resolve_price`, called through `price_for`, `catalogue_prices` and `price_for_account` |

## Tests run

All against a local Supabase stack built from the repository's migrations and seed, and a production build (`next build`, `next start`). Every suite was run with real outcomes recorded; nothing was skipped or disabled.

| Suite | Result |
| --- | --- |
| pgTAP (`npm run db:test`) | 159/159 (78 new foundation tests) |
| Unit tests (`npm test`) | 115/115 |
| Lint, TypeScript strict, `next build` | clean; 58 routes |
| Upgrade rehearsal on production-shaped data | legacy tier prices, account prices, RRPs and account states identical by checksum |
| Browser: auth, roles, pricing admin (real emails via the mail catcher) | 52/52 |
| Browser: trade platform (regression) | 40/40 |
| Browser: owner admin (regression) | 34/34 |
| Security (API attacks, sessions, browser-supplied prices) | 65/65 |

The security suite covers each category requested:

- **Unauthenticated access:** 15 tables plus internal functions.
- **Privilege escalation:** role, legacy admin flag, tier, permissions, price writes, settings, the audit log, products, a tampered token and a token signed with the wrong key.
- **Cross-account access:** another trader's quotes, costs, projects, saved products and negotiated prices, and attaching to another trader's project.
- **Direct database access:** the service role and the database owner both trying to change audit records.
- **Retrieving private prices:** another account's price, raw price lists, future prices.
- **Invalid input:** VAT number, company number, negative price, currency, dates, stock code, injection-shaped tokens.
- **Session expiry:** a valid token (as a control) against the same token expired, plus an expired session in the browser.
- **Password recovery:** in the auth suite.
- **Suspension:** prices, quotes, documents and reinstating oneself.
- **Browser-supplied prices:** forged cost fields posted with a quote line are ignored.

## Failures found, fixed and retested

| Found by | Problem | Fix |
| --- | --- | --- |
| pgTAP on a fresh database | Migrations run before the seed, so a fresh install had no variants or price lists | One idempotent `backfill_foundation()`, run by the migration (existing data) and by the seed |
| pgTAP | **The backfill erased legacy tier prices before copying them**: the sync trigger rebuilt the derived rows on the first insert | The sync pauses during the backfill and rebuilds once at the end; the backfill refuses to finish if any legacy row would be lost. Upgrade rehearsed with checksums |
| Migration review | The resolver used a temporary table in a STABLE function; the business backfill matched companies by name | Rewritten as a single SQL query; backfill links one business per profile by id |
| Browser (runner) | A quote line took its variant from the cached catalogue, which can point at a stale id after a rebuild | The quote action looks the variant up fresh; prices are never decided from a cache |
| Browser | Test harness issues (selectors, a stale confirmation link after "send again", claims left set in pgTAP, fixture files outside the repo) | Tests corrected; fixtures are generated by the suite |

The pgTAP corrections were all mistakes in the tests' expectations. For example, 45 packs is 99.45 m², below a 100 m² break, and a hidden row produces "no change", not an error. Each was checked against the rule before the test was changed.

## Outstanding

- **Production:** apply the five migrations in order. The database in this environment is not production, and the production project is not reachable from here. Then match the Auth settings: confirm email, 10-character minimum password, site URL and redirects, the three templates, and SMTP. Steps are in `docs/SECURITY.md`.
- **To confirm with Duratek:**
  - RRPs include VAT and trade prices exclude it.
  - All products are standard-rated.
  - A promotion applies only when it is lower.
  - SKUs: the demo codes are `DT-<WEB-ADDRESS>`; replace them with real stock codes.
  - Whether suspended accounts should be emailed.
- **Screens not built yet** (the database and security for them are complete): saved products and projects for signed-in accounts (the site still saves finishes in the browser), variant and collection editing beyond the default variant, and stockists editing their own listing.
- **Legacy price copies** (`prices`, `price_overrides`, `finishes.rrp_per_m2_pence`): once production runs this code, they can be dropped in a later migration, with your approval.

## Deployment

The order matters: database first, then code.

1. Back up the production database (Supabase, Database, Backups).
2. Apply the migrations: `npx supabase link --project-ref oxmwtjyfjbhajzctisbi && npx supabase db push`. This applies `20261108100000`, `20261109090000` and `20261109100000`. The backfill copies existing prices and accounts and refuses to finish if anything would be lost.
3. Set the Auth settings above. Set `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM` and `OWNER_NOTIFY_EMAIL` in Vercel (Production).
4. Merge the branch into the production branch; Vercel builds and deploys it.
5. Smoke test:
   - The public finish page shows the RRP.
   - An approved trade account sees its price.
   - `/admin/prices` and `/admin/audit` load for the owner.
   - A test application receives the confirmation email.
6. Roll back by promoting the previous Vercel deployment. The old code still works on the new database, because the legacy copies are maintained.

## Running the tests locally

```bash
npx supabase start            # needs Docker
cp .env.example .env.local    # fill from: npx supabase status -o env
npm run db:test && npm test && npm run lint && npm run typecheck && npm run build
npm run test:e2e              # browser and security suites; local stack only (refuses otherwise)
```
