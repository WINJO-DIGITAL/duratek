# Duratek security

Two independent layers protect everything private: the **server** (pages, actions and routes check the signed-in account before reading or rendering), and the **database** (Row Level Security, guard triggers and `SECURITY DEFINER` functions that check again). A front-end-only restriction is never relied on.

## Accounts and roles

| Account | Can |
| --- | --- |
| Visitor (no account) | Public product information, public RRP and public offers, free samples, where to buy, shared shortlists and their own customer quote link |
| Trade customer (approved) | Their own account, their price (account, tier or standard trade, plus trade promotions), calculators, quotes, projects, shortlists, trade documents |
| Stockist (approved) | As trade, with stockist prices, and their own stockist listing |
| Administrator | Only the areas granted (below) |
| Super administrator | Everything, including roles and permissions |

Pending, rejected and suspended accounts are treated as visitors for anything trade: the RRP only, no quotes, projects or trade documents. Suspension takes effect on the next request (status is read live, not from the session), so a suspended person who is still signed in loses access straight away.

### Administrator permissions

`manage_accounts` (applications, approval, suspension, tiers), `manage_pricing` (price lists, RRPs, tiers, promotions, account prices), `manage_products`, `manage_stockists`, `manage_samples` (customers' personal details), `manage_documents`, `manage_settings`, `view_reports`, `view_audit`.

- Only a super administrator grants permissions or changes roles, and never their own.
- Nobody changes their own status, role or permissions.
- A suspended or rejected administrator has no permissions.
- In the app: `requireAdmin(permission)` returns a plain 404 to anyone without it, and the admin tabs show only what the person may open. In the database: `has_permission()` in every policy.

## Authentication (Supabase Auth)

- **Email verification:** confirmations required. Our email templates link to `/auth/confirm?token_hash=…`, which works in any browser. A used or replaced link is refused, and asking again issues a new one that invalidates the old.
- **Login:** rate-limited (10 per 15 minutes per address, plus Supabase's own limits), honeypot, one message for every failure. An unconfirmed email is mentioned only after the password matched, with a resend button.
- **Password reset:** the same answer whether or not the address has an account; rate-limited per address and per email; a one-hour, single-use link; 10–72 characters, typed twice; every other session is signed out afterwards; a "password changed" email is sent.
- **Sessions:** HTTP-only cookies refreshed by `src/proxy.ts`; every request verifies the user with the Auth server (`getUser`), never trusting the cookie alone. "Log out everywhere" revokes every session. Expired or forged tokens are refused by the API and treated as signed out by the site.
- **Registration:** validated on the server, then again in the database trigger that creates the account. Status, role and tier are never taken from signup data; bad VAT numbers or postcodes are dropped.

## Database policies

- RLS is enabled on every table. `anon` has no privileges at all on private tables, so a missing policy can't leak them.
- Trade data is visible only to its owner while approved: quotes and lines, projects and items, preferences, shortlists, saved products.
- Price lists and items are readable only with `manage_pricing`. Everyone else gets prices only through the resolver, which decides from `auth.uid()`. Internal functions (`_resolve_price`, `backfill_foundation`, `refresh_legacy_prices`) can't be called by any API role.
- Legacy price tables and the legacy RRP column can't be written by any API role; triggers keep them in step.
- Personal data (sample requests; applicants' emails, held in Auth) is readable only with `manage_samples` or `manage_accounts`; emails are looked up on the server.
- Customer links: `get_shared_quote(token)` returns sell prices only (never cost, margin or the customer's contact details), never for a draft, and never once the trader has lost access. Tokens are 24 random bytes.
- Storage: product photographs are public; documents are private, served by 60-second signed links created as the visitor, so the storage policy decides again.

## Audit log

Triggers record who (`auth.uid()`), when, which record, which fields changed and their before and after values. The log covers:

- account status, tier, role and business changes
- permission grants
- tiers, price lists and every price
- finishes, variants, collections and photographs
- documents
- stockists and online retailers
- settings
- sample dispatch

The log is append-only. Update, delete and truncate are refused by triggers, **even for the database owner and the service role**. It is readable only with `view_audit`, at `/admin/audit`.

## Secrets

`SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` are server-only environment variables, never prefixed `NEXT_PUBLIC_`, and only imported from `server-only` modules. No secret is committed; `.env*` is ignored. The anon key is public by design; RLS protects the data behind it.

## Tests

| Suite | Command | Covers |
| --- | --- | --- |
| pgTAP (`supabase/tests/*.test.sql`) | `npm run db:test` | Every policy and guard, the resolver's rules, suspension, the audit log's immutability, registration sanitising |
| Unit (Vitest) | `npm test` | Pricing maths, validation, permissions, CSV safety |
| Browser and API (`tests/e2e/`) | `npm run test:e2e` (local stack only) | Registration, email confirmation, login, password reset, sessions, suspension, roles, pricing admin, quotes, customer links. The security suite attacks the API directly: unauthenticated access, privilege escalation, cross-account access, direct database writes, attempts to read private prices, invalid input, expired and forged sessions, suspension, and prices supplied by the browser |

## Production settings to match

Supabase dashboard, Authentication:

- Turn on "Confirm email".
- Set the minimum password length to 10.
- Set the Site URL to the live domain, with redirect URLs for `https://<domain>/**`.
- Paste the three templates from `supabase/templates/`.
- Set up custom SMTP (for example Resend) so auth emails come from Duratek.

## Administration, enquiries and privacy

- Enquiries, consent records, privacy requests, the email log and private stockist detail are readable only by the matching administrator permission (RLS). The public cannot read any of them, and only the server (service role) creates enquiries and privacy requests, after validation, a honeypot and rate limits.
- `export_person_data`, `erase_person_data`, `purge_expired_personal_data` and `delete_trade_account` are security definer functions that check the permission (or the caller's own account) inside the function. Administrators cannot be deleted through them.
- `record_finish_view` can be called only by the service role.
- Uploaded documents are identified by their first bytes, not their name or declared type; SVG is never accepted.
- The retention job needs `CRON_SECRET` and refuses without it.

## Transport, cookies and uploads (final QA)

- Every response carries `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, a referrer policy, a permissions policy that turns off camera, microphone, location and payment, HSTS, and a narrow content security policy (framing, base URL, form targets, plugins). The framework header is removed.
- The Supabase auth cookies are HttpOnly, SameSite=Lax and, in production, Secure. The browser never reads them; every authenticated request goes through the server.
- Uploads are identified by their bytes, never their name or declared type. Images (photographs, logos) must be a real PNG, JPEG, WebP or AVIF and nothing else: SVG, HTML and files with content appended are refused. Documents follow the same rule (`src/lib/documents.ts`, `src/lib/files.ts`). Stored names are generated.
- `LOGIN_RATE_MAX` (default 10 per 15 minutes per address) exists so test servers can raise the login limit; leave it unset in production.
