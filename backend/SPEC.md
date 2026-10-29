# Backend Specification

## 1. Overview

Build the backend for a collaborative project-management platform.

The backend must be implemented **exclusively in TypeScript** using:

- NestJS
- TypeScript
- PostgreSQL
- TypeORM
- Apache Kafka
- Better Auth
- Kubernetes
- Skaffold

The backend follows a **microservice architecture**.

PostgreSQL is the **source of truth** for each service's data. Every domain change is also published as an event to Kafka through a **transactional outbox** (the state change and its event commit together), so other services and the real-time layer can react to it.

---

## 2. Main Responsibilities

The backend is responsible for:

- Authentication and authorization.
- OAuth authentication.
- User management.
- Sending registration emails.
- Board access management.
- Board operations.
- Publishing and consuming domain events through Kafka.
- Maintaining local PostgreSQL projections of other services' data (e.g. users in the boards DB).
- Providing APIs for the frontend.
- Providing real-time board updates.
- Running in Kubernetes through Skaffold.

---

## 3. Suggested Microservices

The implementation should be split into independently deployable services.

A reasonable initial decomposition is:

```text
backend/
  services/
    auth/
    boards/
    notifications/
  packages/
    common/
    contracts/
```

The exact service boundaries may evolve, but the architecture must preserve independent service responsibilities.

### Auth Service

Responsibilities:

