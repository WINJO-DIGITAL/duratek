# Final QA and verification

Method: nothing from earlier phases was taken as working. Each area was re-tested with checks written separately from the code, against the real server and the real local database. Where a check failed, the code was fixed and the check rerun. `npm run test:qa` repeats the new checks; `npm run test:e2e` the earlier suites.

## Defects found and fixed

| Found by | Defect | Fix |
| --- | --- | --- |
| Pricing, exact-arithmetic reference | **Pack count could be wrong.** Pack coverage was rounded to hundredths before dividing, though the database stores thousandths. With a coverage such as 2.205 m² a 2.21 m² floor needed 2 packs but 1 was ordered (a pack short); other coverages over-ordered. An infinite area was also accepted. | `planPacks` works in whole numbers (hundredths of m², of a percent, thousandths of m²) and refuses non-finite input. |
| Security battery | **Auth cookies were readable by scripts** (not HttpOnly) though the browser never needs them. | HttpOnly, SameSite=Lax, Secure in production (`src/lib/supabase/cookie-options.ts`). |
| Security battery | **No security headers**: no clickjacking protection, nosniff, referrer or permissions policy; the framework announced itself. | Headers on every response and a narrow content security policy (framing, base URL, form targets, plugins); `X-Powered-By` removed. |
| Security battery | **Photograph upload trusted the type the browser declared.** An HTML or SVG file named like a PNG was accepted into the public image store. | The type is read from the bytes (PNG, JPEG, WebP, AVIF), and the file must be only the image. |
| Security battery | **Logo upload accepted a PNG with a page appended** (a polyglot). | Same check: the file must end where the image ends. |
| Functional journeys | **The trade page mentioned "warranty documents" without the warranty disclaimer**, which the brand rule forbids. | Reworded: "Technical sheets, certificates and fitting guides". |
| Build check | My new test used BigInt literals the project's TypeScript target rejects, which would have failed the deploy. | Rewritten without literals; the build passes. |

Found in the previous phase and fixed there: public document downloads failed for visitors (storage policy), and finishes' column grants blocked archiving.

## What was verified, and how

**Pricing and calculations** (`src/lib/pricing/qa.test.ts`, `tests/qa/resolver.mjs`)
- Packs, areas, per-pack price, markup, margin, VAT, job totals and typed money are compared with an exact BigInt reference over boundaries and thousands of seeded random cases: whole packs, exact fits, wastage 0% and 50%, half-penny VAT, zero and negative bases, loss margins, float traps such as 2.005 and 1.15.
- The database resolver is checked differentially: 150 random price configurations (nine lists, volume breaks, past, current and future prices, inactive lists, promotions, VAT-inclusive and exclusive) against a separate model of the documented rules, for nine kinds of caller (visitor, pending, rejected, suspended, tier A, tier B, account with its own price, stockist, approved without a tier) at six quantities: 8,100 answers match. The harness was shown to catch two deliberately wrong models.
- Required formulas hold: gross profit = selling price ex VAT - buying cost ex VAT; margin = profit / selling price; markup = profit / cost. At 22.22 bought and 32.00 sold: 9.78, 30.56%, 44.01%.

**Trade price confidentiality** (`tests/qa/confidential.mjs`, 47 checks)
- Seeded distinct prices (tier A 22.22, tier B 11.11, standard trade 19.99, an account's own 18.88). For visitor, pending, rejected, suspended, both tiers, the account and the untiered account: 34 page responses each (HTML and RSC data) and every database table and function carry no trade price that isn't theirs; their own price does show; asking about another account or a future date is refused or ignored.

**Security** (`tests/qa/security.mjs`, 44 checks, plus the 65 earlier database-level checks)
- A visitor is turned away from all 29 admin and trade screens, downloads, exports and PDFs; drafts are unreachable; a shared shortlist shows no price.
- Another trader reads none of a trader's quotes, customers, projects, PDFs or exports; an approved trader reaches no admin screen; escalation by role, status, tier, permission, deletion or erasure fails; tokens are long and random.
- Sessions: HttpOnly cookies; a copied session dies when its owner logs out; a tampered cookie is signed out; repeated wrong passwords are rate limited.
- Login never redirects off-site and does honour a safe path; the same message for a wrong password and an unknown address; the same answer from password recovery for known and unknown addresses (the earlier suite also covers reset, single-use links, and signing out other devices).
- Input: script and markup in sample requests are shown as text and never run; a NUL byte and a 200,000 character field are handled; injection strings in queries and postcodes change nothing; quote pages and PDFs escape trader-entered text.
- Uploads: SVG, HTML and PHP disguised as images, a PNG with a page appended, oversize and empty files are refused for logos, photographs and documents; stored names are generated; a trader cannot write into another's folder, the photograph or document stores, or store an HTML page; a visitor cannot list the logo store.
- Disclosure: secrets and source files can't be fetched, no source maps, no stack traces, the service-role key and email key are not in the browser bundle.

**Functional journeys** (`tests/qa/journeys.mjs`, 28 checks)
- Every published finish is listed; colour filters are exact; an unpublished finish is not found; on every finish page the name, RRP, plank size, pack coverage and 0.55 mm wear layer equal the database; one h1, alt text, language, no "scratch-proof" claim, disclaimer with every warranty mention; the warranty page states 25 years, 10 years, light and medium traffic only.
- Saved finishes persist and survive cleared storage; the sample tray holds three, explains the limit and persists across pages.
- The stockist locator, against a stand-in postcode service: nearest first with distances, 60 mile limit, drafts and hidden stockists never listed, results in the page without scripts, no stock promise, the empty state, invalid, unknown and service-down postcodes, injection.
- The finish explorer moves with the arrow keys once focused.
- Registration, email confirmation, approval, suspension and login are covered by the earlier auth suite (52 checks), re-run here and passing.

## Totals (local stack)

Unit 191, pgTAP 243, e2e 302 (trade 39, admin 35, auth 52, security 65, portal 38, ops 73), QA 8,219 resolver and page checks (8,100 + 47 + 44 + 28). Lint, typecheck and the production build are clean. The earlier production-schema check (public pages against the first two migrations) still applies: no schema changed in this pass.

## Not verified, and worth knowing

- **The live site.** It can't be reached from the test environment directly. Through the Vercel connector one finish page loaded (200) with no trade price fields and no runtime errors in the last 7 days. The live deployment runs older code against an older database; none of the new work is live. Re-run these checks against a preview with the migrations applied before go-live.
- **Real services.** Email delivery (placeholder key only), the real postcodes.io (a stand-in was used), Resend and Supabase Auth settings on the production project (email confirmation, password policy, redirect allow-list) were not inspected.
- **Browsers.** Chromium only. Not tested in Safari or Firefox, with a screen reader, or under load.
- **Cross-site request forgery** relies on Next.js's built-in origin check for server actions; it was not attacked directly.
- Supabase Storage does not send `X-Content-Type-Options` on public files. The files are verified as real images before storing and served as `image/png` or `image/jpeg`, but the header is the platform's to set.

## Observations (not defects)

- The login limiter allows 10 attempts per 15 minutes per address and counts successes, so a busy office behind one address could lock itself out. `LOGIN_RATE_MAX` raises it on a test server; consider raising the production default.
- Loss margins round half toward zero rather than away from it (a margin of -12.5 basis points shows as -12). It is within one hundredth of a percent.
- The explorer's arrow keys need the stage focused (it is the first tab stop); they do nothing from the page body.
- A business whose enquiry is forwarded to a stockist depends on the stockist having a private lead address set; otherwise the owner passes it on by hand (the screen says so).
