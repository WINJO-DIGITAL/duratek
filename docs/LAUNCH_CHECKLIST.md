# Launch checklist (developer)

The source of truth for launch is `docs/OWNER_CHECKLIST.md`. Everything the owner or client must do lives there. This file holds only developer-side work.

## Verified

- Unit, database, end-to-end and QA suites passed on the local stack at their last full run, before the cookie notice change. They have not been rerun since.
- Lint and typecheck are clean. One existing lint warning, an unused import in `src/components/explorer/finish-explorer.tsx`, is left as is.
- No secrets are committed; only `.env.example` is tracked.
- Live site: the contact form submits and saves; trade and sample emails wait on Resend (owner item 3).
