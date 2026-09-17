# Frontend Specification

## 1. Overview

Build a classic web platform for collaborative project work.

The frontend must be implemented **exclusively in TypeScript** using:

- Next.js
- React
- TypeScript

The application communicates with a backend microservice architecture through HTTP APIs and real-time updates where required.

The backend uses Kafka as the source of truth for board mutations. The frontend must never treat local UI state or a direct database query as the authoritative state.

---

## 2. Core Pages

The application contains four primary page areas.

### 2.1 About

Route:

`/`

Purpose:

- Explain the purpose of the platform.
- Explain collaborative project/board functionality.
- Provide links to registration and authorization.

No authenticated session is required.

### 2.2 Authentication

Routes:

- `/auth/sign-in`
- `/auth/sign-up`

Features:

- User registration.
- User login.
- OAuth login.
- Session-aware navigation.
- Logout.

Authentication is handled by **Better Auth** on the backend/authentication boundary.

The frontend must not implement password hashing or authentication logic itself.

After successful authentication, the user should be redirected to the board list.

### 2.3 Board List

Route:

`/boards`

Authenticated users only.

The page displays boards available to the current user.

Each board entry should provide:

- Board name.
- Optional description.
- User access/role.
- Navigation to the board.

Unauthorized users must be redirected to authentication.

### 2.4 Board

Route:

`/boards/[boardId]`

Authenticated users only.

The board is the main collaborative workspace.

Users can:

- Add items/cards.
- Delete items/cards.
- Move items/cards.
- Observe changes made by other users.

The exact visual board model can be implemented as columns/lists containing movable cards.

---

## 3. Board Interaction Model

The UI should support drag-and-drop movement.

Typical operations:

- Create card.
- Delete card.
- Move card between columns.
- Reorder cards inside a column.
- Create/delete columns if supported by the backend contract.

Every mutation must be sent to the backend.

The frontend must use optimistic UI only as a temporary interaction technique. The authoritative state comes from the backend event flow.

Example:

1. User drags a card.
2. Frontend immediately renders the expected position.
3. Frontend sends a board command to the backend.
4. Backend validates the command.
5. Backend publishes the corresponding Kafka event.
6. The event is persisted/processed.
7. The authoritative board state is updated.
8. Frontend receives the resulting state/event.
9. Frontend reconciles its local state with the authoritative state.

If the operation fails, the optimistic state must be rolled back or reconciled with the authoritative state.

---

## 4. State Management

Separate UI state from server/board state.

### UI state

Examples:

- Modal visibility.
- Selected card.
- Drag state.
- Form state.
- Loading indicators.

### Server state

Examples:

- Current user.
- Available boards.
- Board columns.
- Board cards.
- Card positions.

Server state must be treated as remotely authoritative.

Do not persist board mutations as the final source of truth in:

- React state.
- localStorage.
- sessionStorage.
- IndexedDB.

Client-side persistence may only be used for non-authoritative UI preferences if needed.

---

## 5. Real-Time Collaboration

The board must support updates caused by other users.

The frontend should consume a backend real-time mechanism exposed by the backend, such as WebSocket/SSE, depending on the final backend API contract.

The frontend should:

- Subscribe when entering a board.
- Receive board events/state updates.
- Apply external changes.
- Unsubscribe when leaving the board.
- Reconnect after connection loss.
- Reconcile state after reconnecting.

The frontend must not connect directly to Kafka.

Kafka is an internal backend infrastructure component.

---

## 6. API Integration

All backend communication must be strongly typed with TypeScript.

Create shared API/domain types where appropriate.

The frontend should have a dedicated API client layer instead of scattering raw `fetch` calls throughout components.

Recommended structure:

```text
src/
  app/
  components/
  features/
  lib/
    api/
    auth/
  hooks/
  types/
```

The exact structure may be adapted to the project's architecture.

---

## 7. Authentication Requirements

The frontend must integrate with Better Auth.

Required functionality:

- Registration.
- Login.
- Logout.
- OAuth.
- Current-session retrieval.
- Protected routes.

The frontend must never expose:

- Database credentials.
- Kafka credentials.
- Internal service credentials.
- Server-side secrets.

OAuth provider configuration must remain server-side except for values explicitly intended to be public by the authentication provider.

---

## 8. Forms and Validation

Forms should provide:

- Client-side validation for immediate feedback.
- Server-side validation as the final authority.
- Clear error messages.
- Loading/submission states.
- Accessible labels and controls.

Validation logic should not be duplicated unnecessarily.

---

## 9. Error Handling

Handle at least:

- Unauthorized requests.
- Forbidden board access.
- Board not found.
- Network failures.
- Validation errors.
- Conflict/reconciliation errors.
- Real-time connection failures.
- Expired sessions.

The UI should never silently discard a failed board mutation.

---

## 10. Accessibility

The platform is intended for collaborative work and should follow standard accessibility practices.

Requirements:

- Semantic HTML.
- Keyboard-accessible controls.
- Visible focus states.
- Labels for form controls.
- Accessible error messages.
- Drag-and-drop interactions should have an accessible alternative where practical.
- Sufficient contrast.

---

## 11. Responsive Design

The application should work on:

- Desktop.
- Tablet.
- Mobile.

The board may use a horizontally scrollable workspace on small screens if required by the board layout.

---

## 12. Next.js Requirements

Use the current Next.js App Router architecture.

Prefer:

- Server Components where server rendering is useful.
- Client Components only where interactivity/browser APIs require them.
- Route-level loading and error states.
- Proper metadata for public pages.

Do not introduce the legacy Pages Router unless explicitly required.

---

## 13. TypeScript Requirements

TypeScript is mandatory.

Do not add JavaScript source files.

Prefer strict typing and avoid:

```ts
any
```

unless there is a documented technical reason.

API responses, domain objects, board events, authentication state, and component interfaces must be typed.

---

## 14. Testing

The frontend should include tests for critical behavior.

Minimum coverage:

- Authentication forms.
- Protected navigation.
- Board rendering.
- Card creation.
- Card deletion.
- Card movement.
- Error handling.
- Reconciliation after server events.

End-to-end tests should cover the primary user journey:

```text
Sign up/Login
    -> Board list
    -> Open board
    -> Create card
    -> Move card
    -> Delete card
```

---

## 15. Containerization and Kubernetes

The frontend must be containerized.

The project must be compatible with Kubernetes and Skaffold.

Development/deployment workflow:

```text
Next.js
  -> Docker image
  -> Kubernetes Deployment
  -> Kubernetes Service
  -> Skaffold
```

Configuration must use environment variables.

Secrets must not be committed to the repository.

---

## 16. Non-Goals

The frontend must not:

- Connect directly to PostgreSQL.
- Connect directly to Kafka.
- Implement Better Auth internals.
- Treat browser state as the source of truth.
- Contain backend business rules.
- Store server credentials.

---

## 17. Acceptance Criteria

The frontend is considered complete when:

1. A user can register.
2. A user can log in.
3. A user can authenticate through OAuth.
4. A user can log out.
5. An authenticated user can see available boards.
6. A user can open an authorized board.
7. A user can create board items.
8. A user can delete board items.
9. A user can move board items.
10. Changes made by other users are reflected in the UI.
11. Failed mutations are handled correctly.
12. Protected routes reject unauthenticated users.
13. The application runs in Docker.
14. The application can be deployed through Kubernetes/Skaffold.
15. The entire frontend codebase is TypeScript.
