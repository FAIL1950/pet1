# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A NestJS backend, currently at the freshly-generated starter stage (single root `AppModule`/`AppController`/`AppService`, no feature modules yet). Uses **Bun** as the package manager/runtime (`bun.lock` present) and ESM (`"type": "module"` in package.json) with NodeNext module resolution — relative imports must include the `.js` extension (e.g. `import { AppService } from './app.service.js'`), matching what's already in `src/app.module.ts`, `src/app.controller.ts`, and `src/main.ts`.

### Target architecture (see `SPEC.md`)

None of the below is implemented yet, but it is the intended design and should shape how new code is structured. Read `SPEC.md` in full before building out a feature area — it has the authoritative details (event envelope shape, API examples, topic names, env vars).

- This backend is for a collaborative project-management platform (boards with columns/cards, e.g. Kanban), built as **independently deployable microservices** under a `services/` directory (suggested: `auth`, `users`, `boards`, `notifications`) plus shared `packages/` (`common`, `contracts`). The current single-`AppModule` layout is pre-decomposition.
- Stack per SPEC: PostgreSQL + TypeORM, Apache Kafka, Better Auth (email/password + OAuth), Kubernetes, Skaffold for local dev/deploy.
- **Kafka is the source of truth for board domain changes** (`BoardCreated`, `CardMoved`, etc.); PostgreSQL holds a rebuildable projection/query store, not the authoritative history. Commands (e.g. `MoveCard`) are validated by a service and turned into events; the frontend never writes to Postgres or Kafka directly.
- Kafka partitioning uses the board/aggregate ID as the key, for in-order processing per board. Consumers must be idempotent (dedupe via `eventId`/version) and handle retries, rebalancing, and graceful shutdown.
- Real-time board updates go out over WebSocket/SSE from a gateway fed by the same Kafka events that update the projection; on reconnect, clients re-fetch the current projection rather than relying on missed real-time messages.
- Registration triggers a `UserRegistered` Kafka event consumed asynchronously by the Notifications Service to send email — registration must not synchronously depend on email delivery succeeding.
- Authorization is role-based per board (`OWNER`/`EDITOR`/`VIEWER`) and enforced server-side, distinct from authentication.

## Commands

- Install deps: `bun install`
- Run dev server (watch mode): `bun run start:dev`
- Build: `bun run build` (nest build → `dist/`)
- Lint: `bun run lint` (oxlint against `src/` and `test/`)
- Format: `bun run format` (prettier, single quotes + trailing commas, see `.prettierrc`)
- Unit tests: `bun run test` (vitest run, config `vitest.config.ts`, matches `**/*.spec.ts`)
- Watch unit tests: `bun run test:watch`
- Single test file: `bunx vitest run src/app.controller.spec.ts`
- Coverage: `bun run test:cov`
- Debug tests: `bun run test:debug`
- E2E tests: `bun run test:e2e` (config `vitest.config.e2e.ts`, matches `**/*.e2e-spec.ts` under `test/`)

## Architecture notes

- Vitest (not Jest) is the test runner, configured via `vite-tsconfig-paths` so any path aliases added later through `nest g library` resolve automatically — unit tests (`vitest.config.ts`) and e2e tests (`vitest.config.e2e.ts`) are separate configs/entry points, not a single combined run.
- `Dockerfile` exists but is currently empty.
- oxlint is the linter (not ESLint); `oxlint.json` currently disables `@typescript-eslint/no-explicit-any` and warns on `@typescript-eslint/no-floating-promises`.
