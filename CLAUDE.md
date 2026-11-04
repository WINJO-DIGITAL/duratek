# Duratek

A premium, image-led brand website for **Duratek** (waterproof SPC click flooring). It serves two audiences:

- **Homeowners**: browse the range, get inspired, order free samples, and find where to buy. No prices shown.
- **Trade** (fitters, retailers, contractors, specifiers): apply for an account, get approved, log in to see their own prices and download documents, and show the range to their customers.

Duratek is the client's own brand. Kwik Floors and Dave's Tiles are the client's separate Shopify consumer stores. They are NOT part of this codebase, but Kwik Floors appears on the site as an online retailer, and its Duratek collection is the source of demo product data (see Demo content).

## Scope (v1)

- **Public**: a visual showcase of the range, finish explorer, inspiration, free sample ordering, where to buy, and a brochure download. No prices anywhere.
- **Trade**: apply, get approved, log in, see prices, download documents, build shareable shortlists, and use Customer view.
- **Owner admin**: approve trade applications, assign price tiers, enter and edit prices, manage finishes, manage stockists, view and process sample requests, and upload documents.
- **Out of v1**: no basket, checkout or online payment, no ordering, and no quotes. Public prices and direct selling may come in v2. Structure the code so a cart can be added later, but build none of it now.

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

