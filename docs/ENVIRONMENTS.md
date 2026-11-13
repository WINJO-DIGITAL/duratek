# Environments: preview and development must not use live data

## The problem

Vercel's `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SITE_URL` are set for Production, Preview and Development at once. Every preview build therefore reads and writes the live database: sample requests, enquiries, trade applications, quotes and privacy requests, and any test data entered there, all land in the live data.

## What the code already does (safety net, shipped)

- **Email is not sent from a preview or development build.** `sendEmail` checks `VERCEL_ENV` and refuses unless `ALLOW_EMAIL_FROM_PREVIEW=true` is set on purpose. The email log records these as "Not sent (preview build)".
- **The retention job does nothing in a preview build.** `/api/cron/retention` returns 409 when `VERCEL_ENV` is `preview` or `development`, so a preview can never anonymise or delete real people's data.
- Local runs and the test suites have no `VERCEL_ENV`, so they are unaffected.

These stop real harm (emails to customers, deletion of real records). They do not stop previews from reading or writing live data. That needs the separate database below.

## The fix (owner, about an hour)

1. **Create a second Supabase project** for previews and development, in the same region (eu-west-1) and organisation. Name it so it is obviously not live, for example `duratek-preview`.
2. **Apply the schema to it.** Link the CLI to the new project and push the migrations:
   - `supabase link --project-ref <preview-ref>`
   - `supabase db push`
   This applies every migration in `supabase/migrations/` to the empty project. Do not run `supabase db reset --linked` on the live project; it wipes data.
3. **Load the demo data**, so previews look like the demo: run `supabase/seed.sql` against the preview project only (for example with `psql` and the project's connection string). It contains the demo finishes and placeholder prices.
4. **Create a set of API keys for the preview project** (the publishable key and the service-role key).
5. **Change the Vercel environment variables** (Project, Settings, Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: keep the live values for **Production only**. Add the preview values for **Preview** and **Development**.
   - `SUPABASE_SERVICE_ROLE_KEY`: live value for **Production only**; preview value for **Preview** and **Development**.
   - `NEXT_PUBLIC_SITE_URL`: the production address for Production; the preview address for Preview and Development (or leave it unset for previews).
   - `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_NOTIFY_EMAIL`, `CRON_SECRET`: Production only. Do not set `ALLOW_EMAIL_FROM_PREVIEW`.
   - These are build-time values for `NEXT_PUBLIC_*`: redeploy the preview after changing them.
6. **Clean up the live database.** Any test records made from previews are in the live data. Find them (for example sample requests, enquiries, trade applications, quotes created by test accounts, or made with the `@e2e.local`, `example.com` or `Test` names) and remove them with your approval. Nothing has been deleted so far.

## Check the split works

Do these on a preview deployment after step 5 and a redeploy:

- Open the preview site. Its demo finishes and tiers come from the preview project, and the live site is unchanged.
- Submit a sample request on the preview. It appears in the preview project and not in the live one.
- Open the email log on the preview. The message shows "Not sent (preview build)".
- Call `/api/cron/retention` on the preview with the cron secret. It answers 409 (skipped).
- Open the live site. Its data and email are unchanged.

## Rolling back

Point the Preview and Development variables back at the live values and redeploy. The safety net in the code stays on.

## Decisions this depends on

- Whether previews need real email for testing (`ALLOW_EMAIL_FROM_PREVIEW`). The recommendation is no: use a test address on the preview project and read the log.
- Whether the preview project needs real trade accounts. Recommended: create test accounts on the preview project only.
