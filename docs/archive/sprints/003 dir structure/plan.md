# Sprint 003 — Directory Structure & Architecture (Recommendations)

_Last updated: 2026-06-13_

> This is the **proposal / decision doc** for the sprint. Once agreed, the
> durable version of the architecture lands in `docs/live/architecture.md` (see
> §6 for how that doc and `tech stack.md` divide responsibilities).

## 1. Goal (restated)

Structure the project so it can grow **one shared brain** serving many faces:

```
        iOS app     Android app     CLI     Web UI     3rd-party API consumers
           \            \            |          /              /
            \            \           |         /              /
             ▼            ▼          ▼        ▼              ▼
        ┌──────────────────────────────────────────────────────────┐
        │   INTERFACE TIER  (driving adapters — how the world gets in)│
        │   web UI · HTTP API · CLI                                   │
        └──────────────────────────────────────────────────────────┘
                                   │  (only calls application services)
                                   ▼
        ┌──────────────────────────────────────────────────────────┐
        │   MIDDLE TIER  (the business logic — framework-free, no I/O)│
        │   domain  ·  application/use-cases  ·  ports (interfaces)   │
        └──────────────────────────────────────────────────────────┘
                                   │  (depends only on port interfaces)
                                   ▼
        ┌──────────────────────────────────────────────────────────┐
        │   DATA TIER  (driven adapters — swappable per customer)     │
        │   Postgres(Neon|self-host) · R2|S3|MinIO · WorkOS           │
        └──────────────────────────────────────────────────────────┘
```

Hard requirement: **no interface layer ever touches the data tier directly.**
Everything flows through the middle tier.

## 2. The pattern: Ports & Adapters (Hexagonal / Clean)

This is the textbook fit, and brief research confirms it remains the 2025
best-practice for "one backend, many clients, swappable infrastructure":

- The **core** (middle tier) holds pure business logic and knows nothing about
  the web, the database, or the file host.
- **Ports** are TypeScript **interfaces** the core defines for what it needs from
  the outside (`FileRepository`, `FileStorage`, `Clock`, `AuthN`).
- **Adapters** implement those interfaces. A port can have many adapters, so you
  swap Postgres↔Postgres-host, or R2↔S3↔MinIO, without touching the core.
- **The dependency rule:** dependencies point **inward**. Interface → application
  → domain. Infrastructure depends on the core's ports (it implements them); the
  core never imports infrastructure.

### Where the mobile/CLI clients actually attach (important nuance)

Native iOS/Android (and any non-TypeScript client) **cannot import the TS core**.
They consume it over the wire via the **HTTP API**. So:

- The **HTTP API is the real contract** for mobile + 3rd-party clients. Treat its
  request/response shapes as a published interface (version it, validate with Zod).
- The **Web UI** and a future **Node/TS CLI** are *in-process* driving adapters —
  they can call application services directly (still never the data tier).
- Net: the API route handlers and the Web UI are **thin** — they translate
  transport ⇄ application-service calls and do no business logic themselves.

## 3. Recommended directory structure

### 3a. Now — layered inside the existing Next.js app (recommended)

Keep the single Vercel-deployed Next.js app, but introduce the three tiers as
folders **and enforce the boundaries**. This buys the architecture without paying
the monorepo tax before there's a second client.

```
src/
  app/                      # INTERFACE TIER (Next.js owns this folder)
    (web)/                  #   web UI routes (React Server Components)
    api/                    #   HTTP API route handlers — the external contract
                            #   → thin: parse/validate → call application service
  core/                     # ── MIDDLE TIER ── (no framework, no I/O imports)
    domain/                 #   entities, value objects, domain rules, errors
      files/
    application/            #   use cases / application services (orchestration)
      files/                #     e.g. uploadFile.ts, archiveFile.ts
    ports/                  #   interfaces the core needs from the outside
      file-repository.ts    #     (driven ports)
      file-storage.ts
      clock.ts
  infrastructure/           # ── DATA TIER ── (driven adapters; swappable)
    db/
      drizzle/              #   schema.ts, client, *Repository implements port
    storage/
      r2/                   #   S3-compatible adapter (R2 today)
      fs/                   #   local-disk adapter (tests / self-host)
    auth/
      workos/
    config/                 #   composition root: env → choose & wire adapters
  shared/                   # cross-cutting pure helpers (Result type, ids, etc.)
```

**Migration of what exists today** (small, mechanical):
- `src/db/schema.ts` → `src/infrastructure/db/drizzle/schema.ts`
- `src/db/index.ts` (client) → `src/infrastructure/db/drizzle/client.ts`
- Update `drizzle.config.ts` `schema` path and the `@/db` import in `src/db` users.
- Add the `core/ports/file-repository.ts` interface and a Drizzle adapter that
  implements it; application services depend on the **port**, not on Drizzle.

**`docs/` stays exactly where it is** — outside `src/`, top-level, sprint-based.
The architecture lives under `src/`; the *description* of it lives under `docs/`.
(Per your requirement, the doc hierarchy is intentionally separate.)

### 3b. Later — graduate to a monorepo when the 2nd client lands

When the CLI or a React Native app becomes real, lift the same folders into a
Turborepo/pnpm workspace. The boundaries you enforced in 3a make this a **move,
not a rewrite**:

```
apps/
  web/        ← src/app (Next.js)
  cli/        ← new driving adapter, imports @db/core
  mobile/     ← React Native / Expo (consumes the HTTP API)
packages/
  core/       ← src/core         (domain + application + ports)
  infra/      ← src/infrastructure (adapters)
  api-client/ ← typed client (Zod contracts) shared by web/cli/mobile
  config/     ← shared tsconfig/eslint
docs/         ← unchanged, still top-level
```

