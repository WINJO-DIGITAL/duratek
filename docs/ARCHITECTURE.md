# Duratek: technical architecture

This file records what was found in the existing project (Phase 1) and how the backend is built on it. It covers the trade platform added in November 2026.

## What exists (audit, November 2026)

| Area | Finding |
| --- | --- |
| Frontend | Next.js 16 App Router, React 19, TypeScript strict, Cache Components (`"use cache"`, `cacheTag`, `updateTag`), Tailwind v4 tokens in `src/app/globals.css`, Motion. |
| Hosting | Vercel project `duratek` (team `wnjo`). Production deploys from the `claude/dazzling-gauss-c8nd72` branch of this repository. |
| Database | Supabase Postgres (project ref `yylabmndksmbfeuqgtmt`, eu-west-1), set by `NEXT_PUBLIC_SUPABASE_URL` in Vercel. Schema in `supabase/migrations/`, RLS on every table, pgTAP tests in `supabase/tests/`. |
| Auth | Supabase Auth (email and password). `src/proxy.ts` refreshes sessions only for visitors with an auth cookie. `getAccount()` verifies the user with the auth server once per request. |
| Clients | `publicSupabase()` (anon, cookie-less, safe inside `"use cache"`), `userSupabase()` (as the signed-in user, RLS applies), `adminSupabase()` (service role, server only, after validation). |
| Product data | Eleven published demo finishes (from the Kwik Floors Duratek collection, `is_demo`): eight standard planks (5mm, 181 × 1219mm, 2.21 m² per pack) and three extra-long planks (7mm, 228 × 1492mm, 2.05 m² per pack). All 0.55mm wear layer, rigid SPC core, Scratch Shield, integrated underlay, Unilin click. No herringbone finish yet. |
| Pricing | Public RRP on `finishes.rrp_per_m2_pence` (none set in production yet). Trade prices in `prices` (per tier) and `price_overrides` (per account), RLS-gated. Customer view is a session cookie that strips trade prices on the server. |
| Trade | Apply, login, account price list, Customer view, owner approval with tier and email. |
| Admin | `/admin/prices`, `/admin/accounts`. |
| Samples | Tray of up to three (localStorage), server action validates, rate-limits, saves with the service role and emails via Resend. |
| Where to buy | Postcode search with postcodes.io and great-circle distance over published stockists; online retailers block. |
| Production env | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` only. **No `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM` or `OWNER_NOTIFY_EMAIL`**, so sample requests and trade applications are closed online in production until they are set. |

## Principles

- Build on the existing stack; no new services or dependencies.
- Additive, non-destructive migrations only. No existing column or row is dropped or rewritten.
- Trade prices and a trader's costs and margins are decided on the server and protected twice: by the page (never rendered for the wrong person) and by Row Level Security (never readable by the wrong person).
- Pure business logic (pricing, margins, packs, VAT, quote totals, CSV) lives in `src/lib/**` with unit tests; pages and actions stay thin.
- Public pages never depend on the new trade tables, so a deploy that runs ahead of a migration cannot break the public site.

## Data model added (`20261108100000_trade_platform.sql`)

| Table / function | Purpose | Who can read | Who can write |
| --- | --- | --- | --- |
| `trade_preferences` | A trader's default markup, wastage, VAT registration and quote footer | That approved trader | That approved trader |
| `quotes` | A trader's quotation to their customer: customer, site, status (draft, sent, accepted, declined), VAT rate, validity, share token | That approved trader | That approved trader |
| `quote_lines` | Flooring, accessory, labour or other lines with quantity, unit, **unit cost (private)** and unit sell price | That approved trader | That approved trader |
| `sample_requests.sent_at` | When the owner marked a request sent | Admin | Admin |
| `get_shared_quote(token)` | The customer's copy of a quote by link: sell prices and totals only, never cost or margin | Anyone with a 20+ character token, quote not draft, trader still approved | — |
| `respond_to_quote(token, decision)` | The customer accepts or declines a sent quote | Anyone with the token | Only `sent` to `accepted`/`declined` |
| `admin_dashboard_stats()` | Counts and demand signals for the owner (no trader margins or customer details) | Admin only | — |

The owner does **not** get row access to traders' quotes: a trader's costs, selling prices and customers are their business. The owner sees aggregate demand (quote counts by status, m² quoted per finish) through `admin_dashboard_stats()`.

## Pricing engine (`src/lib/pricing/`)

- Effective trade price: account price, else tier price (existing `effectivePrices`).
- `margin.ts`: markup and margin in basis points, sell from cost and markup, cost from sell and margin, profit, VAT. Integer pence throughout, rounding half up once per line.
- `flooring.ts`: room areas, wastage, packs needed (always rounded up), m² supplied, cost of packs.
- `quote.ts`: line totals, subtotal, VAT, total, cost, profit and margin for a quote; the customer copy is computed from sell prices only.

## Routes

Public: unchanged, plus `/s/[token]` (shared shortlist, no prices) and `/q/[token]` (customer quote, the trader's selling prices only, printable).

Trade (approved only, server-gated): `/trade/account` (dashboard), `/trade/account/prices`, `/trade/account/documents`, `/trade/account/shortlists`, `/trade/account/calculator`, `/trade/account/quotes`, `/trade/account/quotes/[id]`, `/trade/account/settings`. Customer view hides every trade price, cost and margin in these pages too.

Owner admin (`is_admin`, else 404): `/admin` (dashboard and analytics), `/admin/accounts`, `/admin/prices`, `/admin/finishes`, `/admin/samples` (+ CSV export), `/admin/stockists` (stockists and online retailers), `/admin/documents`.

## Security controls

- Server gating: `requireAdmin()`, `requireApprovedTrade()`; trade data read with `userSupabase()` so RLS applies.
- RLS: every new table enabled, `anon` has no privileges on private tables, policies require `is_approved_trade()` and ownership.
- Shared links: random 24-byte tokens, minimum length enforced in SQL, `robots: noindex`.
- Documents: private bucket, signed URLs valid 60 seconds, created as the requesting user (storage policy decides).
- Rate limits: in-memory per address for public endpoints plus database counts across instances (existing pattern), and per-trader daily limits on quote emails.
- Validation: zod on every form on the server; honeypots on public forms.
- Secrets: service role key and Resend key are server-only env vars; never committed.

## Deployment

See the last section of `docs/TRADE_PLATFORM_REPORT.md`.
