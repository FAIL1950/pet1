# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A NestJS backend using Nest CLI **monorepo mode**: three independently buildable/runnable microservices under `services/` (`auth`, `boards`, `notifications`) plus two shared libraries under `packages/` (`common`, `contracts`), all sharing one root `package.json`/`node_modules`/`bun.lock` via `nest-cli.json`'s `projects` map — there is no default/root app. `auth` is implemented (see **Auth service** below); `boards` can create boards (see **Boards service** below); both publish events through a transactional outbox (see **Outbox** below); `notifications` sends verification emails (see **Notifications service** below). Postgres schemas and migrations exist for all three (see **Databases and migrations** below). Uses **Bun** as the package manager/runtime (`bun.lock` present) and ESM (`"type": "module"` in package.json) with NodeNext module resolution — relative imports must include the `.js` extension (e.g. `import { AuthService } from './auth.service.js'`), matching what's in every `services/*/src/*.ts` and `packages/*/src/*.ts` file.

### Target architecture (see `SPEC.md`)

None of the below is implemented yet, but it is the intended design and should shape how new code is structured. Read `SPEC.md` in full before building out a feature area — it has the authoritative details (event envelope shape, API examples, topic names, env vars).

- This backend is for a collaborative project-management platform (boards with columns/cards, e.g. Kanban), built as **independently deployable microservices** under `services/` (`auth`, `boards`, `notifications`) plus shared `packages/` (`common`, `contracts`) — this decomposition now exists as empty scaffolding (see above); the business logic described below is still to be implemented.
- Stack per SPEC: PostgreSQL + TypeORM, Apache Kafka, Better Auth (email/password + OAuth), Kubernetes, Skaffold for local dev/deploy.
- **PostgreSQL is the source of truth**; Kafka propagates domain events (`BoardCreated`, `CardMoved`, etc.) to other services. A command (e.g. `MoveCard`) is validated and applied in one Postgres transaction that also writes its event to the `outbox` table; the frontend never writes to Postgres or Kafka directly.
- Kafka partitioning uses the board/aggregate ID as the key, for in-order processing per board. Consumers must be idempotent (dedupe via `eventId`/version) and handle retries, rebalancing, and graceful shutdown.
- Real-time board updates go out over WebSocket/SSE from a gateway fed by `board.events`; on reconnect, clients re-fetch the current board state rather than relying on missed real-time messages.
- Email sending is asynchronous: `auth` publishes `EmailVerificationRequested` (outbox → `auth.events`) and the Notifications Service delivers it — registration never depends on email delivery succeeding.
- Authorization is role-based per board (`OWNER`/`EDITOR`/`VIEWER`) and enforced server-side, distinct from authentication.

## Commands

- Install deps: `bun install`
- Run a service in watch mode: `bun run start:auth:dev` (also `start:boards:dev`, `start:notifications:dev`) — runs `bun --watch services/<svc>/src/main.ts` directly from TS source, no build step
- Typecheck all services: `bun run typecheck` (`tsc -p services/<svc>/tsconfig.json`, `noEmit`)
- `bun run build:<svc>` (`nest build`) is **not** the run path: Nest CLI's alias rewrite emits ESM-invalid specifiers for `@app/*` imports, so its output breaks for any service importing `packages/*`
- Lint: `bun run lint` (oxlint against `services/` and `packages/`)
- Format: `bun run format` (prettier, single quotes + trailing commas, see `.prettierrc`)
- Unit tests: `bun run test` (vitest run, config `vitest.config.ts`, matches `**/*.spec.ts`)
- Watch unit tests: `bun run test:watch`
- Single test file: `bunx vitest run services/auth/src/auth.controller.spec.ts`
- Migrations: `bun run migration:run:<svc>` / `migration:revert:<svc>` / `migration:generate:<svc> services/<svc>/src/database/migrations/<Name>` for `boards` and `notifications` (TypeORM CLI run by Bun against `services/<svc>/src/database/data-source.ts`; needs `DATABASE_URL`)
- Coverage: `bun run test:cov`
- Debug tests: `bun run test:debug`
- E2E tests: `bun run test:e2e` (config `vitest.config.e2e.ts`, matches `**/*.e2e-spec.ts` under `test/`)

## Shared packages (`@app/common`, `@app/contracts`)

