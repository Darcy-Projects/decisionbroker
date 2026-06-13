# DecisionBroker

Next.js app hosted on **Vercel**, with domain + DNS on **Cloudflare** and a
**Postgres** backend via **Drizzle ORM**.

**Live:** https://decisionbroker.com

## Documentation

The authoritative, current overview lives in
**[`docs/live/tech stack.md`](docs/live/tech%20stack.md)**. Sprint history is
under [`docs/sprints/`](docs/sprints) (completed sprints in `docs/archive/sprints/`).
Agent/contributor conventions are in [`AGENTS.md`](AGENTS.md).

## Local development

```bash
npm install
npm run db:up    # start local Postgres (Docker)
npm run dev      # http://localhost:3000
```

Requires a `.env.local` with `DATABASE_URL` — see [`.env.example`](.env.example).

## Database (Drizzle)

| Command | Purpose |
| --- | --- |
| `npm run db:push` | Apply schema directly (rapid dev iteration) |
| `npm run db:generate` | Generate a versioned SQL migration |
| `npm run db:migrate` | Apply migrations (local) |
| `npm run db:migrate:prod` | Apply migrations to Neon (uses `.env.production.local`) |
| `npm run db:studio` | Browse data in a GUI |
| `npm run db:down` | Stop local Postgres |

## Deploy

Push to `main` → Vercel production. Other branches get preview URLs.
