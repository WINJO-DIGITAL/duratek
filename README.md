# Duratek

Brand website for Duratek waterproof SPC click flooring. See `CLAUDE.md` for the brief, scope and build order.

Next.js 16 (App Router, Cache Components) · Supabase (Postgres, Auth, RLS, Storage) · Tailwind CSS v4.

## Local setup

Requires Node 22 and Docker (for the local Supabase stack).

```bash
npm install
npx supabase start          # local Postgres, Auth, REST, Storage
npx supabase db reset       # applies migrations + supabase/seed.sql
cp .env.example .env.local  # fill from: npx supabase status -o env
npm run dev
```

## Checks

```bash
npm run typecheck
npm run lint
npm test          # unit tests (Vitest)
npm run db:test   # RLS tests (pgTAP via supabase test db)
npm run build
```

## Data

- Schema and RLS: `supabase/migrations/`
- RLS tests: `supabase/tests/rls.test.sql`
- Demo seed: `supabase/seed.sql` is **generated** by `npm run seed:build` from the Kwik Floors Duratek
  collection, using the curation in `scripts/demo-seed/curation.json`. Everything it writes is marked
  `is_demo`; trade prices are obvious placeholders (£22.22 / £11.11 per m²), not real prices.
- After schema changes: `npm run db:types` regenerates `src/lib/supabase/database.types.ts`.

## Security notes

- Prices are only readable by approved trade users for their own tier or account override (RLS), and are
  never fetched by public pages.
- Sample requests have no public insert policy: the (upcoming) server route validates, rate-limits and
  inserts with the service role key, which must never be exposed to the client.

## Trade login, prices and the owner

- Public pages show the RRP (`finishes.rrp_per_m2_pence`). Trade prices come from `prices` (per tier) and
  `price_overrides` (per account) and are read only for an approved, logged-in account.
- The owner sets prices at `/admin/prices` and approves accounts at `/admin/accounts` (both need `is_admin`).
- The first owner account has to be promoted in the database once. Sign up through `/trade/apply` (or the
  Supabase dashboard), then run:

  ```sql
  update public.profiles set is_admin = true, status = 'approved'
  where id = (select id from auth.users where email = 'owner@your-domain');
  ```
- Approval emails need `RESEND_API_KEY` and `EMAIL_FROM` (see `.env.example`).
