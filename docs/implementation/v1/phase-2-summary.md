# Phase 2 Summary — Database, Authentication, and Workspace Ownership

Handoff note for Phase 3. Stories 2.1.1–2.3.4 complete.

## Completed

- **Supabase Postgres** — Single cloud dev project; `DATABASE_URL` (transaction pooler) and `DATABASE_DIRECT_URL` (migrations) in `.env.local`; production project deferred.
- **Drizzle ORM** — `postgres.js` driver (`prepare: false`), schema under `src/db/schema/`, client via `getDb()`; domain column helpers in `src/db/schema/helpers/`.
- **Migrations** — Drizzle Kit → `supabase/migrations/`; local apply via `pnpm db:push`; workflow in `docs/implementation/database-migrations.md`.
- **Auth tables** — Better Auth schema (`user`, `session`, `account`, `verification`); catch-all route at `/api/auth/[...all]`.
- **Sign-up / sign-in** — `(auth)` pages with Zod validation, Server Actions, redirect to `/workflows`; email/password only.
- **Session helpers** — `getCurrentSession`, `requireUser`, `unauthorizedResponse` (401); `(app)` layout redirects unauthenticated users to `/sign-in`.
- **Workspace tables** — `workspaces`, `workspace_members`; roles `owner` | `member`; kinds `personal` | `team`.
- **Workspace provisioning** — Idempotent `ensurePersonalWorkspace`; triggered on sign-up and via `requireCurrentWorkspace`.
- **Workspace authorization** — `requireWorkspaceMember`, `requireWorkspaceOwner`, `ForbiddenError` / `forbiddenResponse` (403); pure `assertWorkflowInWorkspace` / `assertRunInWorkspace` for pre-Phase-4/7 use.
- **Protected app shell** — Layout resolves workspace, passes `workspaceName` and `userLabel` to `AppShell`; provisioning failures show `WorkspaceProvisioningError`.

**Applied migrations:** `20260607182013_hesitant_scorpion` (auth), `20260607185353_lucky_loki` (workspaces).

**Stack additions:** Drizzle ORM, Drizzle Kit, Better Auth, `@better-auth/drizzle-adapter`, Supabase CLI (local migrate).

## Auth and authorization behavior

| Situation | Behavior |
|---|---|
| No session on product route | Redirect to `/sign-in` |
| No session in Route Handler | Throw `UnauthorizedError` → 401 via `unauthorizedResponse()` |
| Authenticated, not workspace member | `ForbiddenError` → 403 via `forbiddenResponse()` |
| Owner-only action by member | `ForbiddenError` (403) |
| Workspace provisioning failure | Error panel with sign-out (no shell) |
| Current workspace (V1) | User's personal workspace (`personalOwnerUserId`); no URL slug or switching |
| Cross-workspace resource (assert helpers) | `ForbiddenError` when `resource.workspaceId` mismatches |

## Developer baseline

1. `pnpm install`
2. Copy `.env.example` → `.env.local`; set `APP_URL`, `DATABASE_URL`, `DATABASE_DIRECT_URL`, `BETTER_AUTH_SECRET` (generate via `pnpm exec better-auth secret`).
3. Disable Supabase Data API in dashboard (PostgREST off for V1).
4. `pnpm db:push` to apply migrations locally.
5. `pnpm dev` / `pnpm check` before opening a PR.

Preview deployments: use the same dev `DATABASE_URL` until Supabase branching is enabled.

## Resolved in Phase 2

- **Supabase role in V1** — Managed Postgres only; server-side Drizzle access; Data API disabled.
- **Drizzle driver** — `postgres.js` with transaction pooler (`prepare: false`).
- **IDs** — Postgres-generated UUIDs for application tables (`entityIdColumn()`).
- **Preview DB** — Shares dev database for now.
- **Production Supabase** — Deferred until branching is configured.
- **Workspaces** — One personal workspace per user (schema supports future team workspaces); fixed name `"Personal workspace"`; implicit context (no slug in URLs).

## Unresolved decisions for Phase 3

- **Better Auth** — Email verification required before running workflows; password reset before internal release; custom production domain from day one.
- **Session UX** — Expired sessions: silent redirect vs explicit “session expired” message.
- **Release ops** — Who runs `pnpm db:migrate:prod` on first production release.

## Setup deviations from roadmap

- **`personalOwnerUserId`** — Column on `workspaces` plus partial unique index enforces one personal workspace per user (supports idempotent provisioning).
- **Workflow/run scope checks** — Pure assert helpers now; DB-scoped loaders deferred to Phase 4/7 when tables exist.
- **Provisioning error UI** — Dedicated server component instead of generic `error.tsx` when workspace repair fails.
- **App shell header** — Displays live workspace name and user label; sign-out remains in sidebar footer (no profile menu in V1).
- **Env validation** — `DATABASE_*` and `BETTER_AUTH_*` remain optional at parse time but are required at runtime for auth/database features (`getDb()`, auth server).
