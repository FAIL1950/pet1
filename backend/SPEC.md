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

Kafka is the **source of truth for domain changes** related to collaborative boards. PostgreSQL is used as a persistent/readable projection and application data store, but board mutations must be represented by Kafka events.

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
- Maintaining PostgreSQL projections.
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
- Board commands.
- Board domain events.
- Board projections.
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

## 6. Kafka as Source of Truth

Kafka is the authoritative event log for board domain changes.

Board mutations must be represented as events.

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

A simplified event flow:

```text
Frontend
   |
   | HTTP command
   v
Boards Service
   |
   | validate command
   v
Kafka
   |
   | domain event
   +----------------------+
   |                      |
   v                      v
PostgreSQL Projection   Real-time Gateway
   |                      |
   v                      v
Query API              Connected clients
```

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

PostgreSQL should contain projections/queryable state such as:

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
  - `boards` — `id`, `title`, `description`, `version` (last applied event version).
  - `board_members` — `(board_id, user_id)` PK, `role` (`OWNER`/`EDITOR`/`VIEWER`); a partial unique index allows exactly one `OWNER` per board.
  - `columns`, `cards` — ordered by `position`, a fractional-index string key (`text COLLATE "C"`, generated with `fractional-indexing`): a move rewrites only the moved item's key, so it is one row update and one event, with no renumbering.
- **notifications DB** — `email_deliveries` (`source_event_id`, `kind`, `recipient`, `status`, `attempts`, `last_error`, `sent_at`).
- **auth DB** — owned by Better Auth (`user`, `session`, `account`, `verification`).

Board membership: the creator becomes `OWNER` on `BoardCreated`; others are added by email (looked up in the local `users` projection) through `BoardMemberAdded` / `BoardMemberRoleChanged` / `BoardMemberRemoved` events, which only the `OWNER` may trigger. Permissions are checked in the command handler against the projection (VIEWER reads; EDITOR also edits columns/cards; OWNER also manages members and the board itself). Consistency window: the check reads the projection, so a just-revoked role may still pass for the short time until the projection catches up.

The database must not be considered the authoritative event history for board mutations.

The board projection can be rebuilt from Kafka events.

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

Commands should result in domain events rather than directly being treated as authoritative database mutations.

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
Kafka
   |
   v
CardMoved
   |
   +------> PostgreSQL projection
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

After reconnecting, a client must be able to retrieve the current board projection.

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

- Board events → the board projection: `boards.version` stores the version of the last applied event; an event with `version <= boards.version` is a duplicate and is skipped.
- `UserRegistered` → the boards `users` projection: upsert by user id (re-applying is a no-op).
- Notifications: `email_deliveries` has a unique `(source_event_id, kind)` key, so a redelivered event cannot send a second email.

Add a `processed_events (event_id, consumer, processed_at)` table only for a consumer that has no such natural key.

---

### Implemented event contracts (`packages/contracts`)

- `UserRegistered` → `auth.events`, key = userId: `{ userId, email, name, image, emailVerified, createdAt }`.
- `BoardCreated` → `board.events`, key = boardId, version 1: `{ boardId, title, description, owner: { userId, email, name, image } }`. The owner snapshot lets the boards projection satisfy its `users` FK even before `UserRegistered` is consumed or after it ages out of `auth.events`.

`POST /api/boards` publishes `BoardCreated` and waits (up to 5 s) for the boards projection to apply it: `201` with the board, or `202 { boardId }` if it is still catching up.

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

The board projection in PostgreSQL must be rebuildable.

Conceptually:

```text
Kafka event log
      |
      v
Board projection consumer
      |
      v
PostgreSQL
```

If the projection is lost or corrupted:

```text
Kafka
  |
  v
Replay board events
  |
  v
Rebuild PostgreSQL projection
```

This requirement is fundamental to the architecture.

---

## 20. Transactional Consistency

Avoid distributed transactions between PostgreSQL and Kafka where possible.

When PostgreSQL persistence and Kafka publication need atomicity, use an appropriate event-driven consistency mechanism, such as a transactional/outbox-style approach where it does not conflict with Kafka being the authoritative event log.

The implementation must explicitly document any unavoidable consistency window.

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
8. Board mutations are represented as Kafka events.
9. Kafka is the authoritative event log for board changes.
10. PostgreSQL contains rebuildable board projections.
11. Duplicate Kafka events can be processed safely.
12. Board event ordering is handled using an appropriate Kafka partitioning strategy.
13. Users can create, delete, and move board items.
14. Board authorization is enforced server-side.
15. Real-time board updates are delivered to connected clients.
16. The system can recover/rebuild board projections from Kafka events.
17. Services can run in Kubernetes.
18. Skaffold can build and deploy the development environment.
19. Secrets are managed outside source code.
20. Critical functionality is covered by automated tests.
