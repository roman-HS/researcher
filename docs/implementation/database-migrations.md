# Database migrations

Handoff for schema changes using Drizzle Kit and Supabase CLI. Migrations live in `supabase/migrations/` (including `meta/`) and are committed to source control.

## Prerequisites

- `.env.local` with `DATABASE_DIRECT_URL` (session pooler, port 5432) and `DATABASE_URL` (transaction pooler, port 6543)
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed locally

## Local workflow

1. **Change schema** — edit files under `src/db/schema/`.
2. **Generate migration** — `pnpm db:generate`  
   Drizzle Kit writes timestamped SQL to `supabase/migrations/`.
3. **Review SQL** — read the generated file; prefer additive changes in V1.
4. **Apply locally** — `pnpm db:push` (alias: `pnpm db:migrate`)  
   Runs `supabase db push` against `DATABASE_DIRECT_URL` from `.env.local`.
5. **Verify** — `pnpm db:status` lists applied migrations.
6. **Commit** — include both `*.sql` and `supabase/migrations/meta/` in your PR.

## Production / release

Until Supabase branching is enabled (Story 8.5.5), the project owner runs migrations manually before deploy:

```bash
export DATABASE_DIRECT_URL="postgresql://…"   # production session pooler URL
pnpm db:migrate:prod
```

`db:migrate:prod` reads **only** `DATABASE_DIRECT_URL` from the shell environment — it does not load `.env.local`.

## Scripts

| Command | Purpose |
|---|---|
| `pnpm db:generate` | Generate migration SQL from Drizzle schema |
| `pnpm db:push` | Apply migrations locally (`supabase db push`) |
| `pnpm db:migrate` | Alias for `db:push` |
| `pnpm db:migrate:prod` | Apply migrations to production (explicit env only) |
| `pnpm db:status` | List applied migrations |
| `pnpm db:check-migrations` | Flag destructive SQL in changed migration files |

## Safety checks

CI runs `pnpm db:check-migrations` on every PR. It fails when changed migration files contain statements such as `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, or `ALTER TABLE … DROP`. If a destructive change is intentional, note it in the PR description and get explicit review before merging.

## What not to do

- Do not rewrite migrations that have already been applied and shared.
- Do not use `drizzle-kit migrate` alongside `supabase db push` — Supabase tracks applied migrations in its own table.
- Auto-apply on merge is deferred until Supabase branching and separate environments are configured.

## Auth schema regeneration

Better Auth tables in `src/db/schema/auth.ts` are CLI-generated. After changing `src/modules/auth/auth.config.ts` or enabling plugins:

1. `pnpm auth:generate`
2. `pnpm db:generate`
3. Review and apply with `pnpm db:push`
