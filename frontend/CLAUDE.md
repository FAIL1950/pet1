# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project state

This is a `create-next-app` scaffold (Next.js 16.3.4, React 19.2.8, Tailwind CSS 4) with Material UI 9 wired in as the component library — no application code has been written yet beyond the generated `app/layout.tsx` and `app/page.tsx`. There is no custom architecture to document yet; the notes below are about the scaffold's setup, not app-specific design.

**Read `SPEC.md` before implementing any feature.** It is the target-architecture spec for the app to be built here (a real-time collaborative board/project tool, Trello-like) and defines requirements that aren't derivable from the scaffold. Key constraints worth internalizing up front:

- The backend uses Kafka as the source of truth for board mutations, reached only through the backend's HTTP/real-time APIs — never connect directly to Kafka or Postgres from the frontend.
- Optimistic UI is allowed only as a temporary rendering technique; board state must always reconcile back to the backend-authoritative event flow (see SPEC.md §3 for the mutation lifecycle).
- Auth is handled by Better Auth on the backend boundary — the frontend integrates with it (registration/login/logout/OAuth/session/protected routes) but must not implement password hashing or auth logic itself.
- SPEC.md §6 recommends a `src/{app,components,features,lib/{api,auth},hooks,types}` layout with a dedicated API client layer instead of scattering `fetch` calls through components — adapt as needed once real structure emerges.
- `any` is disallowed without a documented reason; all API responses, domain objects, board events, and auth state must be typed.

## Commands

Package manager is bun (`bun.lock`, `packageManager: bun@1.4.2` in `package.json`).

- `bun install` — install dependencies (postinstall scripts are blocked except for `sharp` and `unrs-resolver`, per `trustedDependencies`/`ignoreScripts` in `package.json`)
- `bun dev` — start the dev server (http://localhost:3000)
- `bun run build` — production build
- `bun run start` — serve the production build
- `bun run lint` — run ESLint (flat config, `eslint-config-next`)

No test runner is configured in this project.

## Architecture notes

- App Router under `app/`. TypeScript strict mode, path alias `@/*` → project root (`tsconfig.json`).
- Styling is Tailwind CSS 4 via `@tailwindcss/postcss` (`postcss.config.mjs`), global styles in `app/globals.css`.
- UI components come from Material UI (`@mui/material`, Emotion, `@mui/icons-material`); Tailwind is kept for layout/utilities. The MUI theme lives in `theme.ts` (`"use client"`, CSS variables, light/dark color schemes switched via a `.dark`/`.light` class on `<html>`, font = Geist).
- `app/layout.tsx` wraps the app in `AppRouterCacheProvider` (`@mui/material-nextjs/v16-appRouter`, `enableCssLayer: true`) → `ThemeProvider` → `CssBaseline`, plus `InitColorSchemeScript attribute="class"` to avoid a dark-mode flash.
- `app/globals.css` declares `@layer theme, base, mui, components, utilities;` before `@import "tailwindcss"`, so Tailwind utilities override MUI styles (e.g. `<Button className="mt-4">`). Tailwind's `dark:` variant follows MUI's `.dark` class, and MUI palette CSS variables are exposed as Tailwind colors (`bg-primary`, `text-text-secondary`, `bg-paper`, `border-divider`, ...). Prefer MUI props/`sx` for component styling and Tailwind for layout.
- `app/layout.tsx` types its props via generated route types (e.g. `LayoutProps<"/">`) instead of a hand-written `{ children: React.ReactNode }` interface — part of Next 16's typed-routes generation. Confirm current conventions in `node_modules/next/dist/docs/` (see AGENTS.md above) before assuming older Next.js prop-typing patterns.
- `next.config.ts` has no custom config yet.
