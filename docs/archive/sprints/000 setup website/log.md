# Sprint 000 — Website Setup Log

_Last updated: 2026-06-13_

## Objective

Stand up the DecisionBroker website on a hosting + domain stack suitable for a
Next.js (server) app with a future PostgreSQL backend, and confirm a working
continuous-deployment pipeline.

## Architecture decision

Evaluated **Cloudflare Workers (OpenNext)** vs **Vercel** for hosting.

- The repo originally shipped Cloudflare's Next.js Workers starter (OpenNext +
  Wrangler). Postgres from Workers requires Hyperdrive or an HTTP driver due to
  the V8 isolate runtime — workable but adds friction.
- Chose **"Option A": host on Vercel, keep the domain registered + DNS-managed
  at Cloudflare.** Vercel runs full Next.js natively (any Postgres driver works)
  while the domain stays where it was purchased.

Domain: **`decisionbroker.com`** (singular — note: not "decisionbrokers").

## What was done

### 1. Repo linked and cloned
- Initialized git in place (preserving the existing `.claude` folder) and
  checked out `main` from `https://github.com/Darcy-Projects/decisionbroker`.
- Tooling confirmed: git 2.49, GitHub CLI 2.78 (authed as `ddaugela`),
  Node 22.17, npm 11.2.

### 2. Replaced Cloudflare starter with a fresh Vercel-native app
- Scaffolded a clean app via `create-next-app`: **Next.js 16, React 19,
  TypeScript, App Router, Tailwind CSS 4, ESLint**, `src/` dir, `@/*` alias.
- Removed all Cloudflare-specific config (`wrangler.jsonc`,
  `open-next.config.ts`, generated `env.d.ts`, `@opennextjs/cloudflare`).
- Verified `npm run build` succeeds locally.
- Commit: `deaa6d6` — "Replace Cloudflare Workers starter with fresh Next.js app
  for Vercel".

### 3. Connected Vercel + custom domain (Cloudflare DNS)
- Imported the GitHub repo into Vercel (project `decisionbroker`), auto-detected
  as Next.js. Production deploys on push to `main`.
- Cloudflare DNS records (both **DNS only / grey cloud**, unproxied — required
  for Vercel):
  - `A` `@` → `216.198.79.1` (Vercel's current apex IP)
  - `CNAME` `www` → `d79353046e343676.vercel-dns-017.com`
- `www` is the primary domain; the apex `308`-redirects to it.

### 4. Debugged SSL / "not secure"
- Symptom: Chrome reported "not secure"; TLS handshake failed and Vercel
  returned `DEPLOYMENT_NOT_FOUND`.
- Ruled out: DNS propagation (correct), CAA records (none blocking).
- **Root cause:** the domain typed into Vercel was the *plural*
  `decisionbrokers.com`, while the owned/DNS-configured domain is the *singular*
  `decisionbroker.com`. Vercel had no binding for the real domain.
- Fix: removed the plural domains in Vercel → Settings → Domains, added the
  singular `decisionbroker.com` + `www.decisionbroker.com`. Vercel verified
  against the already-correct DNS and auto-issued the SSL certificate.

### 5. Verified continuous deployment
- Replaced the starter page with a minimal **"Coming Soon"** landing page;
  updated document title to `DecisionBroker — Coming Soon`.
- Commit: `81adf94` — "Add Coming Soon landing page". Pushed to `main`.
- Confirmed live within seconds at `https://www.decisionbroker.com` over valid
  HTTPS, proving the push-to-`main` → auto-deploy pipeline.

## Current state

- ✅ Repo on GitHub, `main` is the production branch.
- ✅ Fresh Next.js 16 app (TS, App Router, Tailwind 4).
- ✅ Live at `https://decisionbroker.com` with auto-SSL.
- ✅ Push to `main` → Vercel auto-deploys to production.
- ✅ Push to any other branch → Vercel preview URL (production untouched).
- ▶️ Current page: "Coming Soon" placeholder.

## Deploy model (reference)

- A commit appearing on **`main` on GitHub** (push, web edit, or merged PR)
  triggers a production deploy. Local commits deploy only once pushed.
- Failed builds are not promoted; the last good deployment keeps serving.
- For larger changes (e.g. Postgres), work on a branch and review the preview
  URL before merging to `main`.

## Next steps

- **PostgreSQL backend** — pick a host (Vercel Postgres / Neon / Supabase) and a
  data layer (Drizzle vs Prisma), then wire it in (env vars, schema, migrations).
