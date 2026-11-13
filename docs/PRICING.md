# Duratek pricing rules

One resolver decides every price: the database function `_resolve_price`, called through `price_for(variant, quantity)`, `catalogue_prices()` and, for administrators, `price_for_account(account, variant, quantity, at)`. It works out who is asking from their own session (`auth.uid()`); nothing the browser sends can change whose price it is, or which price it is.

## What is stored

| Field | Meaning |
| --- | --- |
| `amount_pence` | The price, in whole pence, GBP |
| `price_unit` | What it is per: m², pack, item or linear metre |
| list `prices_include_vat` | Whether the amount includes VAT. The RRP list does; trade, stockist and account lists don't. A promotion for the public does; one for trade doesn't |
| variant `vat_rate_bp` | The product's VAT rate (2000 = 20%). New products take the `default_vat_rate_bp` setting |
| variant `unit_of_sale` | What a customer buys: flooring by the pack, accessories by the item or the metre |
| `min_quantity` | Volume break: the price applies from this quantity, in `price_unit` |
| `valid_from`, `valid_to` | When the price is in force (end not included). On the list as well as the item |

## Choosing the price

**The base price** comes from the first list in this order that has a price in force for the product:

1. The account's own list (negotiated prices): approved accounts only
2. A stockist list: approved accounts with the stockist role
3. The account's tier list: approved accounts only
4. The standard trade list: approved accounts only
5. The RRP list: everyone

Pending, rejected and suspended accounts, and visitors, only ever reach step 5. A stockist never gets the stockist list's prices unless the account has the stockist role.

**Within a list**, the price whose volume break is the largest one at or below the quantity wins; if two are equal, the one that started most recently. Quantities are given in the product's unit of sale and converted for comparison: a per-m² volume break of 100 m² on packs of 2.21 m² starts at 46 packs (101.66 m²), not 45 (99.45 m²).

**Promotions.** A promotion in force for the caller's audience (public, or trade/stockist for approved accounts of that kind) replaces the base price **only if it is lower**. Prices are compared before VAT and only in the same unit. The RRP is still reported alongside, so the site can show "Offer £29.99, RRP £33.33".

**Future prices.** A price with a start date in the future is ignored until then; the current price carries on. Only an administrator with the pricing permission can ask what a price will be on a later date.

## VAT

The resolver returns both figures, from the product's VAT rate, rounded half up once:

- price excludes VAT: gross = net + round(net × rate)
- price includes VAT: net = round(gross ÷ (1 + rate))

Pages say which they show: RRPs are "inc VAT", trade prices "ex VAT". Quotes add VAT at the trader's quote rate (20%, or 0 for a trader who isn't VAT registered), on the total of the lines.

## Quotes and calculators

- **Flooring lines.** Packs = area × (1 + wastage) ÷ pack coverage, always rounded up (no extra pack for rounding noise on an exact fit). The **cost** is the resolver's price for that number of packs, so volume breaks and trade promotions apply, decided on the server; the browser's fields are never used for it. The **sell** price is what the trader types per m², or their default markup on the per-pack cost.
- **Whole packs.** The price per pack is rounded to the penny once and multiplied by the number of packs, so the calculator and the quote always agree.
- **Accessories and labour.** Cost and price per item are the trader's own entries (their purchases from elsewhere and their own rates), private to them.
- **Totals.** Each line amount is rounded once; subtotal + VAT = total; profit = subtotal − cost; margin = profit ÷ subtotal. The customer's copy is computed from sell prices only.

Code: `src/lib/pricing/` (margin, markup, VAT, packs, quote totals; unit-tested), `src/lib/trade/flooring-line.ts`, `src/lib/trade/prices.ts`.

## Managing prices (`/admin/prices`, pricing permission)

- **Base grid:** each finish's price from 1 m², today, in the RRP, standard trade and every tier list.
- **Price lists:** add stockist lists, extra trade lists and promotions (audience and dates); in each list add prices per m², per pack, per item or per metre, volume breaks, and start and end dates.
- **Account prices:** from a trade account (`/admin/accounts/[id]`), stored in that account's own list.
- Every change is in the audit log, with who made it and the before and after values.

## Assumptions to confirm with Duratek

- RRPs include VAT; trade prices exclude it.
- All products use the 20% standard rate unless set otherwise per product.
- A promotion replaces a price only when it is lower.
