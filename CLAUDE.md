# Duratek

A premium, image-led brand website for **Duratek** (waterproof SPC click flooring). It serves two audiences:

- **Homeowners**: browse the range, get inspired, order free samples, and find where to buy. They see the RRP (recommended retail price) only.
- **Trade** (fitters, retailers, contractors, specifiers): apply for an account, get approved, log in to see their own prices and download documents, and show the range to their customers.

Duratek is the client's own brand. Kwik Floors and Dave's Tiles are the client's separate Shopify consumer stores. They are NOT part of this codebase, but Kwik Floors appears on the site as an online retailer, and its Duratek collection is the source of demo product data (see Demo content).

## Scope (v1)

- **Public**: a visual showcase of the range, finish explorer, inspiration, free sample ordering, where to buy, and a brochure download. The only public price is the RRP per m², set by the business (client decision, November 2026); no price is shown for a finish with no RRP. Trade prices are never public.
- **Trade**: apply, get approved, log in, see prices, download documents, build shareable shortlists, use Customer view, and (client instruction, November 2026) work out packs and profit and build quotations for their own customers.
- **Owner admin**: approve trade applications, assign price tiers, enter and edit prices (tier and per account), manage finishes and their photographs, manage stockists and online retailers, view and process sample requests (CSV export), upload documents, and an overview of demand.
- **Out of v1**: no basket, checkout or online payment, and no ordering from Duratek. Trade quotations are the trader's own quotes to their customers (Duratek does not sell through them). Structure the code so a cart can be added later, but build none of it now.

## Business flow (modelled on luvanto.com, executed better)

Luvanto (https://www.luvanto.com) is the structural reference for the layout and customer journey. Its UI/UX is weak: too many competing calls to action, inconsistent destinations, clutter, repetition, and mobile overlays covering content. Take its structure, not its execution.

Homeowner journey: **discover** (home, range, inspiration) → **shortlist** (finish explorer) → **sample** (up to 3 free) → **buy** (where to buy: local stockists or online retailers).

Trade journey: **apply** → **approved by owner** (email) → **log in** → **prices, documents, shortlists, Customer view**.

### Fix what Luvanto gets wrong

- One primary action per screen. The hero has a single primary CTA ("Explore the range") and at most one quiet secondary link.
- Every "Order samples" entry point opens the same sample tray. Every label goes to one consistent destination.
- No popup basket. The sample tray is a slide-up sheet (mobile) or side drawer (desktop) that shows "2 of 3 samples chosen".
- No placeholder or unfinished content in production. No accessories mixed into flooring lists.
- No floating chat bubble and no overlays covering content on mobile. The cookie banner is compact, sits on one line where possible, and never hides the primary CTA.
- Say each trust signal once. Don't repeat CTAs section after section.
- The footer is grouped and short, not a long stack of links.

## Information architecture

Top nav (desktop): **Range · Inspiration · Where to buy · Samples · Trade** (Trade is a login/account entry, visually distinct and quieter).

Mobile: a compact header (wordmark, search, menu), plus a **sticky bottom bar**: Range · Samples (with count badge) · Where to buy · Trade. Fitters use this on site visits, so key actions must always be one thumb-tap away. Touch targets are at least 44px.

Audience: no homeowner/trade switch block (retired in the approved redesign, November 2026). Trade is reached from the header, the bottom bar and one quiet trade band on the home page.

### Pages

- `/`: home (see Home page)
- `/range`: all finishes, filterable by style (plank | herringbone) and colour family, image-led grid
- `/range/[slug]`: finish detail: full-bleed room scene, close-up, specs, "Add to samples", "Where to buy", documents (trade-only ones gated), price block for approved trade only
- `/explore`: finish explorer (the signature interaction)
- `/inspiration`: room scenes and colour stories grouped by mood. No blog in v1.
- `/where-to-buy`: postcode search over stockists, plus an online retailers block
- `/samples`: the sample tray as a page (same state as the drawer) and the request form
- `/warranty`: warranty details with disclaimer
- `/technology`: the spec story in depth (Scratch Shield, 0.55mm, layers, Unilin)
- `/trade`: trade landing page (benefits, apply, login)
- `/trade/apply`, `/trade/login`
- `/trade/account`: prices; `/trade/account/quotes` (and `/[id]`), `/calculator`, `/shortlists`, `/documents`, `/settings` (approved only)
- `/q/[token]`: a trader's quote, as their customer sees it (the trader's sell prices only; never cost or margin; printable)
- `/documents/[id]`: document download through a 60 second signed link
- `/s/[token]`: public shared shortlist (never shows prices)
- `/admin`: owner overview; `/admin/accounts` (and `/[id]` account prices), `/admin/prices`, `/admin/finishes`, `/admin/samples`, `/admin/stockists`, `/admin/documents`
- `/contact`, `/privacy`, `/cookies`, `/terms`