Audience switch: a "Homeowner / Trade professional" choice (Luvanto's "What describes you best?"), done properly. It appears once as a clear block on the home page. It tailors the CTAs (homeowner → samples and where to buy, trade → apply/login) and the choice persists for the session. It is not a gate, and no content is hidden behind it.

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
- `/trade/account`: prices, documents, shortlists (approved only)
- `/s/[token]`: public shared shortlist (never shows prices)
- `/admin/...`: owner admin
- `/contact`, `/privacy`, `/cookies`, `/terms`

## Home page

Luvanto's structure, filled with the Duratek content from https://www.kwikfloors.co.uk/pages/Duratekflooring. Order:

1. **Hero**: full-bleed room photograph, wordmark, heading (no eyebrow label above it) "Beautifully considered. Built to perform.", one primary CTA (Explore the range) and one quiet secondary link (Order free samples).
2. **Spec strip**: 0.55mm Protective wear layer · Scratch Shield Surface protection · Waterproof Rigid SPC core · Unilin Precision click system.
3. **A style for every space**: two large image tiles, Straight plank and Herringbone, each linking to the filtered range.
4. **Popular finishes**: a horizontal scroll of finish cards (image, name, style, "Add to samples"). No prices.
5. **Made for life as it happens**: Scratch Shield badge and copy.
6. **Protection you can feel confident in**: 0.55mm.
7. **Performance beneath the surface**: an interactive layer breakdown (protective top finish, 0.55mm wear layer, decorative layer, SPC rigid core, integrated underlay).
8. **Beautifully fitted. Effortlessly finished.**: Unilin.
9. **Homeowner / Trade switch**: two clear paths.
10. **Considered from every angle.**
11. **Confidence for years to come**: warranty badges plus the full disclaimer.
12. **Where to buy band**: postcode input that goes to `/where-to-buy`.
13. **Closing CTA**: "Timeless in style. Resilient by design."
14. **Footer**: grouped (Range, Help, Trade, Company), contact, newsletter (email only), legal, and company details.

Sections 5–8 may be condensed or restyled so the page doesn't become a long column of text blocks. Pair every one of them with imagery, and alternate layout rhythm (full-bleed, split, inset) rather than repeating identical cards.

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

1. Prices are never sent to logged-out or unapproved users. Gate on the SERVER (server components / route handlers), not with CSS or client-side hiding. Customer view also strips prices on the server.
2. Price data lives in tables protected by Row Level Security. Only approved users can read it, and only their own tier or account price.
3. Only the owner/admin role can write prices, tiers, approvals, finishes, stockists and documents.
4. Never expose the Supabase service-role key to the client. Never commit secrets; use env vars.
5. Gated documents are served via short-lived signed URLs, not public links.
6. Validate all form input on the server. Rate-limit application, login, sample request and contact endpoints. Add a honeypot to public forms.
7. Personal data (sample requests, applications) is readable only by admin. UK GDPR: privacy policy, consent for marketing, no unnecessary data.

## Data model

- `profiles`: id (auth user), company_name, contact_name, phone, trade_type (fitter | retailer | contractor | specifier), status (pending | approved | rejected), tier_id, is_admin, list_as_stockist (bool)
- `price_tiers`: id, name
- `finishes`: id, name, slug, style (plank | herringbone), colour_family, description, specs (jsonb: sizes, thickness, pack coverage etc.), sort_order, published, is_demo
- `finish_images`: finish_id, url, kind (swatch | room | closeup), alt, sort_order
- `prices`: finish_id, tier_id, price_per_m2_pence (integer), updated_at
- `price_overrides`: finish_id, profile_id, price_per_m2_pence
- `documents`: id, title, type (tech sheet | warranty | certificate | fitting guide | brochure), finish_id nullable, storage_path, trade_only
- `sample_requests`: id, name, email, phone, address_line1, address_line2, town, postcode, finish_ids, marketing_opt_in, status (new | sent), created_at
- `stockists`: id, name, type (showroom | retailer | fitter), address, postcode, lat, lng, phone, website, published
- `online_retailers`: id, name, url, logo_path, sort_order, published
- `shortlists`: id, profile_id, name, token, finish_ids, created_at
- `inspiration`: id, title, mood, image_path, finish_ids, sort_order, published
- Trade applications are captured as `profiles` with status = pending.

Money is stored as integer pence.

## Key features

- **Finish explorer** (the one signature interaction, done really well): full-screen, image-led browsing of every finish. Swipe or arrow between finishes, tap to switch between the room scene and the grain close-up, filter by style and colour family, and "Add to samples" without leaving. Smooth, slow transitions; respects prefers-reduced-motion.
- **Sample tray**: see Samples.
- **Where to buy**: see Where to buy.
- **Customer view toggle**: a logged-in trader can switch, with one tap, to a mode that hides ALL prices so they can show the site to homeowners on a phone or tablet. It persists for the session and is clearly indicated, with an easy exit.
- **Shareable shortlists**: a trader picks finishes and shares a clean link (a PDF can come later) with no prices.
- **Trade application**: short form, email confirmation, owner approval flow.
- **Trade area**: prices, documents, shortlists.

## Brand theme (Duratek navy, green and white)

**Standing rule from the client:** any design idea or reference they share (a screenshot of another site, a pattern they like) is to be built in the Duratek theme below unless they say otherwise. Take the structure or idea, never the other brand's colours, fonts, logo or copy.

Use the existing Duratek brand identity. Do NOT use Ted Todd's beige, brown, taupe or natural-wood brand palette, and do not introduce beige, brown or gold as alternative brand colours. Take Ted Todd's editorial approach (premium typography, generous whitespace, large photography, elegant composition), but the identity must feel unmistakably Duratek.

- Primary navy `#18364C`: hero sections, footer and important feature areas; navy typography on light backgrounds.
- Duratek green `#4B9B48`: accent text, subtle highlights, selected navigation details, interactive elements. For WCAG AA, small green text and button fills use the darker `#3D7F3B` on light backgrounds, and `#54AE51` on navy (same hue).
- White `#FFFFFF`: prominent headings on navy; alternating sections.
- Off-white `#F7F6F2`: spacious product and collection sections.
- Secondary text: muted slate grey `#5A6B78` (on navy: `#B9C6D0`).
- Headings and product titles: Manrope (medium 500; light 300 for emphasis, no italics). Body, navigation and buttons: DM Sans (400 body, 500 buttons and nav). Avoid unnecessary bold.
- Small tracked uppercase green eyebrow labels above headings (e.g. "DURATEK SURFACE TECHNOLOGY", "ENGINEERED DURABILITY")
- Buttons: square-cornered. Off-white on navy, or green on light, with a trailing arrow ("Shop full Duratek range →").
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