**Recommendation: do 3a now, defer 3b.** The project is explicitly
experimental/fast-iteration with a clean-exit goal; a monorepo's tooling tax
(Turborepo, workspace wiring, transpilePackages) earns its keep only once a
second runnable app exists. The folder names above are chosen to map 1:1 to the
future packages so the graduation is low-friction.

## 4. Enforcing "no interface → data tier" (so it can't rot)

A convention nobody can enforce will erode. Make the boundary mechanical:

1. **ESLint import boundaries** — `no-restricted-imports` (or
   `eslint-plugin-boundaries`): `src/app/**` may import from `@/core/**` only —
   never `@/infrastructure/**` or a raw DB client. `@/core/**` may not import
   `@/infrastructure/**` or `next/*`.
2. **Composition root is the only wiring point** — `infrastructure/config`
   instantiates adapters and hands them to application services. Nothing else
   `new`s an adapter.
3. **Optional CI gate** — `dependency-cruiser` to fail the build on a violation.
4. **Path aliases** make intent obvious: add `@/core`, `@/infra` alongside `@/*`.

## 5. Swappable data tier (per-customer hosting)

The ports model gives you the seams; the composition root selects per
deployment/customer:

- **Swap DB host** (Neon → self-hosted Postgres): just `DATABASE_URL`. No code —
  the Drizzle adapter is unchanged. (Already true today; the port formalizes it.)
- **Swap DB engine** (Postgres → something else): write a new adapter
  implementing `FileRepository`; core untouched.
- **Swap file host** (R2 → S3 → MinIO): R2 is S3-compatible, so often one
  adapter + different config; otherwise a sibling adapter under `storage/`.
- **Per-customer / "host it themselves":** model it as **tenant configuration**
  that the composition root reads to pick adapters + connection details. The
  multi-tenant routing/isolation details are a **later** design — but this
  structure is the seam where they plug in, so we don't have to decide them now.

## 6. `architecture.md` vs `tech stack.md` — dividing the line

To avoid the two docs overlapping, split them by **what survives a vendor swap**:

| | `docs/live/tech stack.md` | `docs/live/architecture.md` (new) |
| --- | --- | --- |
| **Question it answers** | *What* are we using and *where* does it run? | *How* is the code organized and *why*? |
| **Contains** | Concrete products, vendors, versions, hosting, DNS, env vars, commands, current status | Tiers, boundaries, the dependency rule, ports/adapters, folder layout, enforcement |
| **Stability** | Changes when we adopt/replace a product or bump a version | Changes only when the *shape* changes (rare) |
| **Mentions vendors?** | Yes — it's the point | Only as "the current adapter behind port X" |

**Rule of thumb:** *if swapping a vendor would change the sentence, it belongs in
`tech stack.md`; if the sentence survives the swap, it belongs in
`architecture.md`.* Example: "Files live in Cloudflare R2, zero-egress, private
bucket" → tech stack. "File bytes go through a `FileStorage` port so the host is
swappable" → architecture. Each doc gets a one-line cross-link to the other at
the top.

### Proposed `architecture.md` outline
1. Purpose & the one-paragraph picture (the diagram in §1)
2. The three tiers and the dependency rule
3. Ports & adapters — current ports and their adapters (table)
4. How each client attaches (web/API/CLI/mobile) — esp. the API-as-contract point
5. Directory layout + path aliases (the §3a tree)
6. Boundary enforcement (the §4 rules)
7. Swap/extension points (the §5 seams)
8. Cross-link to `tech stack.md` for concrete tech choices

## 7. Proposed next steps (on approval)

1. Create `docs/live/architecture.md` from the §6 outline.
2. Add the cross-link line to the top of `tech stack.md`.
3. Scaffold `src/core` and `src/infrastructure`, move `src/db/*` under
   `infrastructure/db/drizzle`, fix `drizzle.config.ts` + imports.
4. Define the first port (`FileRepository`) + Drizzle adapter; route one use case
   (e.g. `archiveFile`) through application → port → adapter end-to-end.
5. Add the ESLint import-boundary rules + `@/core` / `@/infra` aliases.
6. Log the sprint in `docs/sprints/003 dir structure/log.md`.

## Sources (brief best-practice research)

- [Hexagonal Architecture: Ports & Adapters Guide for Modern Apps — talent500](https://talent500.com/blog/hexagonal-architecture-pattern-complete-guide-examples/)
- [Ports & Adapters (Hexagonal) Architecture guide — Alex Rusin](https://blog.alexrusin.com/future-proof-your-code-a-guide-to-ports-adapters-hexagonal-architecture/)
- [Understanding Ports and Adapters in Hexagonal Architecture (TypeScript) — Software Patterns Lexicon](https://softwarepatternslexicon.com/patterns-ts/7/7/2/)
- [Hexagonal architecture (software) — Wikipedia](https://en.wikipedia.org/wiki/Hexagonal_architecture_(software))
- [Turborepo Monorepo in 2025: Next.js + React Native + Shared UI + Type-Safe API](https://medium.com/@MissLucina/turborepo-monorepo-in-2025-next-js-react-native-shared-ui-type-safe-api-%EF%B8%8F-5f79ad6b8095)
- [Turborepo — Next.js guide (official)](https://turborepo.dev/docs/guides/frameworks/nextjs)
