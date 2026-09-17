# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`pet-1` is a two-service app at the freshly-scaffolded starter stage: no feature code has been written yet in either service.

- `backend/` — NestJS starter (see `backend/CLAUDE.md` for full commands/architecture notes). Bun runtime, ESM with NodeNext resolution, Vitest for tests, oxlint for linting. Has its own git repo (`backend/.git`) — this is the actual repo boundary for backend changes, not the outer `pet-1` folder.
- `frontend/` — Next.js 16 (App Router) starter created via `create-next-app`, using React 19 and Tailwind CSS 4. See `frontend/CLAUDE.md` (imports `frontend/AGENTS.md`, which flags that this Next.js version may differ from training data — check `node_modules/next/dist/docs/` before relying on prior Next.js knowledge).
- `k8s/` — Kubernetes manifests (`backend-deployment.yaml`, `frontend-deployment.yaml`, `services.yaml`, `ingress.yaml`) — currently all empty placeholders.
- `backend/Dockerfile` and `frontend/Dockerfile` also currently exist but are empty.

There is no root-level package.json, workspace config, or build tool tying the two services together — treat `backend/` and `frontend/` as independent projects and `cd` into the relevant one before running any command.

## Working in this repo

- Always work from inside `backend/` or `frontend/`, not the repo root — commands, lockfiles, and configs are per-project.
- Consult `backend/CLAUDE.md` or `frontend/CLAUDE.md` (and `frontend/AGENTS.md`) for that project's specific commands and conventions before making changes.