## Home page

Approved redesign (November 2026, "The floor is the hero"). Seven sections, then the footer:

1. **Floor-led hero**: full-bleed photographs, camera low, floor filling the frame. A few curated finishes (one per colour) each hold still for about 7 seconds, then dissolve slowly into the next (client request, November 2026); pausable, pauses on hover/focus and off screen, still under reduced motion. Heading "Beautifully considered. Built to perform." set light; one primary action (Explore the range), one quiet sample link; the finish shown is named and linked in the swatch circle, whose ring traces the time to the next photograph.
2. **The floor library**: all finishes as boards side by side, ordered light to dark (measured from each swatch); tap or hover widens a board with its name, format and Add sample. Doorway to the explorer.
3. **Two formats, to scale**: the standard and extra-long planks drawn to scale with dimension lines (replaces the style tiles until herringbone exists).
4. **One room**: a single editorial photograph, captioned with the finish, with Add sample.
5. **Five layers**: the only navy section: layer diagram and the four facts (0.55mm wear layer, Scratch Shield, waterproof rigid SPC core, Unilin click), warranty line with its disclaimer, link to Technology.
6. **Three free samples**: the tray made visible (three slots that fill as finishes are added), plus a quiet trade band ("Fitting or specifying? Open a trade account").
7. **Where to buy**: postcode search and online retailers.

## Samples

- Up to **3** free samples per request (keep the limit in config). Selection persists across pages (cookie or localStorage, wrapped in try/catch) until submitted.
- "Add to samples" on every finish card and detail page. Adding gives a calm confirmation and an updated count in the tray. When full, the button explains the limit rather than failing silently.
- The request form asks for name, email, phone (optional), address (UK postcode validated), and a marketing opt-in (unchecked by default).
- On submit: save to `sample_requests`, send a confirmation email to the customer and a notification to the owner (Resend). Validate on the server and rate-limit.
- Admin: list of requests with status (new | sent), mark as sent, CSV export.

## Where to buy

- Owner-managed `stockists` (name, type: showroom | retailer | fitter, address, postcode, lat/lng, phone, website, published).
- A postcode search returns the nearest stockists by distance. Geocode postcodes with postcodes.io (free, UK). Show a list first, with an optional map. The page must work without a map.
- An **online retailers** block (owner-managed). Seed it with Kwik Floors.
- The empty state ("No stockists near you yet") offers samples and a contact form instead.

## Product facts (do not invent beyond these; confirm anything else with the client)

- Rigid SPC core, waterproof
- 0.55mm protective wear layer
- Scratch Shield surface finish. Always say "scratch-resistant", NEVER "scratch-proof"
- Unilin click-lock system, floating installation
- Integrated underlay (comfort and sound reduction)
- Two styles: straight plank and herringbone
- Warranty: residential lifetime (defined as 25 years); 10 year commercial, light and medium traffic only, not heavy traffic. Always show the warranty disclaimer wherever warranty is mentioned.

Warranty disclaimer text: "WARRANTY DISCLAIMER: Residential Lifetime = 25 years. Commercial Warranty Applicable to Light & Medium Traffic Areas. Not Applicable to Heavy Traffic Areas. Complete warranty info can be found on the info pages."

## Demo content

For the client preview, pull the real Duratek finishes (names, styles, photos, sizes and specs as shown) from the Kwik Floors Duratek collection, reached via "Shop full Duratek range" on https://www.kwikfloors.co.uk/pages/Duratekflooring. Shopify exposes `/collections/<handle>/products.json`, which can help. Store the data in the seed script, not hard-coded in components. Mark it as demo in the seed and admin. Do NOT import Kwik Floors prices as Duratek prices. Seed trade prices are clearly fake placeholders.

If the site can't be reached, ask for exports or screenshots rather than inventing finish names or specs.

## Stack

- Next.js (App Router, TypeScript strict) on Vercel
- Supabase: Postgres, Auth, Row Level Security, Storage (images, documents)
- Resend: transactional email (application received/approved/declined, sample request confirmation, owner notifications)
- Tailwind CSS with design tokens; Motion (framer-motion) for animation
- Images via next/image, served in modern formats, with blur placeholders
- postcodes.io for UK postcode lookup

