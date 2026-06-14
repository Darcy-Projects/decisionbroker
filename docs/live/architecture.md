# DecisionBroker — Architecture (Live)

> Living document. Describes **how the code is organized and why** — the tiers,
> boundaries, and the rules that keep them independent. For the **concrete tech
> choices** (which database, host, versions, env vars, commands) see
> [`tech stack.md`](./tech%20stack.md).
>
> Rule of thumb for which doc a fact belongs in: _if swapping a vendor would
> change the sentence, it goes in `tech stack.md`; if the sentence survives the
> swap, it goes here._

_Last updated: 2026-06-13_

## 1. The picture

DecisionBroker is built as **one shared brain serving many faces** (Ports &
Adapters / hexagonal). Many interfaces (web, API, CLI, mobile) call into a single
framework-free middle tier, which reaches the outside world (database, file host,
auth) only through interfaces it defines.

```
        iOS app     Android app     CLI     Web UI     3rd-party API consumers
           \            \            |          /              /
             ▼            ▼          ▼        ▼              ▼
        ┌──────────────────────────────────────────────────────────┐
        │   INTERFACE TIER  (driving adapters)                       │
        │   web UI · HTTP API · CLI                                  │
        └──────────────────────────────────────────────────────────┘
                                   │  calls application services only
                                   ▼
        ┌──────────────────────────────────────────────────────────┐
        │   MIDDLE TIER (core)  — framework-free, no I/O             │
        │   domain  ·  application/use-cases  ·  ports (interfaces)  │
        └──────────────────────────────────────────────────────────┘
                                   ▲  adapters implement the ports
                                   │
        ┌──────────────────────────────────────────────────────────┐
        │   DATA TIER  (driven adapters — swappable per customer)    │
        │   Postgres · object storage · auth                        │
        └──────────────────────────────────────────────────────────┘
```

## 2. The three tiers and the dependency rule

**Dependencies point inward.** Interface → application → domain. The core never
imports outward.

| Tier | Folder | Responsibility | May depend on |
| --- | --- | --- | --- |
| **Interface** (driving adapters) | `src/app` | Translate transport ⇄ application-service calls. Thin: no business logic, no data access. | core (types/services), the composition root |
| **Middle / core** | `src/core` | All business logic. `domain` (entities + rules), `application` (use cases), `ports` (interfaces it needs). Pure — no framework, no I/O. | nothing but itself |
| **Data** (driven adapters) | `src/infrastructure` | Concrete implementations of the core's ports — DB, file storage, auth, clock. Swappable. | core ports (to implement them) |
| **Composition root** | `src/infrastructure/config/container.ts` | The one place that wires a chosen adapter to each port and builds the application services. | everything |

The core defines **what it needs** (ports); the data tier provides **how** (adapters);
the composition root decides **which** adapter is used. So the interface and the
core are insulated from every vendor choice.

## 3. Ports & adapters today

| Port (`src/core/ports`) | Adapter (`src/infrastructure`) | Swap story |
| --- | --- | --- |
| `FileRepository` | `db/drizzle/file-repository.ts` (Drizzle/Postgres) | Different Postgres host = env only; different engine = new adapter |
| `Clock` | `clock/system-clock.ts` | Replace with a fixed clock in tests |
| _(planned)_ `FileStorage` | `storage/{r2,s3,fs}/…` | R2 ↔ S3 ↔ MinIO; mostly config since R2 is S3-compatible |
| _(planned)_ `AuthN` | `auth/workos/…` | WorkOS today; portable per the app-layer security model |

Adapters map their own shapes to the core's domain types (e.g. the Drizzle row →
`FileRecord`), so storage concerns never leak inward.

## 4. How each client attaches

- **Web UI** (`src/app/(web)`) and a future **Node/TS CLI** are _in-process_
  driving adapters: they call application services directly via the composition
  root. They still never touch the data tier.
- **Native iOS/Android and any non-TypeScript client cannot import the core.**
  They consume it over the wire through the **HTTP API** (`src/app/api`).
- Therefore the **HTTP API is the published contract** for external clients:
  version it, validate request/response shapes (Zod), and keep handlers thin —
  parse/authorize → call an application service → serialize the result.

## 5. Directory layout

```
src/
  app/                      # INTERFACE TIER (Next.js)
    (web)/                  #   web UI routes
    api/                    #   HTTP API — the external contract
  core/                     # ── MIDDLE TIER ── (no framework, no I/O)
    domain/files/file.ts    #   entities + pure rules (e.g. archive())
    application/files/       #   use cases (e.g. archive-file.ts)
    ports/                   #   FileRepository, Clock, …
  infrastructure/           # ── DATA TIER ── (driven adapters; swappable)
    db/drizzle/              #   schema.ts, client.ts, file-repository.ts
    clock/                   #   system-clock.ts
    config/container.ts      #   composition root (wires adapters → services)
  shared/                   # cross-cutting pure helpers
```

`docs/` is intentionally **outside** this hierarchy (top-level, sprint-based) —
the architecture lives in `src/`, its description lives in `docs/`.

**Path aliases** (`tsconfig.json`): `@/*` → `src/*`, `@/core/*` → `src/core/*`,
`@/infra/*` → `src/infrastructure/*`.

### Worked example — `archiveFile`

`src/app` → `container.services.archiveFile(id)` → `makeArchiveFile` use case →
`archive()` domain rule + `FileRepository` port → `DrizzleFileRepository` adapter
→ Postgres. The interface never sees SQL; the core never sees Drizzle.

## 6. Boundary enforcement (mechanical, not just convention)

Enforced by `no-restricted-imports` in `eslint.config.mjs`:

- **Interface tier (`src/app/**`)** may not import data-tier adapters
  (`@/infra/db|storage|auth|clock/**`) or raw `drizzle-orm`/`postgres`. It reaches
  the core through the composition root (`@/infra/config/**`) and application
  services.
- **Core (`src/core/**`)** may not import any infrastructure, `next`, `react`,
  `drizzle-orm`, or `postgres` — it stays framework- and I/O-free.
- **Infrastructure (`src/infrastructure/**`)** may not import the interface tier.

`npm run lint` fails the build on a violation, so the layering can't quietly rot.

## 7. Swap / extension points

- **Swap DB host** (Neon → self-hosted Postgres): change `DATABASE_URL` only —
  the Drizzle adapter is unchanged.
- **Swap DB engine**: write a new adapter implementing `FileRepository`; the core
  is untouched.
- **Swap file host** (R2 → S3 → MinIO): add/replace a `FileStorage` adapter.
- **Per-customer / self-hosted data**: model as tenant configuration the
  composition root reads to select adapters + connection details. The isolation
  details are a later design; `container.ts` is the seam where they plug in.

## 8. Roadmap to a monorepo (deferred)

When a second runnable client (CLI or React Native app) appears, lift these
folders into a Turborepo/pnpm workspace — `core` → `packages/core`,
`infrastructure` → `packages/infra`, `app` → `apps/web`, plus `apps/cli`,
`apps/mobile`, and a shared typed `api-client`. The boundaries above make this a
**move, not a rewrite**. Until then, the single Next.js app keeps tooling simple.

---

See [`tech stack.md`](./tech%20stack.md) for the concrete technologies sitting
behind each adapter, hosting, env vars, and database workflow.
