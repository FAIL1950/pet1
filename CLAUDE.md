# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Use context7 mcp for documentation!

`pet-1` is a two-service app (backend + frontend) for a real-time collaborative project-management platform (Kanban-style boards), at the starter/scaffolding stage — the only feature code so far is the backend auth service. The backend now has its microservices skeleton in place (`backend/services/{auth,boards,notifications}` + `backend/packages/{common,contracts}`; `auth` implements Better Auth email/password + Google OAuth and publishes `UserRegistered` to Kafka; the other services are still empty Nest apps). Services run under Bun directly from TS source. The full target architecture lives in `backend/SPEC.md` (backend spec) and `frontend/SPEC.md` (frontend spec, same document from the frontend's perspective) — read the relevant one before implementing any feature.

- `backend/` — NestJS monorepo (Nest CLI monorepo mode): three service apps under `services/` and two shared libraries under `packages/`, no default/root app. Bun runtime, ESM with NodeNext resolution, Vitest for tests, oxlint for linting. See `backend/CLAUDE.md` for commands and architecture notes (Kafka-as-source-of-truth, event-driven design, microservices decomposition plan).
- `frontend/` — Next.js 16 (App Router) starter created via `create-next-app`, using React 19, Material UI 9 (components) and Tailwind CSS 4 (layout/utilities). See `frontend/CLAUDE.md` (imports `frontend/AGENTS.md`, which flags that this Next.js version may differ from training data — check `node_modules/next/dist/docs/` before relying on prior Next.js knowledge).
- `k8s/` — Kubernetes manifests (`backend-deployment.yaml`, `frontend-deployment.yaml`, `services.yaml`, `ingress.yaml`) for deploying both services; ingress (no `host`, so it serves the whole app at `http://localhost` — required for Google OAuth redirect URIs) routes `/api/<service>` to the backend services and `/` to `frontend`. `k8s/kafka.yaml` runs a single-node dev Kafka (KRaft, `apache/kafka`, StatefulSet + PVC) behind Service `kafka` (`kafka:9092` in-cluster, `localhost:9094` from the host via skaffold port-forward), plus a `kafka-init-topics` Job that idempotently creates `auth.events`, `board.events`, `notification.events`; backend deployments get `KAFKA_BROKERS`/`KAFKA_CLIENT_ID` env. `k8s/postgres.yaml` runs a single-node dev Postgres 18 (StatefulSet + PVC) behind Service `postgres` (`postgres:5432` in-cluster, `localhost:5432` via port-forward) with **database-per-service**: an init script creates a separate database + login role for `auth`, `boards`, `notifications` (each role can connect only to its own DB; dev-only credentials in Secret `postgres-credentials`). Only `auth` is wired to it so far (Secret `auth-secrets` in `backend-auth.yaml`). Real secrets (Google OAuth) go in gitignored `k8s/*.secret.yaml` files, with committed `*.secret.yaml.example` templates (not matched by skaffold's `k8s/*.yaml` glob).
- `skaffold.yaml` — builds both `backend/Dockerfile` and `frontend/Dockerfile` and deploys `k8s/*.yaml` for local dev (`skaffold dev`/`skaffold run`); port-forwards frontend to `localhost:3000` and backend to `localhost:3001`.

There is a single git repository at the `pet-1` root covering both `backend/` and `frontend/` — there are no nested/independent git repos per service. There is, however, no root-level package.json or JS workspace config tying the two services together — treat `backend/` and `frontend/` as independent projects for dependency/build/test purposes and `cd` into the relevant one before running any bun/npm command.

## Working in this repo

- Always run bun/npm commands (install, dev, build, lint, test) from inside `backend/` or `frontend/`, not the repo root — commands, lockfiles, and configs are per-project.
- Consult `backend/CLAUDE.md` or `frontend/CLAUDE.md` (and `frontend/AGENTS.md`) for that project's specific commands and conventions before making changes.
- Git operations (status/add/commit) work from anywhere in the tree since it's one shared repo.
