# Phase 1 Summary — Project Foundation and Application Shell

Handoff note for Phase 2. Stories 1.1.1–1.1.8 complete.

## Completed

- **Next.js baseline** — App Router, TypeScript, `src/` layout, local dev and production build working.
- **UI foundation** — Tailwind CSS v4, shadcn/ui (zinc theme), 15 shared primitives, system light/dark via `next-themes`.
- **Routing** — `(public)` `/`, `(auth)` `/sign-in` and `/sign-up`, `(app)` `/workflows`, `/runs`, `/settings`; no workspace slug in URLs.
- **App shell** — Sidebar navigation, header placeholders, `AppPageLoading`, `EmptyState` primitives.
- **Module boundaries** — `src/{components,app,ui,modules,contracts,db,integrations,lib}` with `@/*` → `./src/*`.
- **TypeScript** — `strict` plus `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `UnsafeAny` escape hatch; ESLint `no-explicit-any`.
- **Environment** — `src/lib/env` Zod validation (`getServerEnv`), `.env.example`, `GET /api/health`.
- **Quality gate** — `pnpm check` (lint, typecheck, build); Prettier format scripts; GitHub Actions CI on `main` PRs and pushes.

**Stack:** Next.js 16, React 19, pnpm, Zod 4, Geist fonts.

## Developer baseline

1. `pnpm install`
2. Copy `.env.example` → `.env.local` and set `APP_URL` (e.g. `http://localhost:3000`).
3. `pnpm dev` for local development.
4. `pnpm check` before opening a PR.

Optional env vars (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `RAPIDAPI_*`) are not required until Phase 2/3.

## Setup deviations from roadmap

- **`src/` timing** — Migrated to `src/` in Story 1.1.2 (not 1.1.1); all paths alias via `@/*`.
- **shadcn style** — Uses current `radix-nova` preset (v4 default), not legacy `new-york`; toast via Sonner, not deprecated shadcn toast.
- **Home route** — Public landing at `/`; 1.1.2 UI showcase removed in 1.1.3.
- **Navigation** — Sidebar shell in 1.1.4 replaced interim top nav from 1.1.3.
- **Components** — Product UI under `src/components/app/`; shadcn primitives in `src/components/ui/`.
- **Env validation** — Lazy `getServerEnv()` on first access; only `NODE_ENV`, `APP_URL`, and `EXECUTION_TRANSPORT` required now; other vars optional placeholders.
- **Health route** — `GET /api/health` added as server env consumer (not in roadmap).
- **`use-mobile` hook** — Refactored to `useSyncExternalStore` for ESLint compliance (differs from stock shadcn).

## Unresolved decisions for Phase 2

- **Supabase** — Local vs cloud dev database; whether preview deployments share dev DB or use staging; production project timing.
- **Drizzle** — `postgres.js` vs `node-postgres` for Supabase pooler; whether to disable Supabase Data API in V1.
- **Database conventions** — UUID generation in Postgres vs application code; production migration runner for first release.
- **Better Auth** — Email verification required before running workflows; password reset before internal release; custom production domain from day one.
- **Workspaces** — Single personal workspace per user vs multiple; editable workspace names in V1.
