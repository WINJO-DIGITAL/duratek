# Duratek database

Supabase Postgres. Every change is a version-controlled migration in `supabase/migrations/`, applied in filename order. All of them are additive: no migration drops a table, a column or a row. Money is integer pence; rates are basis points (2000 = 20%).

| Migration | What it adds |
| --- | --- |
| `20261104120000_init_schema` | Catalogue, trade accounts, tier prices, documents, samples, stockists, shortlists, inspiration, RLS |
| `20261105100000_finish_rrp` | Public RRP column on finishes (now a derived copy) |
| `20261108100000_trade_platform` | Trader preferences, quotes and lines, customer quote links, owner figures |
| `20261109090000_account_suspended` | `suspended` account status (own file: Postgres can't use a new enum value in the same transaction) |
| `20261109100000_foundation` | Roles and permissions, businesses, applications, collections, variants, price lists, saved products, projects, audit log, settings |

## Entities

### Accounts

| Table | Purpose | Key relationships and rules |
| --- | --- | --- |
| `auth.users` | Supabase Auth: email, password hash, email confirmation, sessions | Managed by Supabase |
| `profiles` | One per user: name, phone, **role**, **status**, tier, business | `id` → `auth.users` (cascade). `role`: super_admin, admin, trade, stockist. `status`: pending, approved, rejected, suspended. `is_admin` is a legacy flag kept in step with role |
| `businesses` | The company behind an account | Company number and UK VAT number are format-checked; postcode normalised; website https only |
| `trade_applications` | What an applicant submitted, and its review | One per profile (unique). `reviewed_at`/`reviewed_by`/`decision_note` filled automatically when the account status changes. The account's state lives only on `profiles.status` |
| `admin_permissions` | What an administrator may do | `(profile_id, permission)` primary key. Only for role `admin`; a super admin has every permission |

Users, roles and trade applications are therefore `auth.users` + `profiles` (+ `admin_permissions`) and `trade_applications` + `businesses`.

### Products

| Table | Purpose | Rules |
| --- | --- | --- |
| `collections` | Groups of finishes (Standard plank, Extra-long plank) | Unique name and slug |
| `finishes` | **The product.** Name, slug, style, colour family, description, display specification, `product_type` (flooring, accessory), collection | Unique slug. One row per product, so there are no duplicate product records |
| `product_variants` | The sellable version: **SKU**, unit of sale (m², pack, item, linear metre), pack coverage, units per pack, length, width, thickness, **VAT rate** | Unique SKU (format-checked); unique `(finish, name)`; one default per finish; a pack must state its coverage or count |
| `finishes.specs` (jsonb) | Descriptive specification (core, surface, underlay, click system) plus a **copy** of the default variant's measurements for display | Measurements are written to the variant; a trigger copies them here, so there is one source |
| `finish_images` | Photographs: kind (room, close-up, swatch), alt text, size, order | Alt text required |
| `documents` | Product documents (technical sheet, warranty, certificate, fitting guide, brochure), optionally per finish, trade-only or public | File in the private `documents` bucket; unique storage path |

### Prices

| Table | Purpose |
| --- | --- |
| `price_lists` | Every price belongs to a list. Kinds: **rrp** (one, public, VAT inclusive), **trade** (the standard list, and one per tier), **stockist**, **account** (one per account, negotiated), **promotion** (with an audience: public, trade, stockist). Each list has a currency (GBP only), whether its prices include VAT, on/off, and an optional start and end |
| `price_list_items` | One price: list, variant, **amount**, the **unit** it is per (m², pack, item, metre), **volume break** (`min_quantity`, in that unit), optional **start and end** (future price changes) |
| `price_tiers` | Groups of trade accounts. Each tier gets its own trade list automatically |
| `prices`, `price_overrides`, `finishes.rrp_per_m2_pence` | **Legacy, derived.** Kept in step with the lists by triggers for code that still reads them. Nobody may write them directly |

Uniqueness stops contradictory prices: one item per (list, variant, volume break, start date); one RRP list; one standard trade list; one list per tier and per account. See `docs/PRICING.md` for how a price is chosen.

### Trade work

| Table | Purpose |
| --- | --- |
| `saved_products` | A signed-in account's saved finishes |
| `projects`, `project_items` | A trader's jobs: customer, site, rooms and areas, chosen finishes |
| `quotes`, `quote_lines` | A trader's quotations (from `20261108100000`), now optionally linked to a project |
| `trade_preferences` | A trader's default markup, wastage, VAT registration, quote footer |
| `shortlists` | Finishes shared with a customer by link |

### Operations

| Table | Purpose |
| --- | --- |
| `sample_requests` | Free sample requests (personal data) with status and when sent |
| `stockists`, `online_retailers` | Where to buy. A stockist listing can be linked to a stockist account |
| `system_settings` | Key/value settings (currency, default VAT rate, sample limit, quote validity), public or internal |
| `audit_log` | Append-only record of sensitive changes (see `docs/SECURITY.md`) |

## Indexes

Every foreign key used for lookups is indexed. The main ones: `profiles(business_id)`, `profiles(status, created_at)`, `finishes(collection_id)`, `product_variants(finish_id, sort_order)`, `price_list_items(variant_id)`, unique `price_list_items(list, variant, min_quantity, valid_from)`, `projects(profile_id, created_at)`, `project_items(project_id)`, `quotes(project_id)`, and on `audit_log` (`occurred_at`), (`table_name, record_id, occurred_at`) and (`actor_id, occurred_at`).

## Upgrading an existing database

`backfill_foundation()` brings existing data into the new structure. The migration runs it, and so does the demo seed. It is idempotent and only adds what's missing. While it copies, the legacy-price sync is paused; it then rebuilds the legacy copies once, and **refuses to finish if any legacy price row would be lost**. The upgrade was rehearsed on a copy of the production schema with existing accounts and negotiated prices: tier prices, account prices, RRPs and account states were identical by checksum before and after.

## Local development

```bash
npx supabase start          # Postgres, Auth, Storage, mail catcher at http://127.0.0.1:54324
npx supabase db reset       # migrations, then supabase/seed.sql
npm run db:test             # pgTAP: supabase/tests/*.test.sql
npm run db:types            # regenerate src/lib/supabase/database.types.ts
```
