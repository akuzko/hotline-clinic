# Hotline Clinic: Architecture

> How the pieces from [05-technical-spec.md](05-technical-spec.md) fit together in code. The spec says _what_; this doc says _where_ and _why it's shaped this way_.
> Status: **scaffold**. The realtime path works end to end. The data model, booking, auth and admin are not built yet.

## Overview

```
 Patient phone / Reception / Admin (browser)
        │  HTTPS, same origin
        ▼
 ┌──────────────────────── apps/api (Fastify) ─────────────────────────┐
 │  /trpc/*  queries & mutations (httpBatchLink)                       │
 │  /trpc/availability.onChange  SSE stream (httpSubscriptionLink)     │
 │  /healthz                                                           │
 │                                                                     │
 │  tRPC router ──► Drizzle (pool, max 10) ──────────┐                 │
 │       ▲                                           │ writes +        │
 │       │ async iterator                            │ pg_notify in tx │
 │  RealtimeHub ◄── dedicated LISTEN connection ◄──┐ │                 │
 │  (EventEmitter fan-out)                         │ │                 │
 │  Sweeper (planned, 5 s, advisory lock) ─────────┼─┤                 │
 └─────────────────────────────────────────────────┼─┼─────────────────┘
                                                   │ ▼
                                             ┌─────────────┐
                                             │ PostgreSQL  │ source of truth
                                             │             │ + pub/sub channel
                                             └─────────────┘
```

In production, one Fastify process serves both the API and the built web app (static files; planned for the shipping step). The browser only ever talks to one origin, so there's no CORS setup and no cookie problems.

## Repository layout

npm workspaces. pnpm was the original plan; see _Deviations_ below.

```
apps/
  api/                 Fastify + tRPC server
    src/
      index.ts         process entry: env, DB, hub, listen, graceful shutdown
      server.ts        buildServer(deps): Fastify app, used by tests too
      env.ts           zod-validated environment
      db/              postgres.js client, Drizzle schema (empty), migrator
      realtime/hub.ts  notifyAvailability() + RealtimeHub (LISTEN → subscribers)
      trpc/            initTRPC (SSE ping config) and the app router
    drizzle/           generated SQL migrations (reviewed by a human)
    scripts/notify.ts  dev helper: fire a NOTIFY by hand
    test/              Vitest integration tests against real Postgres
  web/                 React + Vite SPA (patient, reception and admin routes)
    src/trpc.ts        tRPC client: splitLink → SSE for subscriptions, batch for the rest
packages/
  shared/              zod schemas and types shared by api and web (specialties, event payloads)
```

The web app imports **only the type** of the router (`@hotline/api/router`). No server code ends up in the browser bundle.

## Realtime path

1. A write (hold, confirm, cancel, expire, no-show, doctor change) calls `notifyAvailability(tx, {specialty, date})` **inside its transaction**. Postgres delivers NOTIFY only on commit, so a rolled-back write is never announced. An integration test covers this.
2. Each API process has one `RealtimeHub`. It holds a **dedicated LISTEN connection** (postgres.js `sql.listen`), separate from the query pool. This is why `DATABASE_URL` must be a direct connection, not a transaction pooler.
3. The hub fans events out to every open SSE stream through an in-memory `EventEmitter`. Each `availability.onChange({specialty})` subscription filters to its specialty.
4. The browser treats each event as **"your data is out of date"** and fetches `availability.list` again. Events never carry slot details or personal data (CLAUDE.md, rule 4).
5. **Recovery:**
   - **The server's LISTEN connection reconnects** (postgres.js does this automatically): the hub sends `{type:'resync'}`, which tells every client to refetch, because notifications may have been lost.
   - **The browser's SSE stream reconnects:** the client refetches when its status returns to _pending_ (live).
   - **A stream goes quiet:** a ping every 15 s, plus a client reconnect after 20 s without any data, catches streams that died without closing.

None of these involve polling. Refetching happens only as a reaction to an event.

**Scaling:** each instance listens on its own, and Postgres sends every NOTIFY to all listeners, so this works with more than one instance and no Redis. The cost is one extra Postgres connection per instance.

## Correctness lives in Postgres

| Rule                                       | Mechanism                                                                                  | Not                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------- |
| No double booking                          | partial unique index `(doctor_id, starts_at)` for active statuses                          | an app-level "check, then insert"         |
| One active booking per phone per specialty | partial unique index                                                                       | app checks (used only for nicer messages) |
| Hold expiry, no-shows                      | `hold_expires_at` / `starts_at` compared with `now()` in SQL; the sweeper only _tidies up_ | timers in the Node process                |
| Unique confirmation code per day           | partial unique index; retry with a new code on conflict                                    | —                                         |

The **sweeper** (planned) runs every 5 s, only when it gets `pg_try_advisory_lock`, so one instance does the work. A booking attempt also expires any out-of-date hold on its target slot in the same transaction, so correctness never waits for the sweeper.

## Time

All schedule math happens in the **clinic's time zone** from `settings`. "Today" and "tomorrow" are clinic dates (`YYYY-MM-DD`). Timestamps are stored as `timestamptz`. Planned helpers will turn a clinic date plus a wall-clock time into an instant in one place, with tests around midnight and daylight-saving changes.

## Testing

| Layer                                                                         | Tool                 | Runs against                                      |
| ----------------------------------------------------------------------------- | -------------------- | ------------------------------------------------- |
| Pure logic (slot generation, code alphabet)                                   | Vitest unit          | nothing                                           |
| API and database rules (concurrency, NOTIFY, expiry)                          | Vitest integration   | real Postgres in Docker (`hotline_test` database) |
| Acceptance tests involving browsers (realtime in two browsers, Slow 3G phone) | Playwright (planned) | full stack                                        |

Current tests: `health.test.ts`, and `realtime.test.ts`, which covers NOTIFY → SSE delivery under 2 s, filtering by specialty, rolled-back changes not being announced, and unknown specialties being rejected.

## Dependencies and versions

- Versions are pinned exactly (`save-exact`), and `.npmrc` sets `before=` to a date at least 7 days old. Newly published versions get a cooling-off period before they can be installed. Move the date forward on purpose when upgrading.
- Runtime: Node 24 (`.node-version`). The API runs TypeScript with `tsx`, so there's no build step yet. Adding a bundled build can wait until shipping.

## Deviations from the spec (for review)

1. **npm workspaces instead of pnpm.** On this machine, asdf has no pnpm version set and corepack can't run pnpm 12. npm needs no extra tooling, and you already use it in other projects. Switching later is cheap.
2. **postgres.js instead of `pg`.** Its built-in `sql.listen` handles the dedicated connection and reconnecting, which removes the hardest part of the realtime plumbing. Drizzle supports it directly.
3. **No ESLint yet.** For now: Prettier plus `tsc` type checking. ESLint can be added once typescript-eslint officially supports TypeScript 7.

## Not built yet (next steps, each its own reviewed step)

1. Data model and first migration (`doctors`, `settings`, `bookings`, `users`, `otp_challenges`, `email_confirmations`) plus seed data.
2. Slot generation and `availability.list`, with time zone tests.
3. Hold → OTP → confirm, cancel, the sweeper (AT-3 to AT-7).
4. Patient UI, the design step. Open question: plain CSS or Tailwind.
5. Accounts, email confirmation, admin with Basic auth, reception check-in.
6. Playwright, Dockerfile, CI, Render.