## Security rules (non-negotiable)

1. Trade prices (tier and account prices) are never sent to logged-out or unapproved users; the RRP is public. Gate on the SERVER (server components / route handlers), not with CSS or client-side hiding. Customer view also strips prices on the server.
2. Price data lives in tables protected by Row Level Security. Only approved users can read it, and only their own tier or account price.
3. Only administrators with the matching permission can write prices, tiers, approvals, finishes, stockists and documents (roles: super_admin, admin with granted permissions, trade, stockist; see `docs/SECURITY.md`). Check with `requireAdmin(permission)` on the server and `has_permission()` in RLS.
3a. Every price comes from the resolver (`price_for`, `catalogue_prices`; rules in `docs/PRICING.md`). Never take a price from the browser, and write prices only to `price_lists`/`price_list_items` (`prices`, `price_overrides` and `finishes.rrp_per_m2_pence` are derived copies).
4. Never expose the Supabase service-role key to the client. Never commit secrets; use env vars.
5. Gated documents are served via short-lived signed URLs, not public links.
6. Validate all form input on the server. Rate-limit application, login, sample request and contact endpoints. Add a honeypot to public forms.
7. Personal data (sample requests, applications) is readable only by admin. UK GDPR: privacy policy, consent for marketing, no unnecessary data.

## Data model

- `profiles`: id (auth user), company_name, contact_name, phone, trade_type (fitter | retailer | contractor | specifier), status (pending | approved | rejected | suspended), role (super_admin | admin | trade | stockist), business_id, tier_id, is_admin (legacy, follows role), list_as_stockist (bool)
- `businesses`, `trade_applications`, `admin_permissions`: the company, what was applied for and its review, and an administrator's permissions
- `price_tiers`: id, name
- `finishes`: id, name, slug, style (plank | herringbone), colour_family, description, specs (jsonb: sizes, thickness, pack coverage etc.), rrp_per_m2_pence (public RRP, nullable), sort_order, published, is_demo
- `collections`; `product_variants`: finish_id, sku, unit_of_sale (m2 | pack | item | linear_metre), pack_coverage_m2, dimensions, vat_rate_bp, is_default (measurements are the source; `finishes.specs` keeps a display copy)
- `price_lists` (rrp | trade | stockist | account | promotion; VAT inclusive or not; dates) and `price_list_items` (amount, unit, volume break, dates): the single source of prices
- `finish_images`: finish_id, url, kind (swatch | room | closeup), alt, sort_order
- `prices`: finish_id, tier_id, price_per_m2_pence (integer), updated_at
- `price_overrides`: finish_id, profile_id, price_per_m2_pence
- `documents`: id, title, type (tech sheet | warranty | certificate | fitting guide | brochure), finish_id nullable, storage_path, trade_only
- `sample_requests`: id, name, email, phone, address_line1, address_line2, town, postcode, finish_ids, marketing_opt_in, status (new | sent), created_at
- `stockists`: id, name, type (showroom | retailer | fitter), address, postcode, lat, lng, phone, website, published
- `online_retailers`: id, name, url, logo_path, sort_order, published
- `shortlists`: id, profile_id, name, token, finish_ids, created_at
- `inspiration`: id, title, mood, image_path, finish_ids, sort_order, published
- `trade_preferences`: profile_id, default_markup_bp, default_wastage_pct, vat_registered, quote_footer (private to the trader)
- `quotes`: id, profile_id, reference (Q-0001 per trader), customer details, site, status (draft | sent | accepted | declined), vat_rate_bp, notes, valid_until, share_token, sent_at, responded_at
- `quote_lines`: quote_id, kind (flooring | accessory | labour | other), finish_id, description, quantity, unit, unit_cost_pence (private), unit_sell_pence, area_m2, wastage_pct
- A trader's quotes, costs and margins are private to that trader: the owner sees only aggregate demand (`admin_dashboard_stats()`). Customers read a quote only through `get_shared_quote(token)`, which returns sell prices.
- `saved_products`, `projects`, `project_items`; `audit_log` (append-only); `system_settings`
- Trade applications are captured as `profiles` with status = pending, plus their `businesses` and `trade_applications` rows. Full reference: `docs/DATABASE.md`.

Money is stored as integer pence.

## Key features