- Better Auth integration.
- Registration.
- Login.
- OAuth.
- Session management.
- Authentication-related persistence.
- User profile data (stored in Better Auth's `user` table, extended via `additionalFields` when needed).
- Publishing user lifecycle events (`UserRegistered`, later `UserUpdated`/`UserDeleted`) so other services keep their own user projections.

There is no separate Users Service: user identity and profile are owned by the Auth Service. Other services reference users by the Better Auth `user.id` and keep local read models built from `auth.events`.

### Boards Service

Responsibilities:

- Board access.
- Board commands (board state in its own PostgreSQL DB is authoritative).
- Board domain events, published through the outbox.
- Local `users` projection fed by `auth.events`.
- Real-time board updates.

### Notifications Service

Responsibilities:

- Sending emails.
- Consuming registration-related events.
- Email delivery and retry handling.

---

## 4. Authentication

Use **Better Auth**.

Required authentication methods:

- Email/password.
- OAuth.

The exact OAuth provider(s) may be configured through environment variables.

Authentication secrets must never be hard-coded.

The backend must expose only the required authentication endpoints through the appropriate gateway/API boundary.

Only the Auth Service reads sessions. Other services must not call it per request: they authenticate requests by a short-lived JWT access token issued by the Auth Service (Better Auth `jwt` plugin, `GET /api/auth/token`) and sent as `Authorization: Bearer`. Services verify the signature, `exp`, `iss` and `aud` locally against the Auth Service's public keys (`GET /api/auth/jwks`, cached, re-fetched only for an unknown `kid`). Token lifetime is short (15 minutes), because sign-out does not revoke tokens already issued.

---

## 5. Registration Email

After successful user registration, the backend must trigger an email notification.

The preferred flow is event-driven:

```text
User registers
    |
    v
Better Auth / Auth Service
    |
    v
UserRegistered event
    |
    v
Kafka
    |
    v
Notifications Service
    |
    v
Email provider
```

The registration request must not depend on the notification service being synchronously available.

Email sending should support retries.

Failures in email delivery must not invalidate an already successful registration.

---

## 6. PostgreSQL as Source of Truth, Kafka for Propagation

Each service's PostgreSQL database is authoritative for the data it owns. Kafka carries domain events to other services; it is not the system of record.

Board mutations must still be represented as events.

Examples:

```text
BoardCreated
BoardUpdated
BoardDeleted

ColumnCreated
ColumnDeleted
ColumnMoved

CardCreated
CardDeleted
CardMoved
CardUpdated
```

A command is validated against the current state and applied in **one PostgreSQL transaction** that also writes its event to the service's `outbox` table. A relay in the service publishes outbox rows to Kafka afterwards (see §20).

```text
Frontend
   |
   | HTTP command
   v
Boards Service ── one transaction ──> PostgreSQL (board tables + outbox)
                                          |
                                          | outbox relay
                                          v
                                        Kafka (board.events)
                                          |
                          +---------------+---------------+
                          |                               |
                          v                               v
                  Real-time Gateway                 Other services
                          |                         (notifications, ...)
                          v
                  Connected clients
```

Because validation and the write share a transaction, concurrent commands are serialized by the database (row locks, unique constraints, `boards.version` for optimistic concurrency) instead of racing against a lagging projection.

The frontend must never write directly to PostgreSQL or Kafka.

---

## 7. Event Design

Events must contain enough information to be independently processed.

A common event envelope should contain fields such as:

```ts
interface DomainEvent<TPayload> {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  timestamp: string;
  payload: TPayload;
}
```

Events should be immutable.

Do not modify an already published event.

If the domain changes, publish a new event.

---

## 8. Ordering and Concurrency

Board events require deterministic ordering.

Kafka partitioning should use the board/aggregate identifier as the partition key where appropriate.

For example:

```text
partitionKey = boardId
```

This ensures events belonging to the same board can be processed in order within a partition.

The backend must account for:

- Duplicate event delivery.
- Consumer retries.
- Consumer restarts.
- Out-of-order processing across different partitions.
- Version conflicts.

Consumers must be idempotent.

---

## 9. PostgreSQL and TypeORM

Use PostgreSQL as the relational database.

Use TypeORM for database access.

PostgreSQL holds each service's authoritative state, for example:

```text
users
boards
board_members
columns
cards
```

The exact schema may evolve. Current schema (TypeORM entities + migrations under `services/<svc>/src/database/`):

- **boards DB**
  - `users` — local projection of auth users fed by `UserRegistered` (`id` = Better Auth id, `email`, `name`, `image` avatar URL). The auth DB is not reachable from other services (database-per-service), so members reference this table.
  - `boards` — `id`, `title`, `description`, `version` (incremented by every board command; the event carries the new value).
  - `board_members` — `(board_id, user_id)` PK, `role` (`OWNER`/`EDITOR`/`VIEWER`); a partial unique index allows exactly one `OWNER` per board.
  - `outbox` — events waiting for the relay (`id` = `eventId`, `topic`, `key`, `event_type`, `event`, `created_at`).
  - `columns`, `cards` — ordered by `position`, a fractional-index string key (`text COLLATE "C"`, generated with `fractional-indexing`): a move rewrites only the moved item's key, so it is one row update and one event, with no renumbering.
- **notifications DB** — `email_deliveries` (`source_event_id`, `kind`, `recipient`, `status`, `attempts`, `last_error`, `sent_at`).
- **auth DB** — owned by Better Auth (`user`, `session`, `account`, `verification`, `jwks`), plus `outbox` registered through a Better Auth plugin.

Board membership: the creator becomes `OWNER` when the board is created; others are added by email (looked up in the local `users` projection) through `BoardMemberAdded` / `BoardMemberRoleChanged` / `BoardMemberRemoved` events, which only the `OWNER` may trigger. Permissions are checked in the command handler inside the command's transaction (VIEWER reads; EDITOR also edits columns/cards; OWNER also manages members and the board itself), so a revoked role takes effect immediately.

---

## 10. Board Domain

A board represents a collaborative workspace.

A board can contain:

- Columns/lists.
- Cards/items.

Users with appropriate permissions can:

- Add items.
- Delete items.
- Move items.
- Update item data.
- Manage the board according to their role.

Example roles:

```text
OWNER
EDITOR
VIEWER
```

The final role model should be kept simple unless additional requirements appear.

---

## 11. Board Commands

Commands represent requested state changes.

Examples:

```text
CreateBoard
CreateCard
DeleteCard
MoveCard
CreateColumn
DeleteColumn
MoveColumn
```

Commands are not events.

A command expresses:

> "I want this operation to happen."

An event expresses:

> "This operation happened."

Example:

```text
MoveCard command
      |
      v
Boards Service
      |
      v
CardMoved event
      |
      v
Kafka
```

---

## 12. Authorization

Authentication and authorization are separate concerns.

The backend must verify:

1. The user is authenticated.
2. The user has access to the requested board.
3. The user's role permits the requested operation.

Example:

```text
VIEWER
  -> read board

EDITOR
  -> read board
  -> create/update/delete/move cards

OWNER
  -> all board operations
  -> manage board membership
```

Authorization must be enforced server-side.

The frontend UI must not be treated as a security boundary.

---

## 13. API

Expose a REST API unless a specific endpoint requires another protocol.

Example API:

```text
GET    /boards
GET    /boards/:boardId

POST   /boards
POST   /boards/:boardId/cards
PATCH  /boards/:boardId/cards/:cardId
DELETE /boards/:boardId/cards/:cardId

POST   /boards/:boardId/columns
PATCH  /boards/:boardId/columns/:columnId
DELETE /boards/:boardId/columns/:columnId
```

Every command writes its domain event to the outbox in the same transaction as the change (§20).

Implemented (`services/boards`, all under `/api`, JWT required):

- `GET /api/boards` — boards the caller is a member of (`{ id, title, description, role, createdAt }[]`, newest first).
- `GET /api/boards/:boardId` — the board with `role`, `version` and `columns[]` (each with `cards[]`), both ordered by `position`; `404` if it doesn't exist or the caller isn't a member.
- `POST /api/boards` — create a board (caller becomes `OWNER`).
- `POST /api/boards/:boardId/columns` — append a column (`{ title }`); `POST /api/boards/:boardId/columns/:columnId/cards` — append a card (`{ title, description? }`). `OWNER`/`EDITOR` only (`403`), `404` for non-members or a column of another board. Each locks the board row, bumps `boards.version` and publishes `ColumnCreated` / `CardCreated`.

---

## 14. Real-Time Updates

Collaborative boards require real-time updates.

The backend should expose a WebSocket or Server-Sent Events interface.

Example:

```text
Client A
   |
   | Move card
   v
Boards API
   |
   v
PostgreSQL (cards + outbox, one transaction)
   |
   v  outbox relay
Kafka: CardMoved
   |
   +------> Real-time gateway
                    |
                    +----> Client A
                    |
                    +----> Client B
                    |
                    +----> Client C
```

Clients subscribed to a board must receive relevant board events.

The real-time layer must not become the source of truth.

After reconnecting, a client must be able to retrieve the current board state from the Boards API.

---

## 15. Kafka Topics

Use separate topics according to domain boundaries.

A possible initial topic structure:

```text
auth.events
board.events
notification.events
```

Board events should be grouped in `board.events` initially unless scaling or ownership requirements justify further topic separation.

Kafka topic names must be configurable.

---

## 16. Consumer Reliability

Consumers must support:

- Manual/explicit acknowledgment semantics appropriate to the Kafka client.
- Retry handling.
- Idempotent processing.
- Consumer group usage.
- Graceful shutdown.
- Rebalancing.
- Dead-letter handling for messages that cannot be processed after configured retries.

A failed notification email should be retried without duplicating unrelated domain operations.

---

## 17. Idempotency

Every event consumer must be able to safely process a duplicate event.

Use `eventId` and/or an aggregate version to detect already processed events.

Current approach — no generic `processed_events` table; each consumer dedupes by a natural key:

- Board events (`board.events`) → consumers such as the real-time gateway: events of one board carry increasing `version`s; a consumer that keeps the last seen version per board skips `version <= last`.
- `UserRegistered` → the boards `users` projection: upsert by user id (re-applying is a no-op).
- Notifications: `email_deliveries` has a unique `(source_event_id, kind)` key, so a redelivered event cannot send a second email.

Add a `processed_events (event_id, consumer, processed_at)` table only for a consumer that has no such natural key.

---

### Implemented event contracts (`packages/contracts`)

- `UserRegistered` → `auth.events`, key = userId: `{ userId, email, name, image, emailVerified, createdAt }`.
- `ColumnCreated` → `board.events`, key = boardId, version = the board's new version: `{ boardId, columnId, title, position }`.
- `CardCreated` → `board.events`, key = boardId, version = the board's new version: `{ boardId, columnId, cardId, title, description, position, createdBy }`.
- `BoardCreated` → `board.events`, key = boardId, version 1: `{ boardId, title, description, owner: { userId, email, name, image } }`. The owner snapshot lets consumers know the owner without the auth DB.

`POST /api/boards` writes the board, the OWNER membership and the `BoardCreated` outbox row in one transaction and answers `201` with the board; the relay publishes the event shortly after.

---

## 18. Event Versioning

Events must include a version.

Example:

```ts
{
  eventType: "CardMoved",
  version: 1,
  ...
}
```

Future incompatible event changes should introduce a new version rather than silently changing the meaning of existing events.

---

## 19. Source of Truth and Rebuilding

Each service's PostgreSQL database is the source of truth for the data it owns and is protected by regular database backups, not by replaying Kafka.

Local projections of another service's data are rebuildable from that service's events. Example: the boards `users` table is fed by `auth.events`; a new consumer group (`fromBeginning`) replays the topic into an empty table. This requires `auth.events` to retain user events (or a compacted topic keyed by user id).

---

## 20. Transactional Consistency

Do not use distributed transactions between PostgreSQL and Kafka.

Every service that publishes events uses a **transactional outbox**:

1. The state change and its event (serialized `DomainEvent`) are written to the service's `outbox` table in the same transaction.
2. `OutboxRelay` (`@app/common`) polls `outbox` in `created_at` order, publishes the rows to Kafka (key = aggregate id) and deletes them in one transaction. A Postgres advisory lock lets only one relay per database run at a time, so per-key order holds with several replicas.
3. A crash between the Kafka send and the commit publishes the rows again: delivery is at least once and every consumer must be idempotent (§17).

Consistency windows:

- Events reach Kafka shortly after the commit (relay poll interval; longer while Kafka is unavailable — rows wait in `outbox`).
- Auth: Better Auth creates the user inside its own transaction and runs `create.before` database hooks in it; the `UserRegistered` outbox row is written from such a hook. If Better Auth ever created a user outside a transaction, the row would still be written first, but not atomically with the user.

---

## 21. Email Service

The Notifications Service should provide an abstraction:

```ts
interface EmailSender {
  send(input: SendEmailInput): Promise<void>;
}
```

This prevents the domain/application layer from depending directly on a particular email provider.

Configuration must be supplied through environment variables.

---

## 22. Configuration

Configuration must use environment variables.

Examples:

```text
DATABASE_URL
KAFKA_BROKERS
KAFKA_CLIENT_ID
KAFKA_GROUP_ID

BETTER_AUTH_SECRET

OAUTH_CLIENT_ID
OAUTH_CLIENT_SECRET

EMAIL_PROVIDER
EMAIL_FROM
EMAIL_API_KEY
```

Do not commit secrets.

Use Kubernetes Secrets for sensitive configuration.

---

## 23. Kubernetes

Every microservice must be deployable independently.

Typical Kubernetes resources:

```text
Deployment
Service
ConfigMap
Secret
```

The platform should include infrastructure for:

```text
Frontend
Auth Service
Boards Service
Notifications Service
PostgreSQL
Kafka
```

Infrastructure components may be externalized for production.

---

## 24. Skaffold

Skaffold is the primary local development/deployment orchestration tool.

Expected workflow:

```text
Source code
    |
    v
Skaffold
    |
    +--> Build Docker images
    |
    +--> Deploy Kubernetes manifests
    |
    +--> Monitor changes
    |
    +--> Redeploy affected services
```

The repository should contain a `skaffold.yaml`.

Development should support fast rebuild/redeploy cycles.

---

## 25. Docker

Each deployable service must have a Dockerfile.

Images should use multi-stage builds where appropriate.

Production images should contain only the dependencies required to run the service.

---

## 26. Graceful Shutdown

Services must gracefully handle:

- SIGTERM.
- SIGINT.

Shutdown should:

1. Stop accepting new requests.
2. Stop/close Kafka consumers and producers.
3. Close WebSocket connections where applicable.
4. Close database connections.
5. Finish or safely abandon in-flight work.
6. Exit cleanly.

---

## 27. Observability

Services should provide:

- Structured logs.
- Health checks.
- Readiness checks.
- Liveness checks.
- Kafka consumer error logging.
- Request correlation IDs where appropriate.

Sensitive information must not be logged.

---

## 28. Testing

Minimum backend tests:

### Unit tests

- Board domain rules.
- Authorization rules.
- Command validation.
- Event creation.
- Event handlers.
- Idempotency logic.

### Integration tests

- PostgreSQL repositories.
- Kafka producers/consumers.
- Better Auth integration.
- Registration email event flow.

### End-to-end

At minimum:

```text
Register
  -> UserRegistered event
  -> Email notification

Login
  -> Get boards
  -> Open board
  -> Create card
  -> Move card
  -> Delete card
```

---

## 29. TypeScript Requirements

TypeScript is mandatory for the entire backend.

Do not add JavaScript source files.

Use strict TypeScript configuration.

Avoid `any` unless explicitly justified.

Shared event contracts should be strongly typed.

Example:

```ts
type BoardEvent =
  | CardCreatedEvent
  | CardDeletedEvent
  | CardMovedEvent
  | ColumnCreatedEvent
  | ColumnDeletedEvent;
```

Discriminated unions should be preferred for domain events.

---

## 30. Non-Goals

The backend must not:

- Allow the frontend to access Kafka directly.
- Allow the frontend to access PostgreSQL directly.
- Treat PostgreSQL board rows as the authoritative event history.
- Put authentication secrets in the frontend.
- Make email delivery a synchronous prerequisite for registration.
- Put board business rules exclusively in controllers.

---

## 31. Acceptance Criteria

The backend is considered complete when:

1. The backend is implemented entirely in TypeScript.
2. The backend consists of independently deployable microservices.
3. Better Auth provides authentication.
4. OAuth authentication is supported.
5. PostgreSQL is used with TypeORM.
6. Registration produces a user-registration event.
7. A notification service consumes the registration event and sends an email.
8. Board mutations are published as Kafka events through a transactional outbox.
9. PostgreSQL is the source of truth for board state.
10. Local projections of other services' data (e.g. users) are rebuildable from Kafka events.
11. Duplicate Kafka events can be processed safely.
12. Board event ordering is handled using an appropriate Kafka partitioning strategy.
13. Users can create, delete, and move board items.
14. Board authorization is enforced server-side.
15. Real-time board updates are delivered to connected clients.
16. No event is lost when Kafka is temporarily unavailable (the outbox keeps it).
17. Services can run in Kubernetes.
18. Skaffold can build and deploy the development environment.
19. Secrets are managed outside source code.
20. Critical functionality is covered by automated tests.
