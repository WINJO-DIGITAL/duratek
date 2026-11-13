# Owner checklist

Everything only the owner can do before launch. The owner is also the client.

How to use this file: when asked for the owner's checklist, from any account or tool that uses this repo, show the numbered list under "For the owner" below, in that order. Completed items are removed, never ticked. Items that need the owner's own accounts (Supabase, Vercel, Resend, the domain registrar, the company's records) stay with the owner. The developer keeps `docs/LAUNCH_CHECKLIST.md` for build and QA work.

## For the owner

Work through these in order. Items 1 to 3 hold the trade and sample emails and must be done first.

1. **Supabase Auth settings:** in the Supabase project, under Authentication, confirm email confirmation is on, the minimum password length is 10, and the site URL is `https://www.duratekflooring.co.uk`.
2. **Admin login:** send the email address for the admin account. An invitation is sent, and the owner chooses their own password. Then run `npm run admin:owner -- <email>` (needs the service key in the environment).
3. **Email for trade accounts and samples:** set up or log in to Resend, verify the sending domain, and give the address that should receive alerts. The API key goes into the Vercel production settings as `RESEND_API_KEY`, never by email or chat. Also set `EMAIL_FROM` and `OWNER_NOTIFY_EMAIL`. Trade applications and sample requests stay closed until this is done.
4. **Trade applications:** once email is working, tell the developer, so online applications can be opened. Until then the trade page sends people to the contact form.
5. **Domain:** point www.duratekflooring.co.uk at Vercel. CNAME `www` to `cname.vercel-dns.com`; A record for the bare domain to `76.76.21.21`. Once live, set `NEXT_PUBLIC_SITE_URL` to `https://www.duratekflooring.co.uk` and redeploy in the same step.
6. **Stockists:** a list of showrooms, retailers and fitters for Where to Buy, with addresses and postcodes.
7. **Documents:** technical sheets, warranty documents, test certificates and the brochure, uploaded through the admin area.
8. **Trade prices:** the trade price tiers and prices, entered through the admin area. The seeded trade prices are placeholders and must be replaced.
9. **Photos:** confirm the current product photos can stay, or supply your own.
10. **Scratch Shield wording:** confirm Scratch Shield is a surface finish, not a separate layer.
11. **Legal:** a review of the privacy, cookies and terms pages by a qualified adviser before launch.

Decided: the owner dispatches free samples, up to three per request.

## Checks on the live site

After each change the owner makes, look over the site on a phone and a desktop: home, range, a finish page, where to buy, samples and the contact form. Report anything that looks wrong to the developer.
