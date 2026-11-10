# Production upgrade plan

Status: **rehearsed locally, not applied.** Nothing in this plan has been run against production. Applying it needs the owner's go-ahead.

## Where production is

- The live site runs commit `6b40e4e` from branch `claude/dazzling-gauss-c8nd72`. Pushing to that branch deploys.
- The live database (`oxmwtjyfjbhajzctisbi`) has the first two migrations: `20261104120000_init_schema` and `20261105100000_finish_rrp`.
- **Six** migrations are waiting, in this order:
  - `20261108100000_trade_platform`
  - `20261109090000_account_suspended`
  - `20261109100000_foundation`
  - `20261110090000_quote_line_kinds`
  - `20261110100000_trade_portal`
  - `20261111090000_admin_operations`
- The working branch `claude/bold-gauss-flm5ge` merges into the production branch with no conflicts.

## What the rehearsal showed

`bash scripts/rehearse-upgrade.sh` builds a local database at production's exact schema with the seed production was loaded with, adds rows like the ones production may hold (accounts in each state, an account price, a sample request, a published stockist, documents, a shortlist), applies the six migrations, and compares.

- **Existing data is unchanged.** Checksums of 13 tables match before and after: finishes, photographs, tiers, tier prices, account prices, profiles, logins, sample requests, stockists, online retailers, documents, shortlists and inspiration.
- **Prices carry over.** Every tier price and the account price are in the new price lists. A visitor still gets the same RRP on every finish. An approved account gets its account price where one was set and its tier price elsewhere. A pending account gets only the RRP.
- **Accounts carry over.** The owner (`is_admin`) becomes a super administrator. Trade accounts keep the trade role.
- **A stockist that was already published stays published.** The new "verify before publishing" rule applies only to listings published from now on. Verify existing live listings afterwards.
- **The site works on the upgraded copy.** The production build succeeds and 16 public pages respond, with the RRP showing.

What the rehearsal cannot show: production's real rows. If production holds data the seed and the sample rows don't resemble (for example a profile with no company name, or a finish with no price), a migration could still stop. Each migration runs in one transaction, so a failure leaves that migration unapplied rather than half done.

## Before starting

- [ ] Take a database backup, or confirm point-in-time recovery is on, and note the time.
- [ ] Give preview builds their own database first (`docs/ENVIRONMENTS.md`), or accept that the preview of this branch will read the upgraded live database.
- [ ] Choose a quiet time. The upgrade takes a few minutes; trade pages may error between the migration and the deploy.
- [ ] Add the production environment variables (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_NOTIFY_EMAIL`, `CRON_SECRET`), Production only. The site runs without them, but samples, enquiries and email stay closed.

## The steps

- **Count the rows first**, so there is something to compare. In the Supabase SQL editor on the live project, run the counts of `finishes`, `prices`, `price_overrides`, `profiles`, `sample_requests`, `stockists`, `documents` and `shortlists`, and keep the result.
- **Apply the migrations.** From a machine with the Supabase CLI: `supabase link --project-ref oxmwtjyfjbhajzctisbi`, then `supabase db push`. It lists the six pending migrations and asks before applying. Do not use `db reset` on the live project: it deletes data.
- **Check the data.** Run the same counts again; they must match. Then check: `select count(*) from product_variants where is_default` equals the number of finishes, and `select role, count(*) from profiles group by role` shows the owner as `super_admin`.
- **Deploy the code.** Merge `claude/bold-gauss-flm5ge` into `claude/dazzling-gauss-c8nd72` and push. Vercel builds and deploys.
- **Check the live site.** Open the home page, the range and a finish page (the RRP should show). Log in as the owner and open `/admin`. Log in as a trade account and open `/trade/account/catalogue`.

The database goes first on purpose: the new code falls back gracefully on the old public pages, but the old code also keeps working on the new database, so there is no moment when the public site is broken.

## If something goes wrong

- **A migration fails:** nothing from that migration is applied. Stop, keep the error message, and do not deploy the code. The live site keeps running on the old code.
- **The site misbehaves after the deploy:** roll the deployment back in Vercel (Deployments, the previous production deployment, Promote). The old code works on the upgraded database.
- **The data looks wrong:** restore from the backup taken at the start. This is the only step that loses anything entered since the backup, which is why the quiet time matters.

The migrations only add tables, columns, functions and policies, and copy existing prices into the new price lists. They do not drop or rewrite existing rows. There is no "down" migration; the rollback for the database is the backup.

## After the upgrade

- Verify each live stockist listing in `/admin/stockists` (they carry no verification date yet).
- Give administrators their permissions in `/admin/accounts`.
- Remove any test rows that preview builds wrote into the live data, with the owner's approval.
- Load the herringbone finishes, once approved.