Services import shared code via the `@app/*` aliases declared in the root `tsconfig.json` `paths` (pointing at `packages/<pkg>/src/index.ts`). This works because services run under **Bun**, which resolves tsconfig `paths` (following `extends` from `services/<svc>/tsconfig.json`) and executes the TS source directly. `@app/*` is usable from any file whose nearest tsconfig extends the root one (`services/*`, `packages/*`). The per-service typecheck configs (`services/<svc>/tsconfig.json`) set `rootDir: "../.."` so `tsc` accepts files from `packages/`. `packages/contracts` holds the `DomainEvent` envelope, Kafka topic names (`topics.ts`) and event contracts (`auth-events.ts` → `UserRegistered`, `board-events.ts` → `BoardCreated`). `packages/common` holds `requireEnv`/`optionalEnv`/`listEnv`, `KafkaProducerService` (configured per service via the `KAFKA_OPTIONS` provider token), `OutboxRelay` + `toOutboxMessage` (see **Outbox** below), `ZodValidationPipe` (request validation → 400 with `issues`) and `JwtAuthGuard` + `@CurrentUser()` (`auth/`, configured via the `JWT_AUTH_OPTIONS` provider token — see **Service authentication** below).

## Data access: repositories only

- **All database access goes through repository classes** in `src/database/repositories/*.repository.ts` of each service (`@Injectable()`, registered in the service module). Services, controllers, Kafka handlers, Better Auth hooks and `OutboxRelay` never touch `DataSource`, `EntityManager`, query builders, raw SQL, the `pg` pool or Better Auth's adapter directly — they call repository methods named after the operation (`createWithOwner`, `upsert`, `insertIfMissing`, …), not generic CRUD.
- Transactions live in repositories. A write that spans several tables (e.g. board + member + outbox) is one repository method that opens the transaction; repositories it reuses inside take an optional `manager: EntityManager` parameter to join it (`UsersRepository.insertIfMissing(user, manager)`, `OutboxMessagesRepository.add(events, manager)`).
- Every state change that emits events takes them as an argument (`events: OutboxMessage[]` built with `toOutboxMessage`) and writes them in the same transaction — callers build events, repositories persist them.
- Current repositories: boards — `BoardsRepository` (create + member reads), `BoardContentRepository` (columns/cards), `BoardMembersRepository` (membership), `BoardWriteRunner` (`board-write.ts`: the shared board write transaction — row lock + role check, then version bump + outbox only if the change returned `ok`; results `ok | forbidden | not_found | conflict(reason)`, mapped to HTTP by `boards/board-write-result.ts`), `UsersRepository`, `OutboxMessagesRepository`; auth — `OutboxMessagesRepository` (Better Auth adapter, see **Auth service**); shared — `OutboxRepository` (`@app/common`, the relay's read/delete SQL over the service's `OUTBOX_STORE`). Unit-test services against mocked repositories and repositories against a mocked `DataSource`/`EntityManager`.

## Databases and migrations

- Database-per-service: each service connects only to its own Postgres DB via `DATABASE_URL` (fail-fast `config.ts` using `requireEnv` from `@app/common`). Schema per DB is described in `SPEC.md` §9.
- `boards` / `notifications`: TypeORM. Layout per service: `src/database/entities/*.entity.ts`, `src/database/migrations/<timestamp>-<Name>.ts`, `src/database/options.ts` (shared `DataSourceOptions`), `src/database/data-source.ts` (CLI entry only). Entities and migrations are listed **explicitly** in `options.ts` (no globs) — register each new migration class there. `synchronize` is off.
- Migrations run on service boot (`TypeOrmModule.forRoot({ ...dataSourceOptions, migrationsRun: true })`, `migrationsTransactionMode: 'all'` — a failed migration rolls back and the pod crash-loops). With more than one replica, move this to a k8s Job before rollout (an initContainer would still race per pod).
- Workflow: change entities → `migration:generate:<svc>` against a DB at the current schema → review the SQL → register the class in `options.ts`. Snake_case column names are set explicitly in the entities; relations use `Relation<>` (ESM).
- `uuidExtension: 'pgcrypto'` → generated uuids use built-in `gen_random_uuid()`; service roles aren't superusers, so `uuid-ossp` can't be installed.
- `columns.position` / `cards.position` are fractional-index keys: generate them only with `positionBetween()` from `services/boards/src/database/position.ts` (`fractional-indexing`); the columns use `COLLATE "C"` so SQL ordering matches JS string comparison.
- `auth` keeps Better Auth's own schema management (see below).

