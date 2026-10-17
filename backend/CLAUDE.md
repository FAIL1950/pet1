# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A NestJS backend using Nest CLI **monorepo mode**: four independently buildable/runnable microservices under `services/` (`auth`, `users`, `boards`, `notifications`) plus two shared libraries under `packages/` (`common`, `contracts`), all sharing one root `package.json`/`node_modules`/`bun.lock` via `nest-cli.json`'s `projects` map — there is no default/root app. `users`, `boards` and `notifications` are still empty "Hello World"-style Nest apps (module/controller/service + a root `@Get()` health endpoint). `auth` is implemented (see **Auth service** below). Uses **Bun** as the package manager/runtime (`bun.lock` present) and ESM (`"type": "module"` in package.json) with NodeNext module resolution — relative imports must include the `.js` extension (e.g. `import { AuthService } from './auth.service.js'`), matching what's in every `services/*/src/*.ts` and `packages/*/src/*.ts` file.

### Target architecture (see `SPEC.md`)

None of the below is implemented yet, but it is the intended design and should shape how new code is structured. Read `SPEC.md` in full before building out a feature area — it has the authoritative details (event envelope shape, API examples, topic names, env vars).

- This backend is for a collaborative project-management platform (boards with columns/cards, e.g. Kanban), built as **independently deployable microservices** under `services/` (`auth`, `users`, `boards`, `notifications`) plus shared `packages/` (`common`, `contracts`) — this decomposition now exists as empty scaffolding (see above); the business logic described below is still to be implemented.
- Stack per SPEC: PostgreSQL + TypeORM, Apache Kafka, Better Auth (email/password + OAuth), Kubernetes, Skaffold for local dev/deploy.
- **Kafka is the source of truth for board domain changes** (`BoardCreated`, `CardMoved`, etc.); PostgreSQL holds a rebuildable projection/query store, not the authoritative history. Commands (e.g. `MoveCard`) are validated by a service and turned into events; the frontend never writes to Postgres or Kafka directly.
- Kafka partitioning uses the board/aggregate ID as the key, for in-order processing per board. Consumers must be idempotent (dedupe via `eventId`/version) and handle retries, rebalancing, and graceful shutdown.
- Real-time board updates go out over WebSocket/SSE from a gateway fed by the same Kafka events that update the projection; on reconnect, clients re-fetch the current projection rather than relying on missed real-time messages.
- Registration triggers a `UserRegistered` Kafka event consumed asynchronously by the Notifications Service to send email — registration must not synchronously depend on email delivery succeeding.
- Authorization is role-based per board (`OWNER`/`EDITOR`/`VIEWER`) and enforced server-side, distinct from authentication.

## Commands

- Install deps: `bun install`
- Run a service in watch mode: `bun run start:auth:dev` (also `start:users:dev`, `start:boards:dev`, `start:notifications:dev`) — runs `bun --watch services/<svc>/src/main.ts` directly from TS source, no build step
- Typecheck all services: `bun run typecheck` (`tsc -p services/<svc>/tsconfig.json`, `noEmit`)
- `bun run build:<svc>` (`nest build`) is **not** the run path: Nest CLI's alias rewrite emits ESM-invalid specifiers for `@app/*` imports, so its output breaks for any service importing `packages/*`
- Lint: `bun run lint` (oxlint against `services/` and `packages/`)
- Format: `bun run format` (prettier, single quotes + trailing commas, see `.prettierrc`)
- Unit tests: `bun run test` (vitest run, config `vitest.config.ts`, matches `**/*.spec.ts`)
- Watch unit tests: `bun run test:watch`
- Single test file: `bunx vitest run services/auth/src/auth.controller.spec.ts`
- Coverage: `bun run test:cov`
- Debug tests: `bun run test:debug`
- E2E tests: `bun run test:e2e` (config `vitest.config.e2e.ts`, matches `**/*.e2e-spec.ts` under `test/`)

## Shared packages (`@app/common`, `@app/contracts`)

