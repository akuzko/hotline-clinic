# Hotline Clinic

**Hotline** = **HOT**fix + on**LINE**.

Urgent same-day clinic booking with **live availability**. A patient with an injury, a sick child, or who's feeling unwell picks their situation, sees the **earliest bookable time** with the right specialist (traumatologist, pediatrician or general practitioner), and secures it before leaving home. Taken, cancelled and freed slots update on every open screen in real time, with no polling.

This is the course project for Anthropic's _AI Fluency for Builders_. The course's "clinic wait time" exercise is reframed here as urgent booking. The reasons are in the [problem brief](docs/01-problem-brief.md).

> **Status:** early scaffold. The realtime pipeline (Postgres → SSE → browser) works end to end. The data model, booking flow, accounts and admin panel are not built yet. See [Roadmap](#roadmap).

## Features (planned)

- **Three situations, not specialist titles:** _Injury_, _Sick child_, _Feeling unwell_.
- **Nearest slot in two taps**, for today and tomorrow, across all doctors of the matching specialty.
- **Anonymous booking:** name and phone, an SMS code, then a short confirmation code to show at reception. A slot is held the moment booking starts and released if it isn't confirmed within 3 minutes.
- **Optional accounts** (phone plus SMS, with optional email) for one-tap booking and visit history.
- **Cancel by code.** No-shows are released automatically after 15 minutes.
- **Admin panel** (HTTP Basic auth): doctors, working hours, booking rules, reception check-in.
- **Safety first:** an emergency notice is always visible, and no medical data is ever stored.

## Tech stack

| Layer    | Choice                                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------------------------- |
| API      | [Fastify](https://fastify.dev) + [tRPC v11](https://trpc.io) (SSE subscriptions)                                  |
| Database | PostgreSQL 18 with [Drizzle ORM](https://orm.drizzle.team) on [postgres.js](https://github.com/porsager/postgres) |
| Realtime | Postgres `LISTEN/NOTIFY` → tRPC SSE stream → client refetches                                                     |
| Web      | React 19 + Vite + TanStack Query                                                                                  |
| Shared   | zod schemas in `packages/shared`                                                                                  |
| Tests    | Vitest (integration tests against real Postgres); Playwright planned                                              |
| Tooling  | Node 24, npm workspaces, TypeScript, Prettier, Docker Compose                                                     |

How the pieces fit together and why: [docs/06-architecture.md](docs/06-architecture.md).

## Getting started

### Prerequisites

- **Node.js 24.11+** (see `.node-version`)
- **Docker** with Compose, for PostgreSQL

### Setup

```sh
git clone https://github.com/akuzko/hotline-clinic.git
cd hotline-clinic
cp .env.example .env
npm install
npm run db:up     # Postgres on localhost:5434 (databases: hotline, hotline_test)
npm run dev       # API on :3000, web on :5173
```

Open http://localhost:5173. To see live updates arrive, choose _Feeling unwell_, then in another terminal run:

```sh
npm run notify --workspace @hotline/api -- gp
```

### Environment variables

| Variable                       | Description                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `PORT`                         | API port (default `3000`)                                                                                                      |
| `DATABASE_URL`                 | Postgres connection string. Must be a **direct** connection (not a transaction pooler), because `LISTEN` needs a real session. |
| `TEST_DATABASE_URL`            | Database used by integration tests                                                                                             |
| `ADMIN_USER`, `ADMIN_PASSWORD` | HTTP Basic auth credentials for the admin panel (password: 8+ characters)                                                      |

## Scripts

| Command                               | What it does                                      |
| ------------------------------------- | ------------------------------------------------- |
| `npm run dev`                         | Start the API (tsx watch) and web (Vite) together |
| `npm test`                            | Run the Vitest suites (needs `npm run db:up`)     |
| `npm run typecheck`                   | Type-check all workspaces                         |
| `npm run build`                       | Build the web app                                 |
| `npm run format` / `format:check`     | Prettier                                          |
| `npm run db:up` / `db:down`           | Start or stop Postgres in Docker                  |
| `npm run db:generate -w @hotline/api` | Generate a migration from the Drizzle schema      |
| `npm run db:migrate -w @hotline/api`  | Apply migrations                                  |

## Project structure

```
apps/
  api/          Fastify + tRPC server, Drizzle schema & migrations, realtime hub, tests
  web/          React + Vite SPA (patient, reception, admin)
packages/
  shared/       zod schemas and types shared by api and web
docs/           problem brief, delegation plan, acceptance tests, spec, architecture
```

## Documentation

| Doc                                                   | Contents                                                              |
| ----------------------------------------------------- | --------------------------------------------------------------------- |
| [Problem brief](docs/01-problem-brief.md)             | Users, needs, constraints, and the reframe from wait times to booking |
| [Delegation plan](docs/02-delegation-plan.md)         | What AI does and what the builder owns at each stage                  |
| [Acceptance tests](docs/03-acceptance-tests.md)       | The definition of done, in testable terms                             |
| [Product requirement](docs/04-product-requirement.md) | Scope, with every adjective replaced by a number                      |
| [Technical spec](docs/05-technical-spec.md)           | Components, data model, realtime, timers, security                    |
| [Architecture](docs/06-architecture.md)               | How it's built and why                                                |
| [Decisions](docs/README.md)                           | Confirmed decisions and what's out of scope                           |

## Roadmap

1. Data model, first migration, seed data
2. Slot generation and the `availability.list` query, with time zone handling
3. Hold → SMS code → confirm, cancel, background clean-up of expired holds and no-shows
4. Patient UI design
5. Accounts and email confirmation, admin panel, reception check-in
6. Playwright acceptance tests, Docker image, CI, deployment to Render

## Contributing

This is a course project built in a plan → approve → build → review loop with [Claude Code](https://claude.com/claude-code). [`CLAUDE.md`](CLAUDE.md) holds the working agreement and the rules that must always hold: no double booking, no medical data, SMS verification for anything involving a phone number, no polling.

## License

Code: [MIT](LICENSE).

The exercise prompts come from _AI Fluency for Builders_, © 2026 Anthropic, developed with CodePath and based on the AI Fluency Framework by Prof. Rick Dakan and Prof. Joseph Feller. The course is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Course materials are not included in this repository.
