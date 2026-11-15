# farisradifana.my.id

Personal portfolio of Faris Radifan Ahmad, plus an unlisted job-application dashboard at `/dashboard`.

- **Site:** Astro (static output), TypeScript, no client framework. Images are converted to WebP at build time.
- **Hosting:** Cloudflare Workers Static Assets. Pages are served without running code.
- **API:** one small Worker (`worker/index.ts`) that only runs for `/api/*`: the contact form and the dashboard data.
- **Data:** Cloudflare D1 (`portfolio-applications`).

## Requirements

Node.js 22.23 or newer (CI uses 24) and npm.

## Local development

```bash
npm install
npm run dev        # Astro dev server, pages only
npm run preview    # wrangler dev: built site + Worker + local D1 (run `npm run build` first)
```

For `npm run preview`, copy `.env.example` to `.dev.vars` and set the two tokens. `.dev.vars` is git-ignored.

## Checks

```bash
npm run check      # astro check + worker type check
npm test           # vitest
npm run build      # static build into dist/
```

## Content

| What | Where |
| --- | --- |
| Text, navigation, experience, projects, skills | `src/data/site.ts` |
| Social links | `src/data/socials.ts` |
| Role galleries | `src/assets/gallery/` (grouped by filename, see `src/lib/gallery-match.ts`) |
| Project screenshots | `src/assets/projects/<project>/`, listed with alt text in `src/data/site.ts` |
| CV download | `public/assets/cv/` |
| Social preview image | `public/og.png`, rebuilt with `node scripts/make-og.mjs` |

A gallery image without alt text fails the build on purpose.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`: check, test, build, then `wrangler deploy`.

### One-time setup

1. **GitHub secret.** In the repository settings, add an Actions secret named `CLOUDFLARE_API_TOKEN`.
   Create it in the Cloudflare dashboard (My Profile → API Tokens → Create Custom Token) with these permissions:
   - Account → Workers Scripts → Edit
   - Account → D1 → Edit
   - Account → Account Settings → Read
   - Zone → Workers Routes → Edit (zone `farisradifana.my.id` only)
   - User → User Details → Read

   Limit the token to the one account. The token is never stored in this repository.
2. **Worker secrets.** Generate two different random values and store them as Worker secrets:

   ```bash
   npx wrangler secret put DASHBOARD_READ_TOKEN
   ```

   ```bash
   npx wrangler secret put INGEST_TOKEN
   ```

3. **Database.** `wrangler.jsonc` has no `database_id`, so the first deploy creates `portfolio-applications`.
   Then create the table:

   ```bash
   npx wrangler d1 migrations apply portfolio-applications --remote
   ```

4. **Contact form mail.** The Worker sends mail through the `send_email` binding. The destination address in
   `wrangler.jsonc` must be a verified destination address in Cloudflare Email Routing for the zone.
   Until that is done the form answers with an error and the mail link still works.

### DNS records to verify

The zone `farisradifana.my.id` must be on Cloudflare with its nameservers set to Cloudflare at the registrar.
The Worker is attached with Workers Routes (`farisradifana.my.id/*` and `www.farisradifana.my.id/*`), so the
two DNS records stay managed in the dashboard. Each must be **proxied** (orange cloud), or traffic never reaches
the Worker. The record target is not used while the route matches; a placeholder is fine:

| Type | Name | Content | Proxy |
| --- | --- | --- | --- |
| `AAAA` | `@` | `100::` | Proxied |
| `CNAME` | `www` | `farisradifana.my.id` | Proxied |

Keep `MX` and `TXT` records. SSL/TLS mode `Full` or `Full (strict)` works; the Worker answers before any origin.

## Dashboard

`/dashboard` is unlisted: `noindex`, not in the sitemap, and not in the navbar until
`site.showDashboardInNav` is set to `true` in `src/data/site.ts`.

- **Demo mode** (default): generated data with placeholder company names. Nothing real ships in the page.
- **Private mode:** enter `DASHBOARD_READ_TOKEN` on the page. The token stays in `sessionStorage` and is sent as a
  Bearer token to `GET /api/applications`.

### How `apply-job-daily` writes to the store

After each run, the scheduled task calls the sync script with the tracker CSV:

```bash
node scripts/sync-tracker.mjs "F:\apply-job\ai-job-apply\data\tracker.csv"
```

It needs two environment variables on that machine: `PORTFOLIO_URL=https://farisradifana.my.id` and `INGEST_TOKEN`
(the same value as the Worker secret). The script reads the CSV, keeps applied jobs, and sends them in batches to
`POST /api/applications`. Rows are upserted by id, so running it twice changes nothing. Add `--dry-run` to see what
would be sent.

## Security

- No secret is committed. `.env`, `.dev.vars` and credential files are git-ignored; `.env.example` holds placeholders.
- Security headers and the Content Security Policy are in `public/_headers`.
- The contact form has a honeypot, server-side validation and a rate limit. API tokens are compared in constant time.
