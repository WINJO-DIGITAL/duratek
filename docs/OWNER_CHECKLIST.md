# Owner checklist

Everything the owner needs to do before launch. The owner is also the client.
Copy this list when sending it on. Keep it in step with `docs/LAUNCH_CHECKLIST.md`.

## For the owner

- [ ] **Admin login:** send the email address for the admin account. An invitation is sent, and the owner chooses their own password. Then run `npm run admin:owner -- <email>` (needs the service key in the environment).
- [ ] **Email for trade accounts and samples:** set up or log in to Resend, verify the sending domain, and give the address that should receive alerts. The API key goes into the Vercel production settings as `RESEND_API_KEY`, never by email or chat. Also set `EMAIL_FROM` and `OWNER_NOTIFY_EMAIL`.
- [ ] **Domain:** point www.duratekflooring.co.uk at Vercel. CNAME `www` to `cname.vercel-dns.com`; A record for the bare domain to `76.76.21.21`. Once live, set `NEXT_PUBLIC_SITE_URL` to `https://www.duratekflooring.co.uk` and redeploy in the same step.
- [ ] **Stockists:** a list of showrooms, retailers and fitters for Where to Buy, with addresses and postcodes.
- [ ] **Documents:** technical sheets, warranty documents, test certificates and the brochure, uploaded through the admin area.
- [ ] **Trade prices:** the trade price tiers and prices, entered through the admin area.
- [ ] **Photos:** confirm the current product photos can stay, or supply your own.
- [ ] **Scratch Shield wording:** confirm Scratch Shield is a surface finish, not a separate layer.
- [ ] **Legal:** a review of the privacy, cookies and terms pages by a qualified adviser before launch.

Confirmed: the owner dispatches free samples, up to three per request.

## Launch checks (live site)

- [ ] Home, range, finish page, technology, warranty, samples and explorer at 390px, 768px and 1440px.
- [ ] Contact form sends and saves (needs the service key correct in production).
- [ ] Trade application and sample emails, once Resend is set up.