- **Finish explorer** (the one signature interaction, done really well): full-screen, image-led browsing of every finish. Swipe or arrow between finishes, tap to switch between the room scene and the grain close-up, filter by style and colour family, and "Add to samples" without leaving. Smooth, slow transitions; respects prefers-reduced-motion.
- **Sample tray**: see Samples.
- **Where to buy**: see Where to buy.
- **Pricing, built**: the RRP shows to everyone (finish page, range cards, compare); an approved trade account also sees its own price (account price if set, else its tier price) on the finish page and the account price list, read server-side as that user under RLS. The owner sets RRPs, tier prices and tiers at `/admin/prices`, and approves accounts and assigns tiers at `/admin/accounts` (approval emails the applicant). Seed RRP and trade prices are fake repeated-digit placeholders.
- **Customer view toggle**: a logged-in trader can switch, with one tap, to a mode that hides ALL trade prices (the public RRP stays) so they can show the site to homeowners on a phone or tablet. It persists for the session and is clearly indicated, with an easy exit.
- **Shareable shortlists**: a trader picks finishes and shares a clean link (a PDF can come later) with no prices.
- **Trade application**: short form, email confirmation, owner approval flow.
- **Trade area**: prices, documents, shortlists.

## Brand theme (Duratek navy, green and white)

**Standing rule from the client:** any design idea or reference they share (a screenshot of another site, a pattern they like) is to be built in the Duratek theme below unless they say otherwise. Take the structure or idea, never the other brand's colours, fonts, logo or copy.

**Approved direction (November 2026): "The floor is the hero", softened.** Soft, premium, architectural minimalism (client update, November 2026, superseding the earlier "no beige, square corners" rules): warm ivory, cream and sand neutrals with natural oak, soft rounded cards and controls, generous whitespace, large photography. Navy is the ink (headings, text, at most one navy panel per page, inset with rounded corners); green is the action and selected-state colour, never a background block. Rough proportion on a page: ivory, cream and white 62%, photography 30%, navy 6%, green 2%. Avoid excessive animation, gradients, heavy shadows and pill-shaped layouts. Measurements (plank sizes, thickness, pack coverage, wear layer) are set in DM Mono, the data face. Finish names are set in display type like gallery labels. Product pages lead with the plank (grain), then rooms. Imagery is curated until a commissioned shoot: no playrooms, showers or bathrooms where the floor barely features, no computer-generated rooms.

Use the existing Duratek brand identity: the warm neutrals are surfaces, not new brand colours, and the wordmark, navy and green stay as they are. Do not copy Ted Todd's palette or introduce brown or gold as brand colours. Take Ted Todd's editorial approach (premium typography, generous whitespace, large photography, elegant composition), but the identity must feel unmistakably Duratek.

- Primary navy `#18364C`: hero sections, footer and important feature areas; navy typography on light backgrounds.
- Duratek green `#4B9B48`: accent text, subtle highlights, selected navigation details, interactive elements. For WCAG AA, small green text and button fills use the darker `#387636` on light backgrounds (AA on ivory and cream), and `#54AE51` on navy (same hue).
- White `#FFFFFF`: prominent headings on navy; alternating sections.
- Warm neutrals (tokens in `globals.css`): ivory `#FAF7F1` (the page), cream `#F3EDE3` (alternating sections and soft panels, e.g. the free-sample panels), sand `#E7DCCB` (soft fills and borders), warm hairline `#E6DED2`, and oak `#9A6F45` for decorative details and icons only (not small text).
- Shape: cards and framed photography 20px radius (`rounded-card`, the `card` and `frame` utilities); buttons, inputs and chips 10px (`rounded-control`). Soft, warm shadows (`shadow-card`). Technical drawings (the plank scale) stay crisp.
- Secondary text: muted slate grey `#5A6B78` (on navy: `#B9C6D0`).
- Type system (tokens in `globals.css`, one place to tune): Manrope leads. Section headings (H2) 500, 32px phones to 48px desktop, tracking -0.02em, line height 1.12, balanced; page titles (H1) 400; hero 450; card titles and menu items 400 (menu 22px, never louder than a heading); section labels Manrope 600, 12px, tracking 0.16em, green. Body, navigation and buttons: DM Sans (400 body, 500 buttons and nav); supporting text under a heading 15–16px, line height 1.6, max 60ch, muted navy (navy/75) on light and off-white at 80–85% on navy. Data (measurements and specifications): DM Mono 400, tabular figures. Section stack spacing: label to heading 14px, heading to description 18px, stack to content 48–80px (`mt-label`, `mt-lede`, `mt-stack`). No italics; avoid unnecessary bold.
- Small tracked uppercase green eyebrow labels above headings (e.g. "DURATEK SURFACE TECHNOLOGY", "ENGINEERED DURABILITY")
- Buttons: softly rounded (10px). Ivory on navy or photography, green on light, with a trailing arrow ("Shop full Duratek range →"). A secondary action next to a primary one is a quiet underlined link, not a second button.
- Iconography: simple 1.5px line icons, alone (never in circles), in oak on light or green on navy, for facts and benefits cards.
- The wordmark is lowercase "duratek": "dura" in green, "tek" bold (white on navy). Use a placeholder text version only; use the real SVG when supplied.
- Badges: Scratch Shield, Residential Lifetime Warranty and Commercial 10 Year Warranty artwork. Use placeholders until the client supplies the files.