Services import shared code via the `@app/*` aliases declared in the root `tsconfig.json` `paths` (pointing at `packages/<pkg>/src/index.ts`). This works because services run under **Bun**, which resolves tsconfig `paths` (following `extends` from `services/<svc>/tsconfig.json`) and executes the TS source directly. `@app/*` is usable from any file whose nearest tsconfig extends the root one (`services/*`, `packages/*`). The per-service typecheck configs (`services/<svc>/tsconfig.json`) set `rootDir: "../.."` so `tsc` accepts files from `packages/`. `packages/contracts` holds the `DomainEvent` envelope, Kafka topic names (`topics.ts`) and event contracts (`auth-events.ts` → `UserRegistered`).

## Auth service (`services/auth`)

- Better Auth via `@thallesp/nestjs-better-auth` (`BetterAuthModule.forRoot({ auth })` in `auth.module.ts`, instance in `auth.ts`). Global auth guard is on — mark public routes with `@AllowAnonymous()` (the `GET /` health route used by k8s probes is).
- Routes under `basePath: '/api/auth'` (ingress forwards `/api/auth` unchanged): `sign-up/email`, `sign-in/email`, `sign-in/social` (`provider: "google"`), `callback/google`, `sign-out`, `get-session`.
- Email/password always on; Google OAuth only when both `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set (k8s: Secret `google-oauth` from the gitignored `k8s/google-oauth.secret.yaml` — copy `k8s/google-oauth.secret.yaml.example`; mounted with `optional: true`, so without it Google sign-in is just off). Google Console setup: OAuth client of type *Web application*, redirect URI `http://localhost/api/auth/callback/google` (via ingress; plus `http://localhost:3001/api/auth/callback/google` when running auth outside k8s), and your account added as a test user while the consent screen is in *Testing*. Google accepts `http://` redirect URIs only for `localhost` — that's why the app is served at `http://localhost`, not a custom `.local` host.
- `main.ts` runs Better Auth's `getMigrations(...).runMigrations()` on boot (idempotent; creates `user`/`session`/`account`/`verification`) and creates the app with `bodyParser: false` (the module re-adds parsers for non-auth routes).
- Env (`config.ts`, fail-fast): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `TRUSTED_ORIGINS` (comma list), `KAFKA_BROKERS`, `KAFKA_CLIENT_ID`, optional `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `PORT`. See `services/auth/.env.example`; in k8s they come from `k8s/backend-auth.yaml` (Secret `auth-secrets`) plus the optional `google-oauth` Secret.
- `events/user-registered.hook.ts` (`@DatabaseHook()` + `@AfterCreate('user')`) publishes `UserRegistered` to `auth.events` (key = userId) after email sign-up or first OAuth sign-in. **Consistency window:** the user row is committed before publishing and a failed publish is only logged (registration must not depend on consumers), so such a user gets no event — a transactional outbox is the planned fix.

## Architecture notes

- Vitest (not Jest) is the test runner, configured via `vite-tsconfig-paths` so path aliases declared in `tsconfig.json` (`@app/common`, `@app/contracts`) resolve automatically — unit tests (`vitest.config.ts`, matches `**/*.spec.ts` recursively) and e2e tests (`vitest.config.e2e.ts`, matches `**/*.e2e-spec.ts`, `passWithNoTests: true` since no service has e2e specs yet) are separate configs/entry points, not a single combined run.
- `Dockerfile` builds on `oven/bun:1.4.2`, runs `bun install --frozen-lockfile`, and starts via `bun run start:dev` — **that script no longer exists** after the `services/`/`packages/` monorepo split (see Commands above, now per-service: `start:<name>:dev`). `Dockerfile`/`skaffold.yaml`/`k8s/*.yaml` still need a follow-up (pick one service's `CMD`, or move to one image per service) before `docker build && docker run`/`skaffold dev` will start anything again.
- oxlint is the linter (not ESLint); `oxlint.json` currently disables `@typescript-eslint/no-explicit-any` and warns on `@typescript-eslint/no-floating-promises`.
