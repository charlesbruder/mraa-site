# Moving the site to an MRAA-owned Netlify account

Checklist for the Tuesday meeting with Chuck. Goal: the website's hosting lives in an
account the organization owns, not inside Zignal's account.

## Before the meeting
- Decide which email owns the account. Best: a board email like `web@mizzourugbyalumni.org`
  or a shared `mraa.rugby@gmail.com` — NOT one person's personal email (people rotate off boards).
- Bring the board password for the Site Manager (needed to re-enter env vars if recreating).

## Option A — Transfer the existing site (preferred, ~10 min)
1. Chuck (or the board email) creates a free account at netlify.com — "Sign up with Email".
2. Michael logs into his Netlify → team `ZignalOS` → site `mraa-rugby` →
   **Site configuration → General → Danger zone → Transfer site**.
3. Enter the new team's slug → confirm. The site moves with its settings, forms,
   env vars, and the `mraa-rugby.netlify.app` name intact.
4. On the NEW account: reconnect the GitHub repo if prompted
   (Site configuration → Build & deploy → Link repository → `skreenpeeker/mraa-site`).
   This may require installing the Netlify GitHub App on skreenpeeker again — one browser click.
5. Verify: push a trivial commit → auto-deploy runs on the new account's fresh credits.
6. Michael's account keeps nothing MRAA-related. Done.

## Option B — Recreate from scratch (fallback, ~30 min)
Only if transfer fails. New account → Import from Git → select repo → then re-add env vars:
`ADMIN_PASSWORD`, `ADMIN_SECRET` (generate new: `openssl rand -hex 32`), `GITHUB_TOKEN`,
`GHL_API_TOKEN`.
Re-enable form detection (Site configuration → Forms). Old site must be deleted first
to free the `mraa-rugby` name, or pick a new name.

**Do not skip `GHL_API_TOKEN`.** Without it, `netlify/functions/submission-created.mjs`
stops copying form submissions into GoHighLevel. The forms still work and visitors see
no error, so the only outward sign is a `[GHL]` error line in
Netlify → Logs → Functions → `submission-created`. It must be a GoHighLevel **Private
Integration** token (starts with `pit-`) carrying the `contacts.write` and
`opportunities.write` scopes — an OAuth access token looks identical but expires after
about 24 hours. Netlify always keeps the submission itself under Forms, so anything
missed during an outage can be backfilled by hand.

## Unchanged either way
- GitHub repo + the Claude editing pipeline (`CLAUDE_CODE_OAUTH_TOKEN` lives in GitHub, not Netlify).
- The Site Manager at /admin and the board password.
- The live site keeps serving throughout.

## Later / optional
- Move the GitHub repo to an MRAA GitHub organization too (Settings → Transfer ownership).
  The workflow secrets and Netlify link need re-connecting after a repo transfer — do this
  as its own project, not casually.
- Custom domain (~$12/yr) once the board picks one — buy it under the MRAA Netlify account.