Do NOT copy Luvanto's palette (salmon, slate) or its underlined-serif link style.

## Reference prototype

`prototype/` holds an earlier static HTML/CSS/JS design prototype (hash-routed). Use it for brand look, copy and components. The page structure and journeys in THIS file supersede it where they differ. Its prices, login and forms are FAKE and client-side only; do not port that logic. Floor imagery is drawn procedurally on canvas as a placeholder; replace it with demo or real photography.

## Design principles

The brief: world-class UI/UX that visually SELLS Duratek and is clearly better than luvanto.com. It must not look AI-generated or templated.

- Imagery leads. Large-format room photography and wood-grain close-ups, full-bleed where possible.
- Clean, understated typography: Manrope headings paired with DM Sans. No default system look.
- Restrained palette drawn from the Duratek logo and the flooring tones. Generous white space.
- Varied layout rhythm: full-bleed, split, inset, horizontal scroll. Never the same card block repeated down the page.
- Slow, deliberate motion. No gratuitous animation, no bouncing, no parallax overload.
- One signature interaction (finish explorer) done really well, rather than many gimmicks.
- Mobile-first and tablet-friendly (fitters show this on site visits). Generous touch targets, with the sticky bottom bar on mobile.
- Fast: strong Core Web Vitals, lazy-load below-the-fold media, no layout shift.
- Accessibility: WCAG AA contrast, keyboard navigation, visible focus, alt text on every image, respect prefers-reduced-motion.

### Avoid (marks of generic AI design)

- Purple/blue gradient heroes, glassmorphism everywhere, icon-in-circle feature grids, generic stock-style illustrations
- Emoji in UI, "Revolutionise / Elevate / Seamless" filler copy
- Centred-everything layouts and identical rounded cards repeated down the page
- Lorem ipsum, invented testimonials, invented ratings or review counts, invented stockists

## Copy tone

Confident, calm and precise. Short sentences. No hype, no unverified claims. Never state performance or certification claims that are not in the product facts above. Reuse the approved copy from the Duratek page; write new copy in the same voice.

## Conventions

- TypeScript strict. Server components by default; client components only when needed.
- Design tokens (colour, spacing, type) defined once and reused. No hard-coded one-off values.
- Small, focused components. Co-locate styles and tests.
- Conventional commits. Work on branches; open PRs.
- Run lint, typecheck, tests and a production build (`next build`) before declaring work done or pushing: the production branch deploys on push, and only the build catches prerendering errors. Check each page at 390px, 768px and 1440px.
- No numbers as list or bullet markers (no "01, 02, 03" or "1. 2. 3."), on the site or in written summaries. On the site, use the green square marker, or round colour swatches where a list is about colour. Position counters such as "1 / 8" in a gallery are fine.

## Build order

1. Scaffold, design tokens, layout shell (header, mobile bottom bar, footer)
2. Supabase schema, RLS policies, seed (demo finishes from Kwik Floors, fake prices, Kwik Floors as an online retailer)
3. Public pages: home, range, finish detail, technology, warranty, inspiration
4. Sample tray and sample request flow (with emails)
5. Where to buy (stockists, postcode search, online retailers)
6. Finish explorer
7. Trade: apply, login, approval emails, account (prices, documents), Customer view, shortlists
8. Owner admin: approvals, tiers, prices, finishes, stockists, sample requests, documents

## Open items (waiting on the client)

- Own photography (room scenes and close-ups), or permission to use the Kwik Floors images
- Logo SVG, badge artwork, brand guidelines
- Full finish list with sizes and specs
- Stockist and fitter list for Where to buy
- Sample policy: confirm free, the limit per request, and who dispatches
- Final trade price tiers and the prices themselves
- Technical sheets, warranty documents, test certificates, brochure
- Domain name
- Who administers approvals, samples, stockists and prices day to day