## Boards service (`services/boards`)

- `POST /api/boards` (`boards/boards-api.controller.ts`; the ingress forwards `/api/boards` unchanged, so routes carry the full prefix — the health `GET /` stays unprefixed for k8s probes). Body `{ title, description? }` validated by zod (`boards/create-board.schema.ts`). Returns `201 { id, title, description, role, createdAt }`.
- Auth: `@UseGuards(JwtAuthGuard)` from `@app/common` (see **Service authentication** below); read the user with `@CurrentUser()` (`AuthUser`).
- Reads (`boards/board-queries.service.ts` → `BoardsRepository`): `GET /api/boards` (boards the caller is a member of) and `GET /api/boards/:boardId` (board + columns + cards; `404` for non-members, so ids don't leak). Response shapes and mapping live in `boards/board.dto.ts`.
- Columns/cards: create (`POST …/columns`, `POST …/columns/:columnId/cards`), edit (`PATCH …/columns/:columnId`, `PATCH …/cards/:cardId`), move (`POST …/columns/:columnId/move` `{ afterColumnId }`, `POST …/cards/:cardId/move` `{ columnId, afterCardId }` — neighbour ids, null = first) and delete (`DELETE`, `204`); zod: `create-column.schema.ts`, `create-card.schema.ts` (also used for PATCH), `move.schema.ts`. Event factories live in `boards/board-events.ts`. Each command → `BoardCommandsService` → a `BoardContentRepository` method: one transaction that locks the board row (`FOR UPDATE`, joined with `board_members` = access check), returns `forbidden`/`not_found` (mapped to 403/404) unless the role is in `allowedRoles` (`CONTENT_EDITOR_ROLES` = OWNER, EDITOR), changes the item (new items go to the end; moves go between the neighbour and the next item — `positionAfter()`, `positionBetween`), bumps `boards.version` and writes the events built by the service's `toEvents(written, version)` callback (`Column…`/`Card…` `Created|Updated|Moved|Deleted`).
- Members (`boards/members/`: controller `api/boards/:boardId/members`, `BoardMembersService`, `members.schema.ts`) → `BoardMembersRepository`: list for any member; add by email (normalized lowercase, looked up in the `users` projection → `422` if missing, `409` if already a member), change role and remove — OWNER only, roles EDITOR/VIEWER, the OWNER itself can't be changed or removed (`409`); a non-OWNER may remove themselves (leave). Events `BoardMember{Added,RoleChanged,Removed}`.
- Command flow (`boards/board-commands.service.ts`): builds `BoardCreated` and calls `BoardsRepository.createWithOwner` — one transaction: insert-or-ignore the caller's `users` row from the JWT claims (in case `UserRegistered` isn't consumed yet), insert `boards` (version 1) and `board_members` OWNER, write the event to `outbox`; answer `201` with the board.
- Users projection (`projection/`): `UsersProjectionConsumer` (kafkajs, group `KAFKA_GROUP_ID` = `boards-projection`, subscribes to `auth.events`, `fromBeginning` for a new group) → `UsersProjectionHandler`: `UserRegistered` → `UsersRepository.upsert`. Offsets commit after a message is applied → at-least-once. **Gap:** a message that keeps failing is retried forever (no dead-letter topic yet).
- Env (`config.ts`): `DATABASE_URL`, `AUTH_JWKS_URL`, `AUTH_JWT_ISSUER` (optional `AUTH_JWT_AUDIENCE`, defaults to the issuer), `KAFKA_BROKERS`, `KAFKA_CLIENT_ID`, `KAFKA_GROUP_ID`, `PORT` — see `services/boards/.env.example` and `k8s/backend-boards.yaml`.

## Auth service (`services/auth`)

