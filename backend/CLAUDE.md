# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A NestJS backend using Nest CLI **monorepo mode**: four independently buildable/runnable microservices under `services/` (`auth`, `users`, `boards`, `notifications`) plus two shared libraries under `packages/` (`common`, `contracts`), all sharing one root `package.json`/`node_modules`/`bun.lock` via `nest-cli.json`'s `projects` map — there is no default/root app. Each service is currently just an empty "Hello World"-style Nest app (module/controller/service + a root `@Get()` health endpoint); no business logic, Kafka, TypeORM, or Better Auth wiring exists yet. Uses **Bun** as the package manager/runtime (`bun.lock` present) and ESM (`"type": "module"` in package.json) with NodeNext module resolution — relative imports must include the `.js` extension (e.g. `import { AuthService } from './auth.service.js'`), matching what's in every `services/*/src/*.ts` and `packages/*/src/*.ts` file.

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
- Run a service in watch mode: `bun run start:auth:dev` (also `start:users:dev`, `start:boards:dev`, `start:notifications:dev`)
- Build a service: `bun run build:auth` (nest build auth → `dist/services/auth`; also `build:users`, `build:boards`, `build:notifications`)
- Lint: `bun run lint` (oxlint against `services/` and `packages/`)
- Format: `bun run format` (prettier, single quotes + trailing commas, see `.prettierrc`)
- Unit tests: `bun run test` (vitest run, config `vitest.config.ts`, matches `**/*.spec.ts`)
- Watch unit tests: `bun run test:watch`
- Single test file: `bunx vitest run services/auth/src/auth.controller.spec.ts`
- Coverage: `bun run test:cov`
- Debug tests: `bun run test:debug`
- E2E tests: `bun run test:e2e` (config `vitest.config.e2e.ts`, matches `**/*.e2e-spec.ts` under `test/`)

## Architecture notes

- Vitest (not Jest) is the test runner, configured via `vite-tsconfig-paths` so path aliases declared in `tsconfig.json` (`@app/common`, `@app/contracts`) resolve automatically — unit tests (`vitest.config.ts`, matches `**/*.spec.ts` recursively) and e2e tests (`vitest.config.e2e.ts`, matches `**/*.e2e-spec.ts`, `passWithNoTests: true` since no service has e2e specs yet) are separate configs/entry points, not a single combined run.
- `Dockerfile` builds on `oven/bun:1.4.2`, runs `bun install --frozen-lockfile`, and starts via `bun run start:dev` — **that script no longer exists** after the `services/`/`packages/` monorepo split (see Commands above, now per-service: `start:<name>:dev`). `Dockerfile`/`skaffold.yaml`/`k8s/*.yaml` still need a follow-up (pick one service's `CMD`, or move to one image per service) before `docker build && docker run`/`skaffold dev` will start anything again.
- oxlint is the linter (not ESLint); `oxlint.json` currently disables `@typescript-eslint/no-explicit-any` and warns on `@typescript-eslint/no-floating-promises`.
