# Trade portal and commercial tools

Migration: `20261110090000_quote_line_kinds`, `20261110100000_trade_portal`. Both are additive; no data is dropped or rewritten.

## What was built

- **Dashboard** (`/trade/account`): welcome, approval status, recent quotes, projects, saved finishes, shortcuts. The price list moved to `/trade/account/catalogue`.
- **Trade mode and Customer mode**: one tap between them (cookie `duratek_customer_view`). In Customer mode the server does not fetch or render trade data: quote, project, customer, shortlist and document pages render a "hidden in customer mode" notice, and the catalogue, present, compare and calculator pages load no buying price, cost, margin or account detail.
- **Present** (`/trade/present`, `/trade/present/[slug]`): photography, specification, benefits (approved product facts only), suitability with the warranty disclaimer and the RRP. In Trade mode a profit panel adds an editable selling price.
- **Profit panel**: gross profit = selling price ex VAT - buying cost ex VAT; gross margin = gross profit / selling price; markup = gross profit / buying cost. Labelled gross, never net.
- **Customers and projects**: customers, projects with rooms (metres, cm or mm), wastage and finish per room, packs always rounded up from the stored pack coverage. "Create a quote from this project" adds a flooring line and a labour line per room.
- **Job costing** (quote page): materials, labour, delivery and other costs, contingency, total job cost, selling price, VAT, estimated gross profit, margin and markup.
- **Quote PDFs**: trader branding (name, logo, colour, contact), room-grouped lines, totals, notes. Built from a `CustomerQuote` type that has no cost fields. Trader download at `/trade/account/quotes/[id]/pdf`; customer download at `/q/[token]/pdf` (sent quotes, rate limited).
- **Snapshots**: quote lines store `unit_cost_pence` and `unit_sell_pence` when added, so later price changes do not alter old quotes or their PDFs.
- **Ownership**: customers, projects, rooms, quotes and lines are owned per trader by RLS and re-checked in server actions. Another trader gets not-found.

## Verification actually run (local stack)

| Suite | Result |
| --- | --- |
| Unit (vitest) | 132 of 132 |
| pgTAP (clean database) | 186 of 186 |
| Lint, typecheck, production build | clean |
| E2E trade / admin / auth / security | 39, 34, 52, 65 passed |
| E2E portal (acceptance journey) | 38 of 38 |
| Layout sweep, 390 / 768 / 1440 px, 35 pages | no horizontal overflow, every page has an h1 |

The portal suite walks the whole journey: login, finish, buying price, margin (£9.78, 30.56%, 44.01% at £32.00), rooms, wastage, packs, labour and accessories, quote, Customer mode, PDF download, reopening the project. It scans page source and RSC payloads of ten screens in Customer mode for buying prices, costs, margin, customer and account details, with a control that proves the scan finds them in Trade mode. It also checks the PDF text and that a price change leaves the quote unchanged.

pgTAP expects a freshly reset database; run `supabase db reset` after the e2e suites.

## Not verified

- Production: the production database is behind these migrations. Apply them (with approval) before merging; until then the new pages are unavailable but public pages keep working through the deploy fallbacks.
- Labour has a sell rate only; its cost is entered per line on the quote if the trader wants it counted.