- Better Auth via `@thallesp/nestjs-better-auth` (`BetterAuthModule.forRoot({ auth })` in `auth.module.ts`, instance in `auth.ts`). Global auth guard is on — mark public routes with `@AllowAnonymous()` (the `GET /` health route used by k8s probes is).
- Routes under `basePath: '/api/auth'` (ingress forwards `/api/auth` unchanged): `sign-up/email`, `sign-in/email`, `sign-in/social` (`provider: "google"`), `callback/google`, `sign-out`, `get-session`, plus `token` and `jwks` from the `jwt` plugin (see **Service authentication** below).
- Email verification (`auth.ts`): `requireEmailVerification: true` (sign-in → `403 EMAIL_NOT_VERIFIED` until verified), `sendOnSignUp`, `sendOnSignIn` (a fresh link on each blocked sign-in), `autoSignInAfterVerification`, links valid 24 h. `sendVerificationEmail` doesn't send: `events/email-verification.ts` writes `EmailVerificationRequested { userId, email, name, url }` to the outbox (the notifications service sends it). Google OAuth users arrive verified.
- Email/password always on; Google OAuth only when both `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set (k8s: Secret `google-oauth` from the gitignored `k8s/google-oauth.secret.yaml` — copy `k8s/google-oauth.secret.yaml.example`; mounted with `optional: true`, so without it Google sign-in is just off). Google Console setup: OAuth client of type *Web application*, redirect URI `http://localhost/api/auth/callback/google` (via ingress; plus `http://localhost:3001/api/auth/callback/google` when running auth outside k8s), and your account added as a test user while the consent screen is in *Testing*. Google accepts `http://` redirect URIs only for `localhost` — that's why the app is served at `http://localhost`, not a custom `.local` host.
- `main.ts` runs Better Auth's `getMigrations(...).runMigrations()` on boot (idempotent; creates `user`/`session`/`account`/`verification`/`jwks`) and creates the app with `bodyParser: false` (the module re-adds parsers for non-auth routes).
- Env (`config.ts`, fail-fast): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `TRUSTED_ORIGINS` (comma list), `KAFKA_BROKERS`, `KAFKA_CLIENT_ID`, optional `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `PORT`. See `services/auth/.env.example`; in k8s they come from `k8s/backend-auth.yaml` (Secret `auth-secrets`) plus the optional `google-oauth` Secret.
- `events/user-registered.hook.ts` (`@DatabaseHook()` + `@BeforeCreate('user')`) writes `UserRegistered` (incl. `image` avatar URL; key = userId) to the `outbox` table on email sign-up or first OAuth sign-in. Better Auth runs `create.before` hooks inside its sign-up transaction (`create.after` hooks run after commit), so the hook assigns the user id itself and writes via `OutboxMessagesRepository.add` (`database/repositories/`), which uses `getCurrentAdapter(...)` — the transaction-bound adapter — so the user row and the event commit together. The `outbox` table is declared by `database/outbox.plugin.ts` (a Better Auth plugin schema, created by `getMigrations`). Registration doesn't depend on Kafka: the relay delivers the event later.

## Outbox

- Each publishing service has an `outbox` table (`id` = `eventId`, `topic`, `key`, `event_type`, `event` = serialized envelope, `created_at`): boards via a TypeORM entity + migration, auth via the Better Auth plugin above. Write rows only with `toOutboxMessage(topic, event)` from `@app/common`, in the same transaction as the state change.
- `OutboxRelay` (`packages/common/src/outbox/`) runs inside each service (`OnApplicationBootstrap`): per tick, in one transaction, it takes `pg_try_advisory_xact_lock` (one relay per DB across replicas → per-key order), reads up to 100 rows by `created_at`, sends them with `KafkaProducerService.sendBatch` and deletes them — the SQL lives in `OutboxRepository.processBatch`. Idle poll 250 ms, backoff 1–30 s on errors; it stops in `beforeApplicationShutdown`, before the producer disconnects.
- Each service provides `OUTBOX_STORE` (`OutboxStore.withTransaction`, the connection `OutboxRepository` runs on) and registers `OutboxRepository` + `OutboxRelay`: `database/outbox-store.ts` (TypeORM) in boards, `database/outbox-store.ts` (`pg` pool exported from `auth.ts`) in auth.
- Delivery is at least once (crash between send and delete → resend); consumers must be idempotent.

## Notifications service (`services/notifications`)

- Sends the email-verification email; several replicas (`replicas: 2` in k8s). `events/auth-events.consumer.ts` consumes `auth.events` in group `KAFKA_GROUP_ID` (`notifications`, `fromBeginning: false`) — Kafka gives each partition (3) to one replica, so every event is handled once. `events/handle-auth-event.ts`: `EmailVerificationRequested` → `DeliveryService.request`; other events are ignored.
- `deliveries/delivery.service.ts`: `request()` claims the delivery in `email_deliveries` (`EmailDeliveriesRepository.claim`: insert-or-ignore on `(source_event_id, kind)` → a redelivered event sends nothing) and sends right away; `deliver()` renders the template by `kind`, sends via `EMAIL_SENDER`, and records `SENT` (payload cleared — the link carries a token), a retry (`next_attempt_at` after 1 min / 5 min / 15 min / 1 h / 3 h) or `FAILED` after the last one. Never logs the payload.
- No locks while sending: a claim sets `next_attempt_at = now + 5 min` as a lease; `deliveries/retry.worker.ts` (every replica, every 30 s) leases due `PENDING` rows with `UPDATE … WHERE id IN (… FOR UPDATE SKIP LOCKED) RETURNING` and redelivers them — failed sends and ones whose sender crashed after claiming.
- `email/email-sender.ts` (`EmailSender` + `EMAIL_SENDER`, SPEC §21) → `email/smtp-email-sender.ts` (nodemailer; Gmail `smtp.gmail.com:465` with an app password). Templates in `email/templates/` (`verify-email.ts`: Ukrainian + English, HTML-escaped).
- Env (`config.ts`): `DATABASE_URL`, `KAFKA_BROKERS`, `KAFKA_CLIENT_ID`, `KAFKA_GROUP_ID`, optional `SMTP_HOST`, `SMTP_PORT` (465), `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`. In k8s the SMTP values come from Secret `smtp` (gitignored `k8s/smtp.secret.yaml`, template `k8s/smtp.secret.yaml.example`, mounted `optional: true`); without it sends fail with "SMTP is not configured" and wait for retries.

## Service authentication

- Only `auth` reads sessions. Other services never call it per request: the browser gets a short-lived access token (JWT, 15 min, signed with the `jwks` table's EdDSA key) from `GET /api/auth/token` (session cookie required) and sends it as `Authorization: Bearer`.
- Claims (`auth.ts` → `jwt({ definePayload })`): `sub` = user id, `email`, `name`, `image`; `iss`/`aud` = `BETTER_AUTH_URL` (`http://localhost` in k8s).
- `JwtAuthGuard` (`packages/common/src/auth/jwt-auth.guard.ts`) verifies signature/`exp`/`iss`/`aud` locally with `jose`; public keys come from `AUTH_JWKS_URL` (`http://auth/api/auth/jwks` in k8s), fetched once per process and re-fetched only for an unknown `kid`. Missing/invalid/expired token → 401; keys unreachable → 503 (not 401).
- Trade-off: sign-out doesn't revoke an already issued token — it stays valid until `exp` (≤ 15 min).
- `zod` is pinned via `overrides` in `package.json`: a second zod copy under `better-auth` breaks `tsc` on the inferred type of `auth` (TS2883). If that error reappears after an upgrade, also delete the stale `dist/services/*/tsconfig.tsbuildinfo`.

## Architecture notes

- Vitest (not Jest) is the test runner, configured via `vite-tsconfig-paths` so path aliases declared in `tsconfig.json` (`@app/common`, `@app/contracts`) resolve automatically — unit tests (`vitest.config.ts`, matches `**/*.spec.ts` recursively) and e2e tests (`vitest.config.e2e.ts`, matches `**/*.e2e-spec.ts`, `passWithNoTests: true` since no service has e2e specs yet) are separate configs/entry points, not a single combined run.
- `Dockerfile` builds on `oven/bun:1.4.2`, runs `bun install --frozen-lockfile`, and starts via `bun run start:dev` — **that script no longer exists** after the `services/`/`packages/` monorepo split (see Commands above, now per-service: `start:<name>:dev`). `Dockerfile`/`skaffold.yaml`/`k8s/*.yaml` still need a follow-up (pick one service's `CMD`, or move to one image per service) before `docker build && docker run`/`skaffold dev` will start anything again.
- oxlint is the linter (not ESLint); `oxlint.json` currently disables `@typescript-eslint/no-explicit-any` and warns on `@typescript-eslint/no-floating-promises`.
