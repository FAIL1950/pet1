# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project state

This is a `create-next-app` scaffold (Next.js 16.3.4, React 19.2.8, Tailwind CSS 4) with Material UI 9 wired in as the component library. App code so far: the layout/navigation shell, i18n, placeholder board pages, and the sign-in/sign-up pages wired to the Better Auth client (see Architecture notes).

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
- UI components come from Material UI (`@mui/material`, Emotion, `@mui/icons-material`); Tailwind is kept for layout/utilities. The MUI theme options live in `theme.ts` (CSS variables, green light/dark palettes switched via a `.dark`/`.light` class on `<html>`, font = Geist, self-hosted via the `geist` package (`geist/font/sans`/`mono`, `next/font/local`) — not `next/font/google`, because the k8s pod can't reach Google Fonts); `components/providers/AppThemeProvider.tsx` builds the theme with the MUI locale pack (`ukUA`/`enUS`) matching the current locale.
- `app/layout.tsx` wraps the app in `NextIntlClientProvider` → `AppRouterCacheProvider` (`@mui/material-nextjs/v16-appRouter`, `enableCssLayer: true`) → `AppThemeProvider` → `CssBaseline` + `AppHeader` + `<main>`, plus `InitColorSchemeScript attribute="class"` to avoid a dark-mode flash.
- i18n: `next-intl` without i18n routing (no locale prefix in URLs). App locales are `ua` (default) and `en` (`i18n/config.ts`); the active one comes from the `locale` cookie, falling back to `Accept-Language`, then `ua` (`i18n/request.ts`), and is changed via the `setLocale` server action (`i18n/actions.ts`). `ua` is the app-level id (cookie, `messages/ua.json`, switcher), but next-intl/`<html lang>` receive the BCP 47 tag `uk` (`LOCALE_TAGS`) — so `useLocale()` returns `uk`/`en`; convert with `toAppLocale`/`toLocaleTag`. All UI text must come from `messages/{ua,en}.json` via `useTranslations`/`getTranslations`; keys are type-checked against `messages/ua.json` (`global.d.ts`). Reading the cookie makes every route dynamic.
- Layout components in `components/layout/`: `AppHeader` (sticky AppBar, desktop nav + mobile Drawer, active item by `usePathname`, not session-aware yet), `LocaleSwitcher`, `ColorSchemeToggle`, `PageContainer` (`Container maxWidth="lg"` + vertical padding + optional `h1` title — use for regular pages; the board page is full-width instead), `nav.ts` (nav items). `components/ui/LinkButton.tsx` is a client wrapper for `Button component={NextLink}` so Server Components can render link buttons.
- Auth (Better Auth client only — the server lives in the backend `auth` service): `lib/auth/client.ts` exports `authClient` (`createAuthClient` from `better-auth/react`) and `AFTER_AUTH_REDIRECT` (`/boards`). With no `baseURL` it calls same-origin `/api/auth`, which the k8s ingress routes to the `auth` service; set `NEXT_PUBLIC_AUTH_URL` (e.g. in `.env.local`) to point at the auth service when running without the ingress. `lib/auth/errors.ts` maps Better Auth error codes to `AuthForm.errors.*` messages (`null` = request threw, i.e. network error). Forms use React Hook Form + Zod: schemas live in `lib/auth/schemas.ts` and their error messages are `AuthForm.validation.*` **keys**, not text (keeps schemas locale-agnostic). `components/auth/`: `AuthCard` (card shell + "or" divider + `GoogleSignInButton` + switch link), `FormTextField` (MUI `TextField` bound via `useController`, translates the schema error into `helperText`; `type="password"` renders `PasswordField` with a visibility toggle), `SignInForm`/`SignUpForm` (`zodResolver`, `mode: "onTouched"`, server errors via `setError("root.serverError")` shown in an `Alert`, redirect to `/boards` on success). The only OAuth provider is Google (`signIn.social`, absolute `callbackURL`). Session-aware header, logout and protected routes are not implemented yet.
- Loading UI: `(main)/loading.tsx` and `auth/loading.tsx` render the generic spinner `components/ui/PageLoader.tsx`; `boards/loading.tsx` and `boards/[boardId]/loading.tsx` are MUI `Skeleton`s mirroring their page's layout — keep them in sync when those pages change. Loading labels come from the `Common.loading` message.
- `app/globals.css` declares `@layer theme, base, mui, components, utilities;` before `@import "tailwindcss"`, so Tailwind utilities override MUI styles (e.g. `<Button className="mt-4">`). Tailwind's `dark:` variant follows MUI's `.dark` class, and MUI palette CSS variables are exposed as Tailwind colors (`bg-primary`, `text-text-secondary`, `bg-paper`, `border-divider`, ...). Prefer MUI props/`sx` for component styling and Tailwind for layout.
- `app/layout.tsx` types its props via generated route types (e.g. `LayoutProps<"/">`) instead of a hand-written `{ children: React.ReactNode }` interface — part of Next 16's typed-routes generation. Confirm current conventions in `node_modules/next/dist/docs/` (see AGENTS.md above) before assuming older Next.js prop-typing patterns.
- `next.config.ts`: `output: "standalone"`, `allowedDevOrigins: ["pet.local"]` (the k8s ingress host; the pod runs `bun dev`, and without it Next blocks `/_next/hmr` so the page never hydrates), wrapped with `createNextIntlPlugin()`.
