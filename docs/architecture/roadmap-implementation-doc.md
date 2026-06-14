# Roadmap Implementation Document — V1 Workflow Builder Platform

## 0. Purpose

This document is the implementation blueprint for **V1** of the real-estate workflow builder platform. It translates the agreed architecture into ordered phases, epics, and short implementation stories.

V1 is a web application where authenticated users can build, publish, and run deterministic real-estate investment workflows using a curated tool catalog. The product starts with manually-authored workflows. AI-created workflows, autonomous agents, caching, data-rights review, broader governance, and multi-client expansion are deferred to V2.

The document assumes the previously agreed architecture decisions remain valid:

- **Application:** Next.js App Router.
- **UI:** shadcn/ui, Tailwind CSS, React Flow for the workflow canvas.
- **Database:** Supabase Postgres.
- **ORM:** Drizzle ORM.
- **Auth:** Better Auth.
- **Validation:** Zod at every trust boundary.
- **External data:** RapidAPI, starting with the private Zillow API.
- **Workflow runtime:** Deterministic, bounded execution of published workflow versions.
- **Execution transport:** Prefer Vercel Workflows if the project deploys on Vercel; keep an internal execution transport abstraction so it can be swapped later.
- **API style:** Route Handlers under `/api/v1/*`, even though the first client is the web app.
- **V1 exclusions:** no caching, no legal/data-rights review, no policy engine, no AI agent-created workflows, no mobile/browser extension/MCP clients, no public SDK, and no automated test stories in this roadmap.

Any proposed RapidAPI endpoint shape, request contract, or response contract in this roadmap is a **planning assumption** and must be double checked at implementation time against the actual RapidAPI/private-Zillow contracts. We assume those contracts will be available when the provider stories are implemented.

## 1. Delivery principles

1. **Build the smallest robust version, not a throwaway prototype.** The V1 scope is intentionally narrow, but the internal boundaries should support the longer-term architecture.
2. **Keep business logic out of UI components.** Pages and components call server-side services; services own workflow, run, provider, and authorization behavior.
3. **Use code-first tools in V1.** Tool definitions, schemas, forms, and executors live in code. Workflows reference those tools by stable keys.
4. **Persist workflow versions immutably.** Published workflow versions are snapshots. Editing after publication creates or updates a draft.
5. **Validate everything with Zod.** Validate environment variables, API bodies, workflow definitions, tool configs, provider DTOs, and execution inputs.
6. **Treat provider data as untrusted.** Provider responses are normalized into internal canonical DTOs before the rest of the app consumes them.
7. **Bound workflow execution.** No arbitrary loops, no uncontrolled fan-out, and no AI decision-making in V1.
8. **Prefer many small stories.** Each story should be individually implementable and reviewable.

---

# Phase 1 — Project foundation and application shell

## Goal

Create the initial Next.js application foundation, UI system, module boundaries, environment handling, and development baseline needed for the rest of the product.

## Epic 1.1 — Next.js application baseline

### Story 1.1.1 — Bootstrap the Next.js app

**Objective:** Create the base web application using the agreed stack.

**Tasks:**

1. Create a new Next.js App Router project with TypeScript.
2. Enable the `src/` directory layout.
3. Add the initial `app` directory structure.
4. Confirm the application starts locally.
5. Add a minimal home route that can later redirect authenticated users into the product.

**Acceptance criteria:**

1. The app runs locally without runtime errors.
2. The project uses TypeScript.
3. The project uses the App Router, not the Pages Router.
4. The initial route renders a basic page.

**Recommendations:**

1. Start with Server Components by default.
2. Add Client Components only when interactivity requires them.
3. Do not add product logic in this story.

**Open questions:**

1. Should the root route eventually be a marketing landing page or immediately redirect to the signed-in product?

### Story 1.1.2 — Configure Tailwind CSS and shadcn/ui

**Objective:** Install and configure the UI foundation for product screens.

**Tasks:**

1. Configure Tailwind CSS.
2. Initialize shadcn/ui.
3. Add the initial component aliases.
4. Add baseline global styles.
5. Add the first shared UI components needed for layout: button, card, input, label, textarea, select, dialog, dropdown menu, badge, table, tabs, toast, separator, skeleton, and alert.

**Acceptance criteria:**

1. Tailwind utility classes work in the application.
2. shadcn/ui components can be imported from the agreed component path.
3. A basic page can render the installed UI primitives.
4. The styling foundation supports light and dark mode even if theme switching is not exposed yet.

**Recommendations:**

1. Keep shadcn components inside the repository instead of wrapping every component immediately.
2. Add wrappers later only where product-specific behavior emerges.

**Open questions:**

1. Should V1 expose a dark-mode toggle, or is system preference enough?

### Story 1.1.3 — Define application route groups

**Objective:** Establish the high-level routing structure before feature work begins.

**Tasks:**

1. Create a public route group for unauthenticated pages.
2. Create an auth route group for sign-in and sign-up screens.
3. Create a protected app route group for workflow product screens.
4. Add placeholder pages for workflows, runs, and settings.
5. Add basic navigation between placeholder pages.

**Acceptance criteria:**

1. Public, auth, and app routes are clearly separated.
2. Product routes live under an authenticated route group.
3. Placeholder pages make the intended app structure visible.
4. Route names are stable enough for later stories to build on.

**Recommendations:**

1. Prefer route groups that keep URLs clean.
2. Avoid deeply nested URLs until the product flows require them.

**Open questions:**

1. Should the product URL structure include a workspace slug in V1, or should workspace context remain implicit?

### Story 1.1.4 — Create the product layout shell

**Objective:** Build the reusable authenticated app shell used by workflows, runs, and settings.

**Tasks:**

1. Create a sidebar or top navigation shell.
2. Add navigation items for workflows, runs, and settings.
3. Add a main content region with consistent spacing.
4. Add a header area that can later show workspace and user controls.
5. Add loading and empty-state primitives.

**Acceptance criteria:**

1. Protected pages render inside the shared app shell.
2. Navigation items are visible and link to placeholder routes.
3. The shell works on common desktop screen sizes.
4. The layout does not depend on any unfinished auth logic.

**Recommendations:**

1. Keep mobile responsiveness basic in V1.
2. Optimize for desktop workflow building first because the canvas experience is desktop-oriented.

**Open questions:**

1. Is a responsive mobile viewer required in V1, even if workflow editing is desktop-first?

### Story 1.1.5 — Define repository module boundaries

**Objective:** Create the internal structure that separates UI, contracts, services, integrations, and database code.

**Tasks:**

1. Create `src/components` for reusable UI components.
2. Create `src/modules` for product domain modules.
3. Create `src/contracts` for shared Zod schemas and DTOs.
4. Create `src/db` for Drizzle schema, migrations, and database client helpers.
5. Create `src/integrations` for external provider clients.
6. Create `src/lib` for generic utilities.
7. Add path aliases for these directories.

**Acceptance criteria:**

1. The folder structure exists and is used by at least one import.
2. Path aliases resolve correctly.
3. The structure makes it clear where future workflow, run, auth, and provider code belongs.
4. No business logic is placed directly inside generic utility folders.

**Recommendations:**

1. Keep `src/modules/*` as the primary home for business services.
2. Use `src/contracts` for types shared by route handlers, services, UI, and executors.

**Open questions:**

1. Should the repository remain a single app for V1, or should it be prepared for a later monorepo with shared packages?

### Story 1.1.6 — Configure TypeScript strictness

**Objective:** Make the codebase type-safe enough to support complex workflow contracts.

**Tasks:**

1. Enable strict TypeScript options.
2. Configure path aliases in `tsconfig`.
3. Add project-wide type-only import conventions if needed.
4. Ensure the default Next.js build passes with strict settings.

**Acceptance criteria:**

1. TypeScript strict mode is enabled.
2. The project builds without TypeScript errors.
3. Path aliases work in server and client modules.
4. Future code cannot silently rely on broad `any` types without an intentional escape hatch.

**Recommendations:**

1. Avoid disabling strict flags to work around early issues.
2. Prefer explicit DTOs and inferred Zod types instead of ad hoc object shapes.

**Open questions:**

1. Should lint rules forbid explicit `any`, or should that be a later hardening step?

### Story 1.1.7 — Add environment variable validation

**Objective:** Create a single server-side source of truth for runtime configuration.

**Tasks:**

1. Create an environment module under `src/lib/env` or `src/config/env`.
2. Define a Zod schema for required variables.
3. Add placeholders for database URL, Better Auth secret, app URL, RapidAPI host, RapidAPI key, execution transport settings, and node environment.
4. Parse environment variables once on server startup.
5. Ensure missing required variables fail loudly.

**Acceptance criteria:**

1. Server-side code imports validated config from one module.
2. Missing required variables produce a clear error.
3. Secret values are not logged.
4. Client-exposed variables are explicitly separated from server-only variables.

**Recommendations:**

1. Do not read `process.env` throughout the codebase.
2. Avoid fallback secrets in local development; require developers to define them intentionally.

**Open questions:**

1. Will local development use local Supabase, cloud Supabase, or both?

### Story 1.1.8 — Configure lint, format, and build scripts

**Objective:** Establish the basic development quality gate without adding test work.

**Tasks:**

1. Add lint script.
2. Add format script.
3. Add type-check script.
4. Add production build script.
5. Add a single command that runs lint, type-check, and build.
6. Add a minimal pull-request CI workflow for those scripts.

**Acceptance criteria:**

1. Developers can run a single quality command locally.
2. CI fails when lint, type-check, or build fails.
3. No automated test story is introduced.
4. The CI workflow does not require external provider credentials.

**Recommendations:**

1. Keep this gate fast and deterministic.
2. Do not block early work on exhaustive style rules.

**Open questions:**

1. Which Git provider will host the repository?
2. Should CI run on every push or only pull requests?

### Story 1.1.9 — Create phase-summary.md for Phase 1

**Objective:** Capture the final state of the foundation phase.

**Tasks:**

1. Create a concise `phase-summary.md` for Phase 1.
2. List what was completed.
3. List any setup deviations from this roadmap.
4. List unresolved decisions needed by Phase 2.

**Acceptance criteria:**

1. The summary is under one page.
2. The summary is factual and concise.
3. No additional documentation files are created for the phase.

**Recommendations:**

1. Treat the summary as a handoff note, not a design essay.

**Open questions:**

1. None expected unless the project stack changed during setup.

---

# Phase 2 — Database, authentication, and workspace ownership

## Goal

Create the persistent foundation for users, sessions, workspaces, memberships, authorization, and protected application access.

## Epic 2.1 — Supabase and Drizzle foundation

### Story 2.1.1 — Provision Supabase projects

**Objective:** Prepare Supabase Postgres environments for development and production.

**Tasks:**

1. Create the development Supabase project.
2. Create the production Supabase project if production access is already available.
3. Capture database connection strings in environment variables.
4. Confirm the app can connect from local development.
5. Decide whether Supabase Data API should remain enabled or disabled for V1.

**Acceptance criteria:**

1. Development database connectivity is available.
2. Production database setup is either complete or explicitly deferred.
3. Connection strings are not committed to the repository.
4. The app has a clear database target for local development.

**Recommendations:**

1. Use Supabase primarily as managed Postgres in V1.
2. Access domain tables through server-side Drizzle code, not direct browser database calls.

**Open questions:**

1. Should preview deployments use the development database or a separate staging database?

### Story 2.1.2 — Configure Drizzle ORM

**Objective:** Add Drizzle as the application data-access layer.

**Tasks:**

1. Install Drizzle ORM and Drizzle Kit.
2. Add a Drizzle configuration file.
3. Create a database schema entry point.
4. Create a database client module.
5. Add migration generation and migration apply scripts.

**Acceptance criteria:**

1. Drizzle can connect to Supabase Postgres.
2. Drizzle schema files are discoverable by the migration tool.
3. Migration scripts are documented in package scripts.
4. Application code can import one database client.

**Recommendations:**

1. Keep schema definitions split by domain once they grow.
2. Avoid raw SQL until Drizzle cannot express a needed feature cleanly.

**Open questions:**

1. Should Drizzle use `postgres.js`, `node-postgres`, or the connection approach preferred by the deployment target?

### Story 2.1.3 — Create shared database conventions

**Objective:** Standardize IDs, timestamps, status fields, and JSON columns before domain tables are added.

**Tasks:**

1. Decide the primary ID type for application tables.
2. Create reusable timestamp column helpers.
3. Define status enum conventions.
4. Define JSONB column conventions for snapshots and raw payloads.
5. Define soft-delete or archive conventions.

**Acceptance criteria:**

1. New tables can reuse consistent ID and timestamp patterns.
2. Archive behavior is preferred over destructive delete for key domain objects.
3. JSONB usage is intentional and named clearly.
4. Status values are constrained with enums or equivalent Drizzle definitions.

**Recommendations:**

1. Use UUIDs for application-owned entities.
2. Preserve external provider IDs in separate fields instead of using them as primary keys.

**Open questions:**

1. Should IDs be generated by Postgres or in application code?

### Story 2.1.4 — Add migration workflow

**Objective:** Make database changes repeatable across environments.

**Tasks:**

1. Add commands to generate migrations.
2. Add commands to apply migrations.
3. Add a clear local development workflow for applying migrations.
4. Add a production migration command that can be run during release.
5. Confirm migrations are committed to the repository.

**Acceptance criteria:**

1. A developer can create and apply a migration locally.
2. Migrations are versioned in source control.
3. Production migration execution is a deliberate step.
4. No destructive migration is introduced without explicit review.

**Recommendations:**

1. Prefer additive migrations in V1.
2. Avoid rewriting already-applied migrations after they have been shared.

**Open questions:**

1. Who will run production migrations during the first release?

## Epic 2.2 — Better Auth integration

### Story 2.2.1 — Add Better Auth database schema

**Objective:** Create the persistence required by Better Auth.

**Tasks:**

1. Add Better Auth schema definitions compatible with Drizzle.
2. Include user, session, account, and verification tables as required by the selected Better Auth configuration.
3. Generate a migration for the auth tables.
4. Apply the migration to the development database.
5. Confirm the schema names do not conflict with domain tables.

**Acceptance criteria:**

1. Auth tables exist in the database.
2. Drizzle knows about the auth tables.
3. Better Auth can use the configured adapter.
4. Domain tables and auth tables have clear ownership.

**Recommendations:**

1. Use Better Auth defaults unless there is a strong product reason to customize them.
2. Avoid adding organization plugins in V1 unless needed for the personal workspace model.

**Open questions:**

1. Should V1 require email verification before users can run workflows?

### Story 2.2.2 — Mount Better Auth route handlers

**Objective:** Expose authentication endpoints under the Next.js app.

**Tasks:**

1. Create the Better Auth server instance.
2. Configure the Drizzle adapter.
3. Configure app URL and trusted origins.
4. Mount the catch-all auth route under `/api/auth/*`.
5. Confirm auth route handlers respond correctly.

**Acceptance criteria:**

1. The auth API route exists.
2. Better Auth has access to the database.
3. Session cookies are configured for the environment.
4. Auth route errors are visible enough for debugging without leaking secrets.

**Recommendations:**

1. Keep the auth configuration centralized.
2. Use environment-aware cookie settings for local and production.

**Open questions:**

1. Will the production app use a custom domain from day one?

### Story 2.2.3 — Build sign-up and sign-in screens

**Objective:** Allow users to create an account and access the product.

**Tasks:**

1. Build a sign-up page.
2. Build a sign-in page.
3. Add email and password fields.
4. Add form validation with Zod.
5. Show clear error messages for invalid credentials or failed account creation.
6. Redirect successful sessions into the product shell.

**Acceptance criteria:**

1. A new user can sign up.
2. An existing user can sign in.
3. Form inputs are validated before submission.
4. Errors are shown in the UI.
5. Successful auth redirects to the authenticated app.

**Recommendations:**

1. Start with email/password only.
2. Defer social login, passkeys, SSO, and magic links.

**Open questions:**

1. Is password reset required before the first internal release?

### Story 2.2.4 — Add server-side session helpers

**Objective:** Provide a reusable way to resolve the current user in server code.

**Tasks:**

1. Create a `getCurrentSession` helper.
2. Create a `requireUser` helper.
3. Make helpers usable from Route Handlers and Server Components.
4. Ensure unauthenticated requests receive a consistent unauthorized response.
5. Ensure protected pages redirect unauthenticated users to sign in.

**Acceptance criteria:**

1. Server code can resolve the current session consistently.
2. API routes can reject unauthenticated requests consistently.
3. Protected pages cannot be viewed by unauthenticated users.
4. Session helper code does not duplicate Better Auth configuration.

**Recommendations:**

1. Keep auth resolution close to server boundaries.
2. Avoid passing raw session objects deep into unrelated UI components.

**Open questions:**

1. Should expired sessions redirect silently or show an explicit session-expired message?

## Epic 2.3 — Workspace and authorization model

### Story 2.3.1 — Create workspace tables

**Objective:** Add the ownership model for workflows and runs.

**Tasks:**

1. Create a `workspaces` table.
2. Create a `workspace_members` table.
3. Add fields for owner/member roles.
4. Add created and updated timestamps.
5. Add indexes for user-to-workspace lookup.
6. Generate and apply the migration.

**Acceptance criteria:**

1. Workspaces can be persisted.
2. Users can belong to workspaces through membership rows.
3. Roles are constrained to known values.
4. Lookups for a user’s workspaces are efficient enough for V1.

**Recommendations:**

1. Implement personal workspaces in V1 but keep the model collaboration-ready.
2. Avoid exposing invites or team management until a later release.

**Open questions:**

1. Should a user be allowed to create multiple workspaces in V1, or only one personal workspace?

### Story 2.3.2 — Provision a personal workspace for each user

**Objective:** Ensure every authenticated user has a workspace context.

**Tasks:**

1. Add a service that creates a personal workspace for a user.
2. Trigger workspace creation after successful sign-up or first authenticated access.
3. Add a fallback repair path if a user exists without a workspace.
4. Set the user as workspace owner.
5. Make the current workspace resolvable for product routes.

**Acceptance criteria:**

1. New users receive a personal workspace.
2. Existing users without a workspace can be repaired automatically.
3. The app can determine the current workspace for every authenticated request.
4. Duplicate personal workspaces are not created accidentally.

**Recommendations:**

1. Use an idempotent workspace provisioning service.
2. Keep user onboarding minimal for V1.

**Open questions:**

1. Should personal workspace names be editable in V1?

### Story 2.3.3 — Add workspace authorization helpers

**Objective:** Centralize authorization decisions for workspace-owned resources.

**Tasks:**

1. Create `requireWorkspaceMember`.
2. Create `requireWorkspaceOwner`.
3. Add helpers to check workflow ownership by workspace.
4. Add helpers to check run ownership by workspace.
5. Return consistent forbidden responses when a user lacks access.

**Acceptance criteria:**

1. Route Handlers can enforce workspace access with one helper call.
2. Workflow and run access is scoped by workspace.
3. Unauthorized and forbidden cases are distinct.
4. Authorization rules are not duplicated across pages.

**Recommendations:**

1. Use service-layer authorization for mutations.
2. Do not rely only on UI hiding for access control.

**Open questions:**

1. Are owner and member roles enough for V1?

### Story 2.3.4 — Protect the app shell with auth and workspace context

**Objective:** Prevent unauthenticated or unprovisioned users from entering product pages.

**Tasks:**

1. Update the protected layout to require a session.
2. Resolve the current workspace in the layout or a server-side provider.
3. Redirect unauthenticated users to sign in.
4. Handle missing workspace by calling the provisioning service.
5. Display basic user and workspace context in the shell.

**Acceptance criteria:**

1. Product pages require authentication.
2. Product pages have workspace context available.
3. Users without a workspace are repaired or shown a clear error.
4. The app shell displays the current user or workspace indicator.

**Recommendations:**

1. Keep workspace switching out of V1 unless multiple workspaces are exposed.
2. Use a simple user menu for sign-out.

**Open questions:**

1. Should user profile settings exist in V1 or only sign-out?

### Story 2.3.5 — Create phase-summary.md for Phase 2

**Objective:** Capture the final state of database, auth, and workspace setup.

**Tasks:**

1. Create a concise `phase-summary.md` for Phase 2.
2. List completed database/auth/workspace capabilities.
3. List unresolved auth or workspace decisions.
4. List any environment assumptions that changed.

**Acceptance criteria:**

1. The summary is under one page.
2. The summary identifies the current auth and authorization behavior.
3. No additional documentation files are created for the phase.

**Recommendations:**

1. Include migration names or identifiers if useful for handoff.

**Open questions:**

1. None expected unless auth or workspace assumptions changed.

---

# Phase 3 — API conventions, contracts, and tool registry

## Goal

Create the shared contract foundation for API routes, errors, Zod schemas, canonical DTOs, and the code-first tool catalog.

## Epic 3.1 — API conventions and route helpers

### Story 3.1.1 — Define API response envelopes

**Objective:** Standardize API success and error responses across `/api/v1/*`.

**Tasks:**

1. Define a success envelope shape.
2. Define an error envelope shape.
3. Define common error codes.
4. Define a validation error shape for Zod failures.
5. Add helper functions for success and error JSON responses.

**Acceptance criteria:**

1. API routes can return consistent success envelopes.
2. API routes can return consistent error envelopes.
3. Zod validation errors are mapped into predictable API responses.
4. The envelope shape is reusable by future clients.

**Recommendations:**

1. Use a stable `code`, `message`, and optional `details` structure for errors.
2. Avoid leaking internal stack traces to clients.

**Open questions:**

1. Should API errors include a request ID in V1?

### Story 3.1.2 — Define pagination conventions

**Objective:** Create one pagination pattern for list endpoints.

**Tasks:**

1. Choose cursor-based or page-based pagination for V1.
2. Define query parameter schemas with Zod.
3. Define response metadata fields.
4. Add reusable pagination helpers.
5. Apply the helpers to placeholder workflow and run list routes later.

**Acceptance criteria:**

1. List endpoints have a standard pagination shape.
2. Invalid pagination parameters are rejected with validation errors.
3. The chosen approach supports workflows and runs.
4. The pattern can later support more clients.

**Recommendations:**

1. Use simple page-based pagination in V1 if list sizes are small.
2. Use cursor-based pagination if run history is expected to grow quickly.

**Open questions:**

1. Do you expect heavy run history during V1, or mostly small internal usage?

### Story 3.1.3 — Create Route Handler wrapper utilities

**Objective:** Reduce repetitive validation, authorization, and error handling in API routes.

**Tasks:**

1. Create a wrapper for authenticated handlers.
2. Add request body parsing with Zod validation.
3. Add query parsing with Zod validation.
4. Normalize thrown application errors into API error envelopes.
5. Add a standard way to pass user and workspace context into service functions.

**Acceptance criteria:**

1. New API routes can validate bodies consistently.
2. New API routes can require authentication consistently.
3. Application errors produce consistent responses.
4. Route files remain thin and readable.

**Recommendations:**

1. Keep route handlers focused on HTTP concerns.
2. Place business behavior in module services.

**Open questions:**

1. Should public API keys or external client authentication be prepared in V1, or deferred entirely?

### Story 3.1.4 — Establish API route namespace

**Objective:** Create the stable V1 API route layout.

**Tasks:**

1. Create `/api/v1/tools` route folder.
2. Create `/api/v1/workflows` route folder.
3. Create `/api/v1/runs` route folder.
4. Add placeholder handlers that return not-implemented responses.
5. Ensure auth-required routes are ready to use the shared wrappers.

**Acceptance criteria:**

1. V1 API routes are namespaced under `/api/v1`.
2. Placeholder routes compile.
3. Route naming is consistent with future web, mobile, extension, or SDK clients.
4. No route contains final business logic yet.

**Recommendations:**

1. Keep API route names resource-oriented.
2. Use server actions only as optional UI conveniences, not as the primary cross-client API.

**Open questions:**

1. Should internal admin routes later use `/api/internal/*` or remain outside V1?

## Epic 3.2 — Shared contracts and canonical DTOs

### Story 3.2.1 — Create shared Zod contract structure

**Objective:** Organize validation schemas so they can be reused across API, UI, services, and executors.

**Tasks:**

1. Create contract folders for API, workflows, tools, runs, providers, and domain DTOs.
2. Define naming conventions for request schemas, response schemas, and internal schemas.
3. Export inferred TypeScript types from Zod schemas.
4. Avoid circular imports between contracts and services.

**Acceptance criteria:**

1. Zod schemas have a predictable location.
2. Types are inferred from schemas where practical.
3. Contracts do not import UI components or service logic.
4. The structure supports future clients.

**Recommendations:**

1. Make schemas the source of truth at runtime boundaries.
2. Do not duplicate TypeScript interfaces when Zod inference is enough.

**Open questions:**

1. Should contracts later be extracted into a shared package for non-web clients?

### Story 3.2.2 — Define base domain primitives

**Objective:** Create reusable primitive schemas used by workflow, provider, and result contracts.

**Tasks:**

1. Define ID schemas.
2. Define timestamp schemas.
3. Define money schemas.
4. Define address schemas.
5. Define geo-coordinate schemas.
6. Define provider-source metadata schemas.

**Acceptance criteria:**

1. Common primitives exist and are reusable.
2. Money, address, and geo values have consistent shapes.
3. Provider metadata can preserve external IDs and provider names.
4. Invalid primitive values are rejected at boundaries.

**Recommendations:**

1. Store money with explicit amount and currency when returned by APIs.
2. Preserve raw external IDs even when normalized data is incomplete.

**Open questions:**

1. Should all V1 financial values assume USD, or should currency be explicit everywhere?

### Story 3.2.3 — Define canonical property DTOs

**Objective:** Create provider-agnostic property shapes used by workflow tools.

**Tasks:**

1. Define `PropertyListingSchema`.
2. Define `PropertyDetailSchema`.
3. Define `ComparablePropertySchema`.
4. Define `ComparableSetSchema`.
5. Define `RentEstimateSchema`.
6. Define optional source fields for raw provider identifiers.

**Acceptance criteria:**

1. Property DTOs are independent of RapidAPI-specific response shapes.
2. Required fields are minimal enough to handle sparse provider data.
3. Optional fields cover common real-estate attributes.
4. Tool executors can use the canonical DTOs without knowing provider internals.

**Recommendations:**

1. Keep canonical DTOs stable and provider-agnostic.
2. Be conservative with required fields because provider payloads may be incomplete.

**Open questions:**

1. Which property fields are mandatory for useful investment analysis in V1?

### Story 3.2.4 — Define canonical analysis DTOs

**Objective:** Create stable shapes for calculated metrics, scores, area aggregates, and summaries.

**Tasks:**

1. Define `MetricBundleSchema`.
2. Define `PropertyScoreSchema`.
3. Define `AreaAggregateSchema`.
4. Define `WorkflowSummarySchema`.
5. Include warning and missing-data fields where applicable.

**Acceptance criteria:**

1. Analysis outputs have typed and validated schemas.
2. Metrics can represent missing or not-applicable values.
3. Scores include reason codes, not only numbers.
4. Summaries can be rendered in the UI without parsing arbitrary text.

**Recommendations:**

1. Make reason codes first-class data for debugging and UX clarity.
2. Avoid LLM-generated summaries in V1.

**Open questions:**

1. Which metrics and score reason codes are required at launch?

## Epic 3.3 — Code-first tool registry

### Story 3.3.1 — Define the tool definition interface

**Objective:** Create the common shape for all available workflow tools.

**Tasks:**

1. Define a stable `toolKey` format.
2. Define metadata fields: name, description, category, icon key, and tags.
3. Define config schema field.
4. Define input and output mode fields.
5. Define executor key field.
6. Define UI inspector component key field.

**Acceptance criteria:**

1. Every tool can be described by the same interface.
2. Tool definitions include enough metadata for the builder palette.
3. Tool definitions include enough schema data for validation.
4. Tool definitions can point to executors without embedding execution code in UI.

**Recommendations:**

1. Keep the registry in code for V1.
2. Do not build database-managed tools yet.

**Open questions:**

1. Should tool keys be namespaced by domain, such as `realEstate.listingSearch`?

### Story 3.3.2 — Create the initial tool categories

**Objective:** Define how tools appear in the builder.

**Tasks:**

1. Define provider tools category.
2. Define enrichment tools category.
3. Define analysis tools category.
4. Define presentation tools category.
5. Define future placeholder categories only if useful for organization.

**Acceptance criteria:**

1. The tool palette can group tools consistently.
2. Each V1 tool belongs to one category.
3. Category names are user-friendly.
4. Categories do not imply unavailable V2 agent behavior.

**Recommendations:**

1. Keep categories simple: Search, Enrich, Analyze, Summarize.
2. Avoid too many categories before there are enough tools.

**Open questions:**

1. Should internal-only tools be hidden from normal users?

### Story 3.3.3 — Register V1 tool placeholders

**Objective:** Add code-first placeholders for the tools needed by V1 workflows.

**Tasks:**

1. Register Listing Search.
2. Register Property Detail.
3. Register Fetch Comparables.
4. Register Estimate Rent.
5. Register Calculate Metrics.
6. Register Score Properties.
7. Register Aggregate Area.
8. Register Generate Summary.

**Acceptance criteria:**

1. The registry returns all planned V1 tools.
2. Each tool has a stable key.
3. Each tool has initial metadata.
4. Each tool has a placeholder config schema.
5. Executor implementation can be added later without changing workflow definitions.

**Recommendations:**

1. Use placeholder schemas that are valid but intentionally minimal.
2. Keep user-facing tool names clear and non-technical.

**Open questions:**

1. Should “Analyze Single Property” be a separate root tool, or should Property Detail support both listing-based and direct property input workflows?

### Story 3.3.4 — Add the tools discovery API

**Objective:** Expose available tools to the builder UI.

**Tasks:**

1. Implement `GET /api/v1/tools`.
2. Return tool metadata needed by the palette.
3. Exclude executor internals from the response.
4. Validate response shape with Zod.
5. Require authentication for the route.

**Acceptance criteria:**

1. Authenticated users can fetch tool metadata.
2. The response includes key, name, description, category, and config UI hints.
3. The response does not expose secrets or provider implementation details.
4. The route uses the standard API envelope.

**Recommendations:**

1. Treat the registry as the source of truth.
2. Do not let the UI hard-code tool availability independently.

**Open questions:**

1. Should tools be filtered by workspace plan later?

## Epic 3.4 — RapidAPI provider foundation

### Story 3.4.1 — Create the RapidAPI client shell

**Objective:** Build the reusable HTTP wrapper for RapidAPI providers.

**Tasks:**

1. Create a RapidAPI client module under `src/integrations/rapidapi`.
2. Read host and key from validated environment config.
3. Inject required RapidAPI headers.
4. Add per-request timeout support.
5. Return structured success and failure results.
6. Ensure secrets are never returned to callers.

**Acceptance criteria:**

1. Provider calls use one shared client wrapper.
2. Required RapidAPI headers are attached centrally.
3. Timeout behavior is configurable.
4. Provider failures are represented consistently.

**Recommendations:**

1. Keep the wrapper generic enough to support more RapidAPI APIs later.
2. Do not create provider-specific logic in the generic wrapper.

**Open questions:**

1. Will V1 use one application-level RapidAPI key, or will workspaces later bring their own keys?

### Story 3.4.2 — Define provider error mapping

**Objective:** Normalize external API failures into application errors.

**Tasks:**

1. Define provider error categories: timeout, rate limited, unauthorized, not found, bad request, provider unavailable, unknown.
2. Map HTTP status codes into those categories.
3. Capture safe provider metadata such as endpoint name and status code.
4. Avoid logging or returning sensitive headers.
5. Make provider errors usable by workflow step failures.

**Acceptance criteria:**

1. Provider failures produce consistent internal error objects.
2. User-facing messages are safe and understandable.
3. Debug metadata is available for operators.
4. Step-run error persistence can store provider error details.

**Recommendations:**

1. Keep raw error bodies out of user-facing messages.
2. Preserve enough metadata to diagnose provider instability.

**Open questions:**

1. Should provider rate-limit errors pause execution or fail immediately in V1?

### Story 3.4.3 — Add private-Zillow contract placeholders

**Objective:** Prepare expected endpoint modules before final contracts are supplied.

**Tasks:**

1. Create a placeholder module for listing search contracts.
2. Create a placeholder module for property detail contracts.
3. Create a placeholder module for comparables contracts.
4. Create a placeholder module for rent estimate contracts.
5. Create an optional placeholder for direct property lookup by address or provider ID.
6. Add comments that all placeholder request and response schemas must be verified during implementation.

**Acceptance criteria:**

1. Expected provider contract modules exist.
2. Placeholders do not pretend to be final contracts.
3. Adapter stories can later replace placeholders with confirmed schemas.
4. The code structure supports more RapidAPI APIs later.

**Recommendations:**

1. Keep provider DTOs separate from canonical domain DTOs.
2. Do not block workflow-builder work on final provider payloads.

**Open questions:**

1. Does the private-Zillow API expose all V1 data needs, or will rent estimates or comparables require another provider?

### Story 3.4.4 — Create phase-summary.md for Phase 3

**Objective:** Capture the final state of API conventions, contracts, registry, and provider shell.

**Tasks:**

1. Create a concise `phase-summary.md` for Phase 3.
2. List completed API conventions.
3. List registered tool placeholders.
4. List provider contract assumptions that still need confirmation.

**Acceptance criteria:**

1. The summary is under one page.
2. The summary clearly identifies which RapidAPI contracts are still placeholders.
3. No additional documentation files are created for the phase.

**Recommendations:**

1. Keep this summary focused on implementation readiness for workflow authoring.

**Open questions:**

1. None expected unless provider scope changed.

---

# Phase 4 — Workflow persistence and authoring APIs

## Goal

Implement the persisted workflow model, immutable workflow versions, workflow definition schema, validation rules, and API routes needed before the visual builder is connected.

## Epic 4.1 — Workflow database model

### Story 4.1.1 — Create workflows table

**Objective:** Persist stable workflow metadata.

**Tasks:**

1. Add a `workflows` table.
2. Include `id`, `workspaceId`, `name`, `description`, `status`, `createdByUserId`, `createdAt`, `updatedAt`, and `archivedAt` fields.
3. Add indexes for workspace and status lookup.
4. Generate and apply the migration.
5. Add Drizzle relations if the project uses them.

**Acceptance criteria:**

1. Workflow metadata can be stored by workspace.
2. Archived workflows can be excluded from normal lists.
3. Each workflow belongs to one workspace.
4. Each workflow records its creator.

**Recommendations:**

1. Use archive semantics instead of hard delete.
2. Keep workflow metadata separate from versioned definitions.

**Open questions:**

1. Should workflow names be unique within a workspace in V1?

### Story 4.1.2 — Create workflow_versions table

**Objective:** Persist immutable workflow definition snapshots.

**Tasks:**

1. Add a `workflow_versions` table.
2. Include `id`, `workflowId`, `versionNumber`, `state`, `definitionJson`, `compiledPlanJson`, `publishedAt`, `createdByUserId`, `createdAt`, and `updatedAt`.
3. Add constraints for version state values.
4. Add indexes for workflow/state lookup.
5. Generate and apply the migration.

**Acceptance criteria:**

1. A workflow can have multiple versions.
2. Draft and published versions are distinguishable.
3. Published versions can be treated as immutable snapshots.
4. Definition JSON is stored on the version row.

**Recommendations:**

1. Store the workflow graph as JSONB in V1.
2. Avoid normalizing nodes and edges into separate tables until the product demands it.

**Open questions:**

1. Should each workflow allow only one active draft at a time?

### Story 4.1.3 — Define workflow status and version state rules

**Objective:** Establish the lifecycle for workflows and workflow versions.

**Tasks:**

1. Define workflow statuses such as active and archived.
2. Define version states such as draft, published, and archived.
3. Decide how drafts are created after a workflow has a published version.
4. Decide how archived workflows behave.
5. Implement constants and Zod enums for these states.

**Acceptance criteria:**

1. Status values are defined in one place.
2. Services can enforce lifecycle transitions.
3. The UI can rely on stable status labels.
4. Invalid status values cannot be persisted by normal service paths.

**Recommendations:**

1. Keep the lifecycle simple in V1.
2. Do not add review, approval, or scheduled publishing states yet.

**Open questions:**

1. Should users be able to unarchive workflows in V1?

## Epic 4.2 — Workflow definition contract

### Story 4.2.1 — Define WorkflowDefinitionSchema

**Objective:** Create the Zod schema for persisted workflow definitions.

**Tasks:**

1. Add a `definitionVersion` field.
2. Define workflow-level metadata fields.
3. Define nodes array schema.
4. Define edges array schema.
5. Define runtime input fields array schema.
6. Define UI layout fields such as node position.
7. Define step config fields keyed by tool key.

**Acceptance criteria:**

1. Workflow definitions can be validated with Zod.
2. Nodes, edges, inputs, configs, and positions have explicit schemas.
3. The schema includes a version number for future migrations.
4. Invalid definitions produce useful validation errors.

**Recommendations:**

1. Keep V1 definition JSON expressive enough for the builder but strict enough for execution.
2. Do not support arbitrary loops, branches, or expressions in this schema.

**Open questions:**

1. Should workflow definitions be exportable as JSON in V1?

### Story 4.2.2 — Define workflow runtime input schema

**Objective:** Allow authors to declare inputs that users provide when running a workflow.

**Tasks:**

1. Support text inputs.
2. Support number inputs.
3. Support boolean inputs.
4. Support select inputs.
5. Include label, key, required flag, default value, and helper text.
6. Validate runtime input definitions with Zod.

**Acceptance criteria:**

1. Authors can define simple runtime inputs.
2. Runtime inputs can be rendered in the run form later.
3. Invalid input definitions are rejected.
4. Each input has a stable key used by parameter bindings.

**Recommendations:**

1. Keep runtime inputs primitive in V1.
2. Defer nested objects, arrays, conditional fields, and advanced expressions.

**Open questions:**

1. Do launch workflows need date ranges, multi-select fields, or address autocomplete?

### Story 4.2.3 — Define parameter binding schema

**Objective:** Let tool step configs use either constants or workflow runtime inputs.

**Tasks:**

1. Define a constant-value binding type.
2. Define a workflow-input binding type.
3. Validate that input bindings reference existing workflow inputs.
4. Reject unsupported expression syntax.
5. Make parameter bindings reusable across tool configs.

**Acceptance criteria:**

1. Step configs can bind values to runtime inputs.
2. Step configs can store fixed constants.
3. Invalid input references are detected before publication.
4. V1 does not support arbitrary expressions.

**Recommendations:**

1. Avoid expression languages in V1.
2. Prefer explicit bindings to keep execution predictable.

**Open questions:**

1. Should any V1 tool need to bind to previous step outputs, or can tools share a working-set model?

### Story 4.2.4 — Define graph validation rules

**Objective:** Specify which workflow graphs are allowed in V1.

**Tasks:**

1. Require one root acquisition step.
2. Prevent cycles.
3. Prevent disconnected execution nodes.
4. Restrict branching unless explicitly supported.
5. Restrict unsupported tool ordering.
6. Require a valid terminal summary or result-producing step.

**Acceptance criteria:**

1. Invalid graphs can be detected by a validator.
2. The validator returns actionable errors.
3. The publish service can block unrunnable definitions.
4. V1 execution semantics remain deterministic.

**Recommendations:**

1. Treat the visual graph as a pipeline in V1.
2. Allow the UI to look visual, but keep runtime rules strict.

**Open questions:**

1. Should the builder prevent invalid edges immediately or allow them and explain errors during validation?

### Story 4.2.5 — Implement workflow definition validation service

**Objective:** Create the server-side service that validates workflow definitions.

**Tasks:**

1. Parse definitions with `WorkflowDefinitionSchema`.
2. Validate node tool keys against the registry.
3. Validate each node config against its tool schema.
4. Validate runtime input bindings.
5. Validate graph rules.
6. Return structured validation errors and warnings.

**Acceptance criteria:**

1. A valid workflow definition passes validation.
2. Unknown tool keys fail validation.
3. Invalid tool config fails validation.
4. Invalid graph shape fails validation.
5. Validation output can be displayed in the UI.

**Recommendations:**

1. Reuse this same validator for save, publish, and run start.
2. Separate blocking errors from warnings.

**Open questions:**

1. Which validation warnings should block publish, if any?

## Epic 4.3 — Workflow services and APIs

### Story 4.3.1 — Implement create workflow service

**Objective:** Allow authenticated users to create a new draft workflow.

**Tasks:**

1. Define the create workflow request schema.
2. Validate name and optional description.
3. Authorize workspace membership.
4. Create a workflow row.
5. Create the first draft workflow version with an empty definition.
6. Return workflow and draft version identifiers.

**Acceptance criteria:**

1. A workspace member can create a workflow.
2. The workflow has an initial draft version.
3. The response uses the standard API envelope.
4. Invalid input is rejected with validation errors.

**Recommendations:**

1. Create workflow and first draft in one transaction.
2. Use a minimal valid empty definition as the initial draft.

**Open questions:**

1. Should a new workflow start from blank or from a selected template?

### Story 4.3.2 — Implement list workflows service

**Objective:** Return workflows owned by the current workspace.

**Tasks:**

1. Define list query parameters.
2. Authorize workspace membership.
3. Exclude archived workflows by default.
4. Include latest draft and latest published version metadata.
5. Add pagination.
6. Sort by updated time descending.

**Acceptance criteria:**

1. Users see only workflows from their workspace.
2. Archived workflows are hidden by default.
3. List results include status and version summary.
4. Pagination follows the shared API convention.

**Recommendations:**

1. Include enough metadata to render the workflows page without extra calls.
2. Avoid loading full definition JSON in list responses.

**Open questions:**

1. Should the workflows list support search by name in V1?

### Story 4.3.3 — Implement get workflow detail service

**Objective:** Return one workflow with the draft or published version needed for editing or viewing.

**Tasks:**

1. Validate the workflow ID parameter.
2. Authorize workspace access.
3. Fetch workflow metadata.
4. Fetch the current draft version if it exists.
5. Fetch current published version metadata if it exists.
6. Return definition JSON for the requested editable version.

**Acceptance criteria:**

1. Users can fetch workflow detail for accessible workflows.
2. Inaccessible workflows return forbidden or not found behavior consistently.
3. The response includes the editable definition.
4. The response does not expose workflows from other workspaces.

**Recommendations:**

1. Treat workflow ID lookups as workspace-scoped.
2. Keep the response specific to what the builder needs.

**Open questions:**

1. Should the API expose both draft and published definitions at once?

### Story 4.3.4 — Implement update draft workflow service

**Objective:** Save edits to a workflow draft.

**Tasks:**

1. Define update request schema.
2. Authorize workspace access.
3. Ensure a draft version exists.
4. Validate the submitted definition.
5. Update draft metadata and definition JSON.
6. Persist validation warnings if the schema includes them.

**Acceptance criteria:**

1. Draft definitions can be saved.
2. Published versions are not modified.
3. Invalid definitions are rejected or saved only if the agreed behavior allows draft warnings.
4. Updated timestamp changes after save.

**Recommendations:**

1. Allow incomplete drafts if they pass basic schema shape validation.
2. Reserve strict execution validation for publish.

**Open questions:**

1. Should invalid drafts be savable, or should all draft saves require a structurally valid definition?

### Story 4.3.5 — Implement publish workflow service

**Objective:** Convert a valid draft into an immutable published version.

**Tasks:**

1. Authorize workspace access.
2. Fetch the current draft version.
3. Run strict workflow validation.
4. Compile the draft into an execution plan.
5. Create or mark a published version.
6. Preserve the published definition snapshot immutably.
7. Return the published version ID.

**Acceptance criteria:**

1. Valid drafts can be published.
2. Invalid drafts cannot be published.
3. Published versions are immutable.
4. The published version has compiled execution metadata.
5. Existing run records remain tied to the version they used.

**Recommendations:**

1. Never execute draft versions.
2. Compile on publish to catch runtime problems early.

**Open questions:**

1. Should publishing create a new version row every time or update the draft state to published?

### Story 4.3.6 — Implement duplicate workflow service

**Objective:** Allow users to copy an existing workflow into a new draft.

**Tasks:**

1. Validate source workflow ID.
2. Authorize workspace access.
3. Select the source definition, preferring draft or published according to request.
4. Create a new workflow row.
5. Create a new draft version with copied definition JSON.
6. Reset version state and metadata appropriately.

**Acceptance criteria:**

1. Users can duplicate accessible workflows.
2. The duplicate is a new workflow, not another version of the original.
3. The duplicate starts as a draft.
4. The original workflow is not modified.

**Recommendations:**

1. Make duplication the primary experimentation mechanism in V1.
2. Avoid complex branching/version forks.

**Open questions:**

1. Should run-form defaults be copied with duplicated workflows?

### Story 4.3.7 — Implement archive workflow service

**Objective:** Let users remove workflows from normal use without deleting records.

**Tasks:**

1. Validate workflow ID.
2. Authorize workspace access.
3. Set workflow status to archived.
4. Set `archivedAt` timestamp.
5. Prevent archived workflows from being run.
6. Exclude archived workflows from normal lists.

**Acceptance criteria:**

1. Users can archive accessible workflows.
2. Archived workflows no longer appear in the default list.
3. Archived workflows cannot be run.
4. Existing run history remains accessible if reached from run pages.

**Recommendations:**

1. Do not hard-delete workflows in V1.
2. Add unarchive only if users need it.

**Open questions:**

1. Should archived workflows be visible through a filter?

### Story 4.3.8 — Implement workflow API routes

**Objective:** Expose workflow services through `/api/v1/workflows`.

**Tasks:**

1. Implement `GET /api/v1/workflows`.
2. Implement `POST /api/v1/workflows`.
3. Implement `GET /api/v1/workflows/:workflowId`.
4. Implement `PATCH /api/v1/workflows/:workflowId/draft`.
5. Implement `POST /api/v1/workflows/:workflowId/publish`.
6. Implement `POST /api/v1/workflows/:workflowId/duplicate`.
7. Implement `DELETE /api/v1/workflows/:workflowId` as archive behavior.

**Acceptance criteria:**

1. Each route validates request input with Zod.
2. Each route requires authentication.
3. Each route enforces workspace access.
4. Each route uses the standard response envelope.
5. Route handlers delegate business behavior to services.

**Recommendations:**

1. Keep route files thin.
2. Use resource-oriented URLs and clear action endpoints only where needed.

**Open questions:**

1. Should archive use `DELETE` semantics or a `POST /archive` action endpoint?

### Story 4.3.9 — Create phase-summary.md for Phase 4

**Objective:** Capture the final state of workflow persistence and APIs.

**Tasks:**

1. Create a concise `phase-summary.md` for Phase 4.
2. List workflow tables and lifecycle behavior delivered.
3. List validation rules implemented.
4. List any workflow authoring API differences from the roadmap.

**Acceptance criteria:**

1. The summary is under one page.
2. The summary identifies exact workflow lifecycle behavior.
3. No additional documentation files are created for the phase.

**Recommendations:**

1. Include known builder constraints so Phase 5 can align the UI.

**Open questions:**

1. None expected unless workflow lifecycle changed.

---

# Phase 5 — Workflow builder UI

## Goal

Implement the user-facing workflow builder: workflow list, creation flow, React Flow canvas, tool palette, input editor, step inspector, validation panel, draft saving, publishing, duplicating, and archiving.

## Epic 5.1 — Workflows home experience

### Story 5.1.1 — Build workflows list page

**Objective:** Show users their available workflows.

**Tasks:**

1. Fetch workflows from `GET /api/v1/workflows`.
2. Render workflow name, description, status, updated time, and version state.
3. Show empty state for users with no workflows.
4. Add actions for create, edit, duplicate, and archive.
5. Add loading and error states.

**Acceptance criteria:**

1. Users can view their workflow list.
2. Empty state explains how to create the first workflow.
3. Each workflow row or card has clear actions.
4. Loading and error states are handled.

**Recommendations:**

1. Optimize the page for quick scanning.
2. Keep filters minimal in V1.

**Open questions:**

1. Should workflows be displayed as a table, card grid, or both?

### Story 5.1.2 — Add create workflow flow

**Objective:** Let users create a new workflow from the workflows page.

**Tasks:**

1. Add a create workflow button.
2. Open a dialog or dedicated page for name and description.
3. Validate form input with Zod.
4. Submit to `POST /api/v1/workflows`.
5. Redirect to the builder for the new draft.

**Acceptance criteria:**

1. Users can create a workflow from the list page.
2. Invalid names are rejected in the UI.
3. Successful creation opens the builder.
4. Errors from the API are displayed clearly.

**Recommendations:**

1. Keep creation lightweight.
2. Do not require choosing all workflow inputs at creation time.

**Open questions:**

1. Should starter templates be selectable here in V1 or added only during launch readiness?

### Story 5.1.3 — Add workflow archive action

**Objective:** Let users archive workflows from the list page.

**Tasks:**

1. Add an archive action to each workflow.
2. Show a confirmation dialog.
3. Call the archive API route.
4. Remove the archived workflow from the default list.
5. Show a success or error toast.

**Acceptance criteria:**

1. Users can archive a workflow intentionally.
2. Confirmation prevents accidental archive.
3. Archived workflows disappear from the default view.
4. API errors are visible.

**Recommendations:**

1. Use archive wording instead of delete wording.
2. Do not implement permanent deletion in V1.

**Open questions:**

1. Should users be able to view archived workflows later?

### Story 5.1.4 — Add workflow duplicate action

**Objective:** Let users quickly copy workflows for experimentation.

**Tasks:**

1. Add a duplicate action to each workflow.
2. Call the duplicate API route.
3. Show progress while duplication is running.
4. Redirect to the new draft workflow.
5. Show an error if duplication fails.

**Acceptance criteria:**

1. Users can duplicate a workflow from the list page.
2. The duplicate opens as a draft.
3. The original workflow remains unchanged.
4. Failure states are handled.

**Recommendations:**

1. Use a generated name such as “Copy of {workflow name}”.
2. Let the user rename it in the builder.

**Open questions:**

1. Should duplicate action prefer the draft or published source definition when both exist?

## Epic 5.2 — Builder canvas foundation

### Story 5.2.1 — Add React Flow to the builder route

**Objective:** Render the workflow definition as an interactive node canvas.

**Tasks:**

1. Install and configure React Flow.
2. Create a builder route for a workflow.
3. Load the workflow detail API response.
4. Map workflow definition nodes and edges into React Flow nodes and edges.
5. Render the canvas with zoom and pan enabled.

**Acceptance criteria:**

1. The builder route loads an existing workflow draft.
2. Nodes and edges render from the saved definition.
3. Users can pan and zoom the canvas.
4. Canvas state remains tied to the workflow definition model.

**Recommendations:**

1. Keep the canvas component isolated as a Client Component.
2. Keep data loading and authorization on the server side when practical.

**Open questions:**

1. Should builder URLs include version IDs or always resolve to the current draft?

### Story 5.2.2 — Implement custom workflow node component

**Objective:** Display tool steps as product-specific nodes.

**Tasks:**

1. Create a custom node component for tool steps.
2. Show tool name, category, and status indicator.
3. Show a warning indicator if the node config is invalid.
4. Support selected and unselected visual states.
5. Expose connection handles according to V1 graph rules.

**Acceptance criteria:**

1. Tool nodes display user-friendly information.
2. Invalid nodes are visually distinguishable.
3. Selected nodes are clearly highlighted.
4. Handles support the planned connection model.

**Recommendations:**

1. Keep node content compact.
2. Put detailed editing in the inspector, not inside the node.

**Open questions:**

1. Should nodes show a short summary of their config in V1?

### Story 5.2.3 — Implement canvas state synchronization

**Objective:** Keep React Flow state and workflow definition state aligned.

**Tasks:**

1. Track nodes and edges in builder state.
2. Convert React Flow changes back into `WorkflowDefinitionSchema` shape.
3. Preserve node positions in the definition.
4. Mark the workflow as dirty after local changes.
5. Prevent accidental loss of unsaved edits.

**Acceptance criteria:**

1. Moving nodes updates local builder state.
2. Adding or removing edges updates local builder state.
3. Unsaved changes are tracked.
4. Saved definitions preserve layout.

**Recommendations:**

1. Keep one canonical client-side workflow definition object.
2. Avoid duplicating the graph in multiple incompatible states.

**Open questions:**

1. Should autosave be enabled in V1, or should saving be explicit?

### Story 5.2.4 — Add basic canvas controls

**Objective:** Provide the minimum controls needed to navigate and manage the canvas.

**Tasks:**

1. Add zoom controls.
2. Add fit-to-view control.
3. Add a minimap only if it does not add complexity.
4. Add delete selected node behavior.
5. Add confirmation or guardrails for deleting connected nodes.

**Acceptance criteria:**

1. Users can navigate the canvas easily.
2. Users can delete selected steps.
3. Deleting a node updates edges consistently.
4. The UI does not leave orphaned invalid state without warning.

**Recommendations:**

1. Keep controls minimal at first.
2. Do not build auto-layout in V1 unless the canvas becomes hard to use.

**Open questions:**

1. Is auto-layout needed for launch demos?

## Epic 5.3 — Tool palette and step editing

### Story 5.3.1 — Build tool palette

**Objective:** Let users browse available tools inside the builder.

**Tasks:**

1. Fetch tools from `GET /api/v1/tools`.
2. Group tools by category.
3. Render tool name and description.
4. Add an action to insert a tool into the canvas.
5. Show unavailable or placeholder tools only if they are executable in V1.

**Acceptance criteria:**

1. The builder displays the V1 tool catalog.
2. Tools are grouped clearly.
3. Users can add a tool to the canvas.
4. The palette does not show tools that cannot be executed.

**Recommendations:**

1. Use click-to-add in V1.
2. Defer drag-from-palette if it slows delivery.

**Open questions:**

1. Should tool descriptions be written for technical or non-technical users?

### Story 5.3.2 — Implement step insertion behavior

**Objective:** Add selected tools to the workflow definition as configured nodes.

**Tasks:**

1. Generate a unique node ID.
2. Set the node tool key.
3. Apply default config from the tool registry.
4. Place the node in a reasonable canvas position.
5. Select the new node after insertion.
6. Mark the workflow as dirty.

**Acceptance criteria:**

1. Inserted nodes appear on the canvas.
2. Inserted nodes have valid default config where possible.
3. Inserted nodes can be selected and edited.
4. The workflow can later be saved with the new node.

**Recommendations:**

1. Keep default configs minimal but valid.
2. Select newly inserted nodes to guide the user into configuration.

**Open questions:**

1. Should the first inserted root tool be placed differently from later tools?

### Story 5.3.3 — Build selected-step inspector shell

**Objective:** Provide a dedicated editing area for selected node configuration.

**Tasks:**

1. Add a right-side inspector panel or drawer.
2. Show selected step name and description.
3. Show a placeholder when no step is selected.
4. Add common controls for step label and optional notes.
5. Provide a region for tool-specific config forms.

**Acceptance criteria:**

1. Selecting a node opens or updates the inspector.
2. The inspector shows useful step information.
3. Users can edit common step fields.
4. No selected step state is handled gracefully.

**Recommendations:**

1. Use a persistent right panel on desktop.
2. Avoid modal-only editing because workflows require context.

**Open questions:**

1. Should step labels be editable or always derived from tool names?

### Story 5.3.4 — Build Listing Search inspector form

**Objective:** Let users configure the listing search root tool.

**Tasks:**

1. Add fields for location source.
2. Add fields for listing filters supported by the placeholder schema.
3. Support binding location to a runtime input.
4. Support constant default values where useful.
5. Validate config with the tool Zod schema.
6. Show validation errors inline.

**Acceptance criteria:**

1. Users can configure listing search parameters.
2. Users can bind search parameters to workflow inputs.
3. Invalid config is shown before save or publish.
4. The form updates the selected node config.

**Recommendations:**

1. Keep the form aligned with available RapidAPI contract fields.
2. Do not add filter fields until the provider contract confirms they exist.

**Open questions:**

1. Which search types are supported by the provider: ZIP, city/state, free text, coordinates, or polygon?

### Story 5.3.5 — Build Property Detail inspector form

**Objective:** Let users configure property detail enrichment behavior.

**Tasks:**

1. Add a mode field for listing-based enrichment.
2. Add optional direct property lookup config if supported.
3. Allow limiting enriched property count.
4. Validate config with the tool Zod schema.
5. Show warnings when the tool has no compatible upstream step.

**Acceptance criteria:**

1. Property detail tool config can be edited.
2. The tool supports the agreed V1 source mode.
3. Invalid config is shown to the user.
4. The form updates workflow definition state.

**Recommendations:**

1. Use listing-based enrichment as the default.
2. Add direct lookup only if the provider contract supports it.

**Open questions:**

1. Should single-property analysis be a first-class V1 workflow type?

### Story 5.3.6 — Build Comparables inspector form

**Objective:** Let users configure comparable-property fetching.

**Tasks:**

1. Add fields for maximum comparable count.
2. Add fields for radius or distance if supported.
3. Add fields for sale/rent comparable mode if supported.
4. Validate config with the tool Zod schema.
5. Show inline guidance about provider limitations.

**Acceptance criteria:**

1. Users can configure comparables behavior.
2. Invalid comparable config is rejected in the form.
3. Unsupported provider assumptions are not exposed as guaranteed features.
4. The form updates the selected node config.

**Recommendations:**

1. Keep defaults conservative to limit provider fan-out.
2. Avoid complex comparable adjustment logic in the inspector.

**Open questions:**

1. Does the provider return sale comps, rent comps, or both?

### Story 5.3.7 — Build Rent Estimate inspector form

**Objective:** Let users configure rent estimate behavior.

**Tasks:**

1. Add fields for estimate source mode if needed.
2. Add optional fallback behavior if rent estimate is missing.
3. Add maximum property count limit if applicable.
4. Validate config with the tool Zod schema.
5. Show missing-provider-capability warning if the endpoint is not confirmed.

**Acceptance criteria:**

1. Rent estimate tool config can be edited.
2. Missing or invalid config is shown clearly.
3. The form reflects confirmed provider capabilities once contracts are available.
4. The selected node config updates correctly.

**Recommendations:**

1. Support estimate ranges in the underlying DTO even if the UI first shows one value.
2. Avoid implying precision that the provider does not guarantee.

**Open questions:**

1. Does the provider expose confidence scores, estimate ranges, or only point estimates?

### Story 5.3.8 — Build Metrics inspector form

**Objective:** Let users configure assumptions for investment metric calculations.

**Tasks:**

1. Add fields for down payment percentage.
2. Add fields for interest rate.
3. Add fields for loan term.
4. Add fields for vacancy, repairs, insurance, property management, taxes, HOA, and closing assumptions as needed.
5. Allow constants and workflow-input bindings for key assumptions.
6. Validate config with the tool Zod schema.

**Acceptance criteria:**

1. Users can configure metric assumptions.
2. Invalid numeric assumptions are rejected.
3. Assumptions can be reused by the execution engine.
4. The UI makes it clear these are analysis assumptions, not provider facts.

**Recommendations:**

1. Start with a default underwriting profile.
2. Keep formulas deterministic and transparent.

**Open questions:**

1. Which assumptions are mandatory for the first launch workflows?

### Story 5.3.9 — Build Scoring inspector form

**Objective:** Let users configure property scoring weights.

**Tasks:**

1. Add fields for score weights.
2. Add fields for threshold values where needed.
3. Add a reset-to-default action.
4. Validate weights with the tool Zod schema.
5. Show a simple explanation of how score configuration affects results.

**Acceptance criteria:**

1. Users can edit scoring config.
2. Invalid weights or thresholds are rejected.
3. Users can restore default scoring configuration.
4. Config updates are saved in workflow definition state.

**Recommendations:**

1. Ship one default scorecard in V1.
2. Keep multiple named scorecards for a later release.

**Open questions:**

1. Should all weights total 100, or can they be normalized automatically?

### Story 5.3.10 — Build Area Aggregation inspector form

**Objective:** Let users configure area-level aggregation behavior.

**Tasks:**

1. Add fields for grouping level such as ZIP or city if supported by available data.
2. Add fields for minimum sample size.
3. Add selectable aggregate metrics.
4. Validate config with the tool Zod schema.
5. Show warnings when upstream workflow does not produce enough properties.

**Acceptance criteria:**

1. Users can configure area aggregation.
2. Invalid grouping or sample-size settings are rejected.
3. The tool can support zip-code investment workflows.
4. The form updates workflow definition state.

**Recommendations:**

1. Derive area aggregates from the run working set in V1.
2. Do not add a separate market-data provider unless necessary.

**Open questions:**

1. Is ZIP-level analysis enough for V1, or are neighborhoods required?

### Story 5.3.11 — Build Summary inspector form

**Objective:** Let users configure final deterministic summary output.

**Tasks:**

1. Add fields for summary title.
2. Add options for included sections.
3. Add options for top property count.
4. Validate config with the tool Zod schema.
5. Make it clear summaries are deterministic in V1.

**Acceptance criteria:**

1. Users can configure summary output.
2. Invalid summary config is rejected.
3. The summary tool can act as the terminal presentation step.
4. The form updates workflow definition state.

**Recommendations:**

1. Output structured summary data plus Markdown.
2. Defer LLM-generated summaries to V2.

**Open questions:**

1. Should the summary include markdown export in V1?

## Epic 5.4 — Builder validation, save, and publish

### Story 5.4.1 — Add builder validation panel

**Objective:** Show workflow validation errors and warnings to the author.

**Tasks:**

1. Run client-side validation when the graph changes.
2. Display blocking errors.
3. Display non-blocking warnings.
4. Link validation messages to affected nodes when possible.
5. Add a global validation status in the builder header.

**Acceptance criteria:**

1. Users can see why a workflow is invalid.
2. Validation messages are actionable.
3. Node-specific issues are easy to locate.
4. Publish eligibility is clear.

**Recommendations:**

1. Use the same validation logic or contracts as the server where possible.
2. Always run server-side validation again on save and publish.

**Open questions:**

1. Which warnings should be visible but still allow publishing?

### Story 5.4.2 — Implement save draft button

**Objective:** Persist builder changes to the current draft version.

**Tasks:**

1. Add a save draft button.
2. Submit the current definition to the update draft API.
3. Show saving, saved, and failed states.
4. Clear dirty state on successful save.
5. Keep the user on the builder page after save.

**Acceptance criteria:**

1. Users can save draft changes.
2. Successful saves update the server draft.
3. Failed saves preserve local changes.
4. Dirty state reflects save status accurately.

**Recommendations:**

1. Start with explicit save.
2. Add autosave later only if users need it.

**Open questions:**

1. Should unsaved-change navigation protection be enabled in V1?

### Story 5.4.3 — Implement publish workflow UI

**Objective:** Let users publish a valid workflow from the builder.

**Tasks:**

1. Add a publish button.
2. Disable or warn when validation errors exist.
3. Call the publish API route.
4. Show publish progress.
5. Show success state with published version metadata.
6. Show validation errors returned by the server.

**Acceptance criteria:**

1. Valid workflows can be published.
2. Invalid workflows cannot be published.
3. Server validation errors are visible in the builder.
4. Published status updates in the UI.

**Recommendations:**

1. Treat server validation as authoritative.
2. Make publish a deliberate action, not automatic after save.

**Open questions:**

1. Should users add a publish note in V1?

### Story 5.4.4 — Add builder duplicate action

**Objective:** Let users duplicate the current workflow from inside the builder.

**Tasks:**

1. Add duplicate action in builder header or menu.
2. Call duplicate workflow API.
3. Redirect to the duplicated workflow draft.
4. Preserve unsaved-change warning behavior.
5. Show errors clearly.

**Acceptance criteria:**

1. Users can duplicate while viewing a workflow.
2. The new copy opens in draft mode.
3. The original workflow remains unchanged.
4. Failure states are handled.

**Recommendations:**

1. Encourage duplicate-and-edit for experimentation.
2. Avoid building version branching in V1.

**Open questions:**

1. If the current draft has unsaved changes, should duplication use local state or last saved state?

### Story 5.4.5 — Add builder archive action

**Objective:** Let users archive a workflow from the builder.

**Tasks:**

1. Add archive action in the builder menu.
2. Show a confirmation dialog.
3. Call archive API.
4. Redirect back to workflow list after success.
5. Show errors clearly.

**Acceptance criteria:**

1. Users can archive from the builder.
2. Confirmation prevents accidental archive.
3. Archived workflow is no longer editable by default.
4. The user returns to a sensible page after archive.

**Recommendations:**

1. Use the same archive service as the list page.
2. Do not add hard delete.

**Open questions:**

1. Should archive be hidden for workflows with recent runs?

### Story 5.4.6 — Create phase-summary.md for Phase 5

**Objective:** Capture the final state of the workflow builder UI.

**Tasks:**

1. Create a concise `phase-summary.md` for Phase 5.
2. List builder capabilities delivered.
3. List tool inspector forms completed.
4. List any UX limitations or deferred builder features.

**Acceptance criteria:**

1. The summary is under one page.
2. The summary identifies any builder behavior that execution should not assume.
3. No additional documentation files are created for the phase.

**Recommendations:**

1. Include any mismatch between UI validation and server validation.

**Open questions:**

1. None expected unless builder scope changed.

---

# Phase 6 — Provider adapters and deterministic tool executors

## Goal

Implement the first real tool executors, map RapidAPI/private-Zillow responses into canonical DTOs, and create deterministic internal analysis tools.

## HERE ------ Epic 6.1 — Provider contract confirmation

### Story 6.1.1 — Confirm private-Zillow listing search contract

**Objective:** Replace the listing search placeholder with the actual RapidAPI contract.

**Tasks:**

1. Review the provider endpoint documentation.
2. Capture required request parameters.
3. Capture optional request parameters.
4. Capture the response body shape.
5. Update the provider request Zod schema.
6. Update the provider response Zod schema.
7. Mark unsupported builder fields for removal or hiding.

**Acceptance criteria:**

1. Listing search request schema reflects the actual provider contract.
2. Listing search response schema reflects the actual provider contract.
3. Unsupported fields are not exposed as usable config.
4. The adapter has enough information to normalize listings.

**Recommendations:**

1. Double check the live RapidAPI contract at implementation time.
2. Keep provider schemas separate from canonical DTOs.

**Open questions:**

1. Which location search modes does the endpoint actually support?

### Story 6.1.2 — Confirm private-Zillow property detail contract

**Objective:** Replace the property detail placeholder with the actual provider contract.

**Tasks:**

1. Review required lookup identifiers.
2. Confirm whether lookup by provider ID is supported.
3. Confirm whether lookup by address is supported.
4. Capture response body shape.
5. Update request and response Zod schemas.
6. Update builder config if unsupported modes exist.

**Acceptance criteria:**

1. Property detail schemas reflect the actual provider contract.
2. Supported lookup modes are clear.
3. Unsupported lookup modes are removed or disabled.
4. The adapter can normalize details into canonical DTOs.

**Recommendations:**

1. Prefer provider ID lookup when listing search already returns a stable ID.
2. Treat address lookup as optional until confirmed.

**Open questions:**

1. Can V1 support direct single-property workflows with this endpoint alone?

### Story 6.1.3 — Confirm private-Zillow comparables contract

**Objective:** Replace the comparables placeholder with the actual provider contract.

**Tasks:**

1. Review required request parameters.
2. Confirm sale-comparable and rent-comparable support.
3. Confirm available filters such as radius, count, and property type.
4. Capture response body shape.
5. Update request and response Zod schemas.
6. Update the comparables inspector form if needed.

**Acceptance criteria:**

1. Comparables schemas reflect the actual provider contract.
2. The app knows whether comps are sale, rent, or mixed.
3. Unsupported config options are hidden or removed.
4. The adapter can normalize comparable sets.

**Recommendations:**

1. Keep comparable normalization tolerant of sparse data.
2. Store enough comparable summary data for later metrics.

**Open questions:**

1. Does the endpoint expose confidence, similarity, or distance metadata?

### Story 6.1.4 — Confirm private-Zillow rent estimate contract

**Objective:** Replace the rent estimate placeholder with the actual provider contract.

**Tasks:**

1. Review required request parameters.
2. Confirm whether estimate returns a point value, range, or both.
3. Confirm confidence or metadata fields.
4. Capture response body shape.
5. Update request and response Zod schemas.
6. Update the rent estimate inspector form if needed.

**Acceptance criteria:**

1. Rent estimate schemas reflect the actual provider contract.
2. The canonical rent DTO can represent returned values.
3. Unsupported UI fields are removed or disabled.
4. Missing estimate behavior is defined.

**Recommendations:**

1. Support ranges internally even if the first UI shows a single value.
2. Do not fabricate rent confidence when the provider does not return it.

**Open questions:**

1. Should missing rent estimates fail the property or produce a warning?

## Epic 6.2 — Executor infrastructure

### Story 6.2.1 — Define tool executor interface

**Objective:** Create the shared function contract for all tool executors.

**Tasks:**

1. Define executor input shape.
2. Include workflow run context.
3. Include step config.
4. Include current working set.
5. Define executor output shape.
6. Define standard warnings and item-level errors.

**Acceptance criteria:**

1. Every tool executor can implement the same interface.
2. Executors can read config and working set.
3. Executors can return updated working set data.
4. Executors can return warnings and recoverable item errors.

**Recommendations:**

1. Keep executors deterministic in V1.
2. Avoid UI imports inside executors.

**Open questions:**

1. Should executors return full updated context or only patches?

### Story 6.2.2 — Create execution working-set model

**Objective:** Define the in-memory data structure passed between workflow steps.

**Tasks:**

1. Define working-set fields for listings.
2. Define fields for property details.
3. Define fields for comparables.
4. Define fields for rent estimates.
5. Define fields for metrics.
6. Define fields for scores.
7. Define fields for area aggregates and summary.
8. Add Zod schema for the working-set structure.

**Acceptance criteria:**

1. Steps can share data through a common structure.
2. The working set supports all V1 tools.
3. Missing fields are represented safely.
4. The working set can be persisted partially in run outputs.

**Recommendations:**

1. Use maps keyed by internal property IDs or provider IDs where appropriate.
2. Avoid passing raw provider payloads between internal tools unless necessary.

**Open questions:**

1. What should be the canonical key for a property before detail enrichment is complete?

### Story 6.2.3 — Add executor registry

**Objective:** Map tool keys to executable server-side functions.

**Tasks:**

1. Create an executor registry module.
2. Register each V1 tool key.
3. Ensure every registered tool has an executor placeholder.
4. Add a lookup function that fails clearly for missing executors.
5. Keep executor registry separate from UI registry exports when necessary.

**Acceptance criteria:**

1. The runtime can resolve executors by tool key.
2. Missing executors produce clear errors.
3. The executor registry includes all V1 tools.
4. UI-only metadata is not required by the runtime.

**Recommendations:**

1. Keep the tool metadata registry and executor registry aligned through shared keys.
2. Avoid dynamic code loading in V1.

**Open questions:**

1. Should disabled tools remain registered but unavailable, or be absent entirely?

## Epic 6.3 — Provider-backed tool executors

### Story 6.3.1 — Implement Listing Search executor

**Objective:** Search for properties and initialize the workflow working set.

**Tasks:**

1. Resolve config bindings from runtime inputs.
2. Build the provider request using confirmed contract schema.
3. Call the RapidAPI/private-Zillow listing endpoint.
4. Validate provider response with Zod.
5. Normalize provider listings into `PropertyListing` DTOs.
6. Enforce maximum result count.
7. Return updated working set with listings.

**Acceptance criteria:**

1. Listing Search can produce a working set of property listings.
2. Provider response is validated before normalization.
3. Provider IDs and source metadata are preserved.
4. Result count limits are enforced.
5. Errors are returned in the standard executor shape.

**Recommendations:**

1. Make this a root acquisition tool.
2. Fail the workflow if the root listing search fails.

**Open questions:**

1. What is the maximum listing count allowed per V1 run?

### Story 6.3.2 — Implement Property Detail executor

**Objective:** Enrich listings or direct property references with detailed property data.

**Tasks:**

1. Read target properties from the working set.
2. Resolve maximum enrichment count.
3. Build provider requests for each property.
4. Validate each provider response.
5. Normalize responses into `PropertyDetail` DTOs.
6. Record item-level failures without losing successful details.
7. Return updated working set.

**Acceptance criteria:**

1. Property details are added to the working set.
2. Successful properties continue when some enrichment calls fail if partial behavior allows it.
3. Sparse provider payloads do not crash normalization.
4. Item-level errors are captured.

**Recommendations:**

1. Treat missing optional fields as normal.
2. Use conservative concurrency limits to protect provider quotas.

**Open questions:**

1. Should a high percentage of detail failures fail the whole step?

### Story 6.3.3 — Implement Comparables executor

**Objective:** Fetch comparables for properties in the working set.

**Tasks:**

1. Identify properties eligible for comparables.
2. Resolve comparable config.
3. Call the provider comparables endpoint per property.
4. Validate provider responses.
5. Normalize comparable data into `ComparableSet` DTOs.
6. Attach comparable summaries to the working set.
7. Record item-level errors.

**Acceptance criteria:**

1. Comparable sets are available for eligible properties.
2. Provider responses are validated.
3. Missing comparable data is represented as a warning or item error.
4. Successful comparable sets remain available when some properties fail.

**Recommendations:**

1. Store analytical summaries separately from raw provider payloads where persisted.
2. Keep comparable adjustment calculations out of this executor unless required.

**Open questions:**

1. Should comparable calls run for every listing or only shortlisted properties?

### Story 6.3.4 — Implement Rent Estimate executor

**Objective:** Fetch rent estimate data for properties in the working set.

**Tasks:**

1. Identify properties eligible for rent estimates.
2. Resolve rent estimate config.
3. Call the provider rent estimate endpoint per property.
4. Validate provider responses.
5. Normalize estimates into `RentEstimate` DTOs.
6. Attach estimates to the working set.
7. Record missing estimates and item-level errors.

**Acceptance criteria:**

1. Rent estimates are available where the provider returns them.
2. Point and range estimates are handled if supported.
3. Missing estimates do not crash the run.
4. Item-level errors are persisted later by the runtime.

**Recommendations:**

1. Treat rent estimate quality as an explicit data point if the provider supports it.
2. Do not invent fallback rent values unless a workflow step explicitly defines fallback behavior.

**Open questions:**

1. Should rent estimate be required for metrics calculation, or can metrics mark rent-dependent fields as unavailable?

## Epic 6.4 — Deterministic analysis tool executors

### Story 6.4.1 — Implement Metrics Calculation executor

**Objective:** Compute investment metrics from property, rent, comparable, and assumption data.

**Tasks:**

1. Resolve financing and operating assumptions from config.
2. Identify properties with enough data for calculation.
3. Compute monthly payment if loan assumptions are present.
4. Compute estimated monthly income.
5. Compute estimated expenses.
6. Compute cash flow, cap rate, cash-on-cash return, gross rent multiplier, and other agreed launch metrics.
7. Record missing-data warnings per property.

**Acceptance criteria:**

1. Metrics are calculated deterministically.
2. Missing inputs produce warnings instead of incorrect numbers.
3. Each metric includes enough context for UI display.
4. Metrics are attached to the working set.

**Recommendations:**

1. Keep formulas in a clear formula module.
2. Do not use AI or prompts for V1 financial calculations.

**Open questions:**

1. Which exact metrics are required before launch?

### Story 6.4.2 — Implement Property Scoring executor

**Objective:** Score properties based on metrics and configurable weights.

**Tasks:**

1. Resolve score weights and thresholds.
2. Normalize metric values into score components.
3. Compute a total score.
4. Generate reason codes for strengths and weaknesses.
5. Handle missing metric values explicitly.
6. Attach scores to the working set.

**Acceptance criteria:**

1. Each eligible property receives a score.
2. Scores include reason codes.
3. Missing metrics are handled predictably.
4. Score config influences results as expected.

**Recommendations:**

1. Ship a simple transparent scorecard first.
2. Keep weights configurable but bounded.

**Open questions:**

1. Should missing critical metrics penalize score or make score unavailable?

### Story 6.4.3 — Implement Area Aggregation executor

**Objective:** Summarize property results by area for ZIP or market-level workflows.

**Tasks:**

1. Resolve grouping field from config.
2. Group properties by ZIP, city, or agreed field.
3. Compute counts, averages, medians, and selected metric summaries.
4. Enforce minimum sample size.
5. Record warnings for low sample groups.
6. Attach area aggregates to the working set.

**Acceptance criteria:**

1. Area aggregates are generated from property results.
2. Low-sample areas are flagged.
3. Aggregates can be rendered later in the results UI.
4. The tool does not require a separate market-data provider in V1.

**Recommendations:**

1. Start with ZIP-level grouping if data supports it.
2. Make sample size visible in the output.

**Open questions:**

1. What minimum sample size should make an area summary credible?

### Story 6.4.4 — Implement Summary executor

**Objective:** Generate a deterministic final run summary.

**Tasks:**

1. Resolve summary config.
2. Identify top properties by score or selected metric.
3. Build structured summary sections.
4. Generate deterministic Markdown text.
5. Include warnings and missing-data notes.
6. Attach summary output to the working set.

**Acceptance criteria:**

1. The run produces a final summary object.
2. Summary output is deterministic.
3. Top properties and key findings are included.
4. Warnings are visible in the summary.

**Recommendations:**

1. Keep V1 summary non-LLM.
2. Produce structured data plus Markdown to support UI rendering and export.

**Open questions:**

1. Should top properties be ranked by score only or by a configurable metric?

### Story 6.4.5 — Create phase-summary.md for Phase 6

**Objective:** Capture the final state of provider adapters and executors.

**Tasks:**

1. Create a concise `phase-summary.md` for Phase 6.
2. List confirmed RapidAPI contracts.
3. List implemented provider-backed tools.
4. List implemented deterministic analysis tools.
5. List any provider limitations discovered.

**Acceptance criteria:**

1. The summary is under one page.
2. Contract mismatches are clearly noted.
3. No additional documentation files are created for the phase.

**Recommendations:**

1. Include any provider endpoint assumptions that still need product decisions.

**Open questions:**

1. None expected unless provider availability changed.

---

# Phase 7 — Workflow execution runtime

## Goal

Create the run model, execution engine, status lifecycle, idempotent run creation, step execution, partial-result handling, and run APIs.

## Epic 7.1 — Run persistence model

### Story 7.1.1 — Create workflow_runs table

**Objective:** Persist each workflow execution.

**Tasks:**

1. Add a `workflow_runs` table.
2. Include `id`, `workspaceId`, `workflowId`, `workflowVersionId`, `createdByUserId`, `status`, `inputJson`, `outputSummaryJson`, `errorJson`, `startedAt`, `completedAt`, `createdAt`, and `updatedAt`.
3. Add indexes for workspace, workflow, status, and created time.
4. Generate and apply the migration.

**Acceptance criteria:**

1. Runs can be persisted with workflow version linkage.
2. Runs are workspace-scoped.
3. Runs record input snapshots.
4. Runs can represent pending, running, succeeded, partial, failed, and canceled states if supported.

**Recommendations:**

1. Always link a run to an immutable published version.
2. Store input snapshots to make reruns and debugging possible.

**Open questions:**

1. Is canceled status required in V1, or can it wait?

### Story 7.1.2 — Create workflow_run_steps table

**Objective:** Persist step-level execution history.

**Tasks:**

1. Add a `workflow_run_steps` table.
2. Include `id`, `runId`, `stepNodeId`, `toolKey`, `status`, `inputJson`, `outputJson`, `warningsJson`, `errorJson`, `startedAt`, `completedAt`, and timestamps.
3. Add indexes for run and status lookup.
4. Generate and apply the migration.

**Acceptance criteria:**

1. Each executed step can be tracked.
2. Step status and timings are persisted.
3. Step warnings and errors can be inspected later.
4. Run detail UI can render a timeline from step rows.

**Recommendations:**

1. Persist enough step output for debugging and results display.
2. Avoid storing unnecessary duplicate raw provider payloads unless needed.

**Open questions:**

1. How much raw step output should be visible to users versus operators?

### Story 7.1.3 — Create run result tables

**Objective:** Persist property-level and area-level outputs for efficient result rendering.

**Tasks:**

1. Add a `run_property_results` table.
2. Include run ID, property identifiers, address summary, listing data, detail data, metrics, score, warnings, and errors.
3. Add a `run_area_results` table.
4. Include run ID, area key, aggregate metrics, sample size, warnings, and rank fields if needed.
5. Add indexes for run lookup and score sorting.
6. Generate and apply the migration.

**Acceptance criteria:**

1. Property results can be queried without parsing the whole run output blob.
2. Area results can be queried independently.
3. Results remain linked to the run that produced them.
4. The schema supports sorting by score or key metrics.

**Recommendations:**

1. Store structured result rows for UI performance even without caching.
2. Keep full details in JSONB where the shape may evolve.

**Open questions:**

1. Which fields should be promoted to columns for sorting and filtering in V1?

### Story 7.1.4 — Create run idempotency table

**Objective:** Prevent duplicate runs from repeated client submissions.

**Tasks:**

1. Add a `run_idempotency_keys` table.
2. Store workspace ID, user ID, idempotency key, request hash, run ID, and timestamps.
3. Add a unique constraint for workspace/user/key.
4. Add logic-ready fields for expiration if needed.
5. Generate and apply the migration.

**Acceptance criteria:**

1. Idempotency keys can be stored.
2. Duplicate submissions can resolve to the original run.
3. Conflicting request bodies for the same key can be detected.
4. Run creation can safely retry from the client.

**Recommendations:**

1. Require the web client to send an idempotency key for run creation.
2. Keep retention simple in V1.

**Open questions:**

1. How long should idempotency keys be retained?

## Epic 7.2 — Execution planning and lifecycle

### Story 7.2.1 — Implement published workflow compiler

**Objective:** Convert a validated workflow definition into an ordered execution plan.

**Tasks:**

1. Load the published workflow version.
2. Validate the definition.
3. Sort nodes into execution order.
4. Resolve tool keys and executor references.
5. Build a compiled plan structure.
6. Persist compiled plan JSON on publish if not already done.

**Acceptance criteria:**

1. Published definitions compile into deterministic plans.
2. Invalid definitions fail compilation clearly.
3. Execution order is stable.
4. Compiled plans do not include UI-only data unless needed.

**Recommendations:**

1. Compile on publish and re-validate on run start.
2. Keep compiled plan versioned with the workflow definition.

**Open questions:**

1. Should compiled plans be persisted or always generated at run start?

### Story 7.2.2 — Define run status lifecycle

**Objective:** Establish how run and step statuses transition.

**Tasks:**

1. Define run statuses.
2. Define step statuses.
3. Define allowed transitions.
4. Add service helpers to update status safely.
5. Ensure completed timestamps are set consistently.

**Acceptance criteria:**

1. Run and step statuses are consistent.
2. Invalid transitions are blocked by service logic.
3. Completed states include completion timestamps.
4. Failure states include error information.

**Recommendations:**

1. Include `partial` status for runs with recoverable item-level failures.
2. Keep step status simpler than run status if possible.

**Open questions:**

1. Should a step itself have partial status, or only warnings/errors inside a succeeded step?

### Story 7.2.3 — Implement runtime input validation

**Objective:** Validate user-provided run inputs against the workflow definition.

**Tasks:**

1. Load runtime input definitions from the published version.
2. Build a Zod validation schema dynamically from input definitions.
3. Validate submitted run inputs.
4. Apply default values.
5. Return clear validation errors for invalid inputs.

**Acceptance criteria:**

1. Run inputs match the workflow’s declared inputs.
2. Missing required inputs are rejected.
3. Defaults are applied consistently.
4. Invalid run input prevents run creation.

**Recommendations:**

1. Keep dynamic schema generation small and explicit.
2. Avoid complex conditional input behavior in V1.

**Open questions:**

1. Should runtime input defaults come from the workflow definition or the latest UI state?

### Story 7.2.4 — Implement parameter binding resolver

**Objective:** Resolve step configs before each executor runs.

**Tasks:**

1. Read step config from the compiled plan.
2. Resolve constant bindings.
3. Resolve workflow-input bindings.
4. Reject missing input references.
5. Return executor-ready config.

**Acceptance criteria:**

1. Executors receive concrete config values.
2. Invalid bindings fail clearly.
3. Runtime inputs are the only dynamic source for V1 bindings.
4. Resolved config can be persisted in step input snapshots.

**Recommendations:**

1. Keep binding resolution separate from executor logic.
2. Do not add expression evaluation in V1.

**Open questions:**

1. Should resolved configs include both original binding and final value for debugging?

### Story 7.2.5 — Implement execution context service

**Objective:** Create the runtime object used throughout a workflow run.

**Tasks:**

1. Define execution context fields.
2. Include run metadata.
3. Include user and workspace context.
4. Include runtime inputs.
5. Include compiled plan.
6. Include mutable working set.
7. Include execution limits.

**Acceptance criteria:**

1. Execution code has one context object.
2. Context includes everything needed by step dispatch.
3. Context excludes UI-only data.
4. Context can be safely passed between runtime functions.

**Recommendations:**

1. Keep context serializable where possible.
2. Avoid putting database clients directly inside serialized context.

**Open questions:**

1. Does the execution transport require full context serialization between steps?

## Epic 7.3 — Execution transport and run creation

### Story 7.3.1 — Define ExecutionTransport interface

**Objective:** Abstract the mechanism that performs background workflow execution.

**Tasks:**

1. Define `startRun` method.
2. Define expected payload for the transport.
3. Define error behavior when transport start fails.
4. Create a local or direct development transport if useful.
5. Create a Vercel Workflows transport placeholder or implementation depending on deployment decision.

**Acceptance criteria:**

1. Run creation code depends on the interface, not a hard-coded transport.
2. Transport start failures are handled.
3. The runtime can be swapped later without changing API contracts.
4. Vercel-specific code is isolated.

**Recommendations:**

1. Prefer Vercel Workflows if Vercel is the production target.
2. Keep a simple direct executor for local development if it speeds iteration.

**Open questions:**

1. Is Vercel confirmed as the production deployment target for V1?

### Story 7.3.2 — Implement idempotent run creation service

**Objective:** Create runs safely from user requests without duplicate execution.

**Tasks:**

1. Validate workflow ID and request body.
2. Require an `Idempotency-Key` header or body field.
3. Hash the request body.
4. Check for an existing key.
5. Return the existing run if key and request hash match.
6. Reject the request if key exists with a different request hash.
7. Create a new run and idempotency record in one transaction.
8. Start the execution transport after persistence.

**Acceptance criteria:**

1. Repeated identical run submissions return the same run.
2. Conflicting repeated keys are rejected.
3. New runs are linked to the current published workflow version.
4. Draft workflows cannot be run.
5. Run creation starts execution.

**Recommendations:**

1. Generate idempotency keys in the web client.
2. Keep idempotency handling server-enforced.

**Open questions:**

1. Should idempotency be scoped by user, workspace, workflow, or all three?

### Story 7.3.3 — Implement run creation API route

**Objective:** Expose run creation through `/api/v1/runs`.

**Tasks:**

1. Implement `POST /api/v1/runs`.
2. Validate request with Zod.
3. Read `Idempotency-Key` header.
4. Require authentication and workspace context.
5. Call run creation service.
6. Return run ID and initial status.

**Acceptance criteria:**

1. Authenticated users can start a published workflow run.
2. Invalid request bodies are rejected.
3. Missing or invalid idempotency keys are rejected.
4. The route returns a stable run ID.
5. The route uses the standard API envelope.

**Recommendations:**

1. Do not put execution logic in the Route Handler.
2. Keep route behavior compatible with future non-web clients.

**Open questions:**

1. Should the API accept `workflowId` only, or also an explicit `workflowVersionId`?

## Epic 7.4 — Step execution engine

### Story 7.4.1 — Implement sequential step dispatcher

**Objective:** Execute compiled workflow steps in order.

**Tasks:**

1. Load the compiled plan.
2. Create a step-run row before each step starts.
3. Resolve step config bindings.
4. Look up the executor by tool key.
5. Execute the step.
6. Update the working set.
7. Mark step success or failure.
8. Stop execution on fatal failures.

**Acceptance criteria:**

1. Workflow steps execute in compiled order.
2. Step rows are created and updated.
3. Executor failures are captured.
4. Fatal failures stop the run.
5. Successful outputs feed later steps.

**Recommendations:**

1. Keep V1 execution sequential at the step level.
2. Allow controlled item-level concurrency inside provider-backed steps.

**Open questions:**

1. Should any V1 tools run in parallel, or is sequential execution enough?

### Story 7.4.2 — Add execution limits

**Objective:** Prevent individual runs from doing too much work.

**Tasks:**

1. Add maximum listing count.
2. Add maximum properties enriched per run.
3. Add maximum provider calls per step.
4. Add maximum provider calls per run.
5. Add per-request timeout settings.
6. Add total run duration guard if supported by the transport.
7. Return clear limit errors.

**Acceptance criteria:**

1. Runs cannot exceed configured limits.
2. Limits are applied before uncontrolled provider fan-out.
3. Limit failures are understandable to users.
4. Limits can be adjusted through environment or server config.

**Recommendations:**

1. Set conservative limits in V1 because caching is out of scope.
2. Show limits in relevant UI where users configure counts.

**Open questions:**

1. What should the launch limits be for listings and provider calls?

### Story 7.4.3 — Add provider retry behavior

**Objective:** Retry transient provider failures without hiding persistent errors.

**Tasks:**

1. Identify retryable provider error categories.
2. Add a small retry count for transient failures.
3. Add backoff between retries if supported.
4. Do not retry validation, unauthorized, or bad-request errors.
5. Record retry attempts in provider or step metadata.

**Acceptance criteria:**

1. Transient provider errors can be retried.
2. Non-retryable errors fail quickly.
3. Retry behavior is bounded.
4. Retry metadata is available for debugging.

**Recommendations:**

1. Keep retry counts low in V1.
2. Avoid retry storms against rate-limited endpoints.

**Open questions:**

1. Should rate-limit responses ever be retried in V1?

### Story 7.4.4 — Add partial-result handling

**Objective:** Represent workflows where some provider calls fail but useful results remain.

**Tasks:**

1. Define partial status criteria.
2. Mark a run partial when item-level failures exist but final output is still usable.
3. Keep successful property results available.
4. Persist item-level errors and warnings.
5. Show partial status in run summary data.

**Acceptance criteria:**

1. Partial status is supported.
2. Successful properties are still shown.
3. Failed items are visible.
4. Partial runs are distinct from fully failed runs.
5. The final summary can mention partial data quality.

**Recommendations:**

1. Root acquisition failure should fail the run.
2. Enrichment failures should usually produce partial results.

**Open questions:**

1. What percentage of item-level failures should convert partial to failed?

### Story 7.4.5 — Persist final run outputs

**Objective:** Save property, area, and summary outputs after execution completes.

**Tasks:**

1. Extract property results from the final working set.
2. Insert or update `run_property_results` rows.
3. Extract area aggregates.
4. Insert or update `run_area_results` rows.
5. Persist final summary to `workflow_runs.outputSummaryJson`.
6. Mark run as succeeded or partial.

**Acceptance criteria:**

1. Final run outputs are persisted in queryable tables.
2. Run summary is available without recomputing execution.
3. Run status reflects success or partial success.
4. Result persistence handles missing optional outputs safely.

**Recommendations:**

1. Persist structured outputs at the end of execution.
2. Avoid treating result tables as cache; they are run artifacts.

**Open questions:**

1. Should intermediate step outputs also update result tables, or only final outputs?

### Story 7.4.6 — Implement run failure handling

**Objective:** Ensure failed runs end in a clear, inspectable state.

**Tasks:**

1. Catch unhandled runtime errors.
2. Mark the current step failed if applicable.
3. Mark the run failed.
4. Persist sanitized error details.
5. Preserve completed step outputs.
6. Avoid exposing secrets in errors.

**Acceptance criteria:**

1. Failed runs do not remain stuck in running status.
2. Error information is available in run detail.
3. Secrets are not persisted in error payloads.
4. Completed prior steps remain inspectable.

**Recommendations:**

1. Use structured application errors where possible.
2. Separate user-facing message from internal metadata.

**Open questions:**

1. Should failed runs be rerunnable from the same inputs in V1?

## Epic 7.5 — Run read APIs

### Story 7.5.1 — Implement list runs service and API

**Objective:** Return workflow run history for the current workspace.

**Tasks:**

1. Define list query schema.
2. Authorize workspace membership.
3. Query runs for the current workspace.
4. Include workflow name and version metadata.
5. Add pagination.
6. Implement `GET /api/v1/runs`.

**Acceptance criteria:**

1. Users can list runs from their workspace.
2. Results include status and timestamps.
3. Pagination follows API conventions.
4. Users cannot see runs from other workspaces.

**Recommendations:**

1. Keep list payloads small.
2. Do not include full output JSON in list responses.

**Open questions:**

1. Should runs list support filtering by workflow ID in V1?

### Story 7.5.2 — Implement get run detail service and API

**Objective:** Return all data needed for the run detail page.

**Tasks:**

1. Validate run ID.
2. Authorize workspace access.
3. Fetch run metadata.
4. Fetch step-run rows.
5. Fetch property result rows.
6. Fetch area result rows.
7. Return final summary data.
8. Implement `GET /api/v1/runs/:runId`.

**Acceptance criteria:**

1. Users can inspect an accessible run.
2. The response includes timeline, results, and summary data.
3. Inaccessible runs are not exposed.
4. The route uses the standard API envelope.

**Recommendations:**

1. Shape the response around the run detail UI.
2. Keep raw provider payloads behind optional expandable fields if exposed.

**Open questions:**

1. Should raw step input/output be included by default or requested separately?

### Story 7.5.3 — Create phase-summary.md for Phase 7

**Objective:** Capture the final state of the execution runtime.

**Tasks:**

1. Create a concise `phase-summary.md` for Phase 7.
2. List run statuses and step statuses implemented.
3. List execution guarantees and limits.
4. List partial-result behavior.
5. List any execution transport limitations.

**Acceptance criteria:**

1. The summary is under one page.
2. The summary identifies exact runtime behavior.
3. No additional documentation files are created for the phase.

**Recommendations:**

1. Include configured provider-call limits because Phase 8 UI may need to display them.

**Open questions:**

1. None expected unless execution transport changed.

---

# Phase 8 — Run initiation, results UX, and launch readiness

## Goal

Make the product usable end-to-end by adding run forms, run lists, run details, property results, area results, summaries, reruns, starter workflows, deployment setup, and launch acceptance work.

## Epic 8.1 — Run initiation UX

### Story 8.1.1 — Build workflow run form

**Objective:** Let users provide runtime inputs and start a published workflow.

**Tasks:**

1. Load the published workflow’s runtime input definitions.
2. Render fields for text, number, boolean, and select inputs.
3. Apply defaults from the workflow definition.
4. Validate inputs with Zod on the client.
5. Generate an idempotency key.
6. Submit to `POST /api/v1/runs`.
7. Redirect to run detail after creation.

**Acceptance criteria:**

1. Users can start a run from a published workflow.
2. Required inputs are enforced.
3. Idempotency key is sent with the request.
4. Successful submission redirects to run detail.
5. API errors are shown clearly.

**Recommendations:**

1. Keep the run form simple and generated from workflow inputs.
2. Do not build saved presets in V1 unless strongly needed.

**Open questions:**

1. Should users start runs from the workflow list, builder page, or both?

### Story 8.1.2 — Add run button to workflow screens

**Objective:** Make workflow execution discoverable.

**Tasks:**

1. Add a run action to the workflows list for published workflows.
2. Add a run action to the builder header when a published version exists.
3. Disable run action for workflows without a published version.
4. Explain why unpublished workflows cannot run.
5. Link the action to the run form.

**Acceptance criteria:**

1. Users can easily find how to run a workflow.
2. Unpublished workflows cannot be run.
3. Disabled states explain what action is needed.
4. Run actions use the same run form flow.

**Recommendations:**

1. Make publish-before-run explicit in the UI.
2. Avoid allowing draft execution in V1.

**Open questions:**

1. Should the builder show “Publish to run” when a workflow has unsaved draft changes?

## Epic 8.2 — Runs list and run detail

### Story 8.2.1 — Build runs list page

**Objective:** Show users recent workflow executions.

**Tasks:**

1. Fetch runs from `GET /api/v1/runs`.
2. Display workflow name, status, started time, completed time, and result count.
3. Add loading, empty, and error states.
4. Link each run to its detail page.
5. Add filter by workflow if supported by API.

**Acceptance criteria:**

1. Users can see their run history.
2. Run statuses are easy to scan.
3. Empty state explains how to create a first run.
4. Each run links to detail.

**Recommendations:**

1. Optimize this page for operational scanning.
2. Do not build analytics dashboards in V1.

**Open questions:**

1. Should failed and partial runs be visually emphasized?

### Story 8.2.2 — Build run detail header

**Objective:** Show high-level run information at the top of the run detail page.

**Tasks:**

1. Fetch run detail from `GET /api/v1/runs/:runId`.
2. Display workflow name.
3. Display run status.
4. Display start and completion times.
5. Display input summary.
6. Display counts for properties, failures, and warnings.

**Acceptance criteria:**

1. Users understand what run they are viewing.
2. Status is clear.
3. Input values are visible for context.
4. Partial or failed runs show appropriate warning information.

**Recommendations:**

1. Keep raw JSON out of the header.
2. Show the most important status and count information first.

**Open questions:**

1. Should run input values be editable from this page for rerun?

### Story 8.2.3 — Build run step timeline

**Objective:** Show step-by-step execution progress and history.

**Tasks:**

1. Render step-run rows in execution order.
2. Show step name, tool key, status, started time, completed time, and duration.
3. Show warnings per step.
4. Show user-safe error messages per failed step.
5. Add expandable raw details only if allowed.

**Acceptance criteria:**

1. Users can see which steps ran.
2. Step success, failure, and warning states are clear.
3. Failed steps show understandable messages.
4. The timeline supports pending/running states while execution is active.

**Recommendations:**

1. Make the timeline useful for both users and operators.
2. Hide raw payloads by default.

**Open questions:**

1. Should raw step details be visible to all users or only internal admins?

### Story 8.2.4 — Add run status polling

**Objective:** Keep run detail updated while a workflow is executing.

**Tasks:**

1. Detect when a run is pending or running.
2. Poll the run detail endpoint on an interval.
3. Stop polling when the run reaches a terminal status.
4. Refresh timeline and results after each poll.
5. Show a subtle updating indicator.

**Acceptance criteria:**

1. Users can watch run progress without manually refreshing.
2. Polling stops after terminal status.
3. UI updates do not duplicate results.
4. Polling failures are handled gracefully.

**Recommendations:**

1. Use polling in V1 for simplicity.
2. Defer realtime subscriptions or websockets to V2 unless needed.

**Open questions:**

1. What polling interval is acceptable for expected run durations?

## Epic 8.3 — Results exploration

### Story 8.3.1 — Build property results table

**Objective:** Let users compare analyzed properties from a run.

**Tasks:**

1. Render property result rows.
2. Show address, price, rent estimate, key metrics, score, and warnings.
3. Add sorting by score and selected metrics.
4. Add basic client-side filtering for status or warnings if feasible.
5. Handle missing values clearly.

**Acceptance criteria:**

1. Users can compare property-level results.
2. Scores and metrics are visible.
3. Missing values do not break the table.
4. Sorting helps users identify top opportunities.

**Recommendations:**

1. Make this the primary value surface of V1.
2. Promote only the most important metrics to columns.

**Open questions:**

1. Which metric columns are required for launch?

### Story 8.3.2 — Build property detail drawer

**Objective:** Let users inspect one property result in detail.

**Tasks:**

1. Open a drawer or detail panel from the property table.
2. Show property facts.
3. Show rent estimate details.
4. Show comparables summary.
5. Show metrics breakdown.
6. Show score reason codes.
7. Show warnings and item-level errors.

**Acceptance criteria:**

1. Users can inspect a selected property.
2. Detail sections are organized and readable.
3. Score reason codes are visible.
4. Warnings and failed enrichment details are visible.

**Recommendations:**

1. Use a drawer to preserve table context.
2. Do not overbuild a full property profile page in V1.

**Open questions:**

1. Should property details include a link to the original provider listing if available?

### Story 8.3.3 — Build area results panel

**Objective:** Show ZIP or area-level analysis outputs when a workflow includes aggregation.

**Tasks:**

1. Detect when area results exist.
2. Render area key, sample size, averages, medians, and ranking fields.
3. Show low-sample warnings.
4. Link area results back to included property rows if feasible.
5. Hide the panel when no area results exist.

**Acceptance criteria:**

1. Area-level workflows show area aggregates.
2. Sample size is visible.
3. Low-confidence areas are warned clearly.
4. The UI handles workflows without area aggregation.

**Recommendations:**

1. Show sample size prominently.
2. Avoid map views in V1 unless critical.

**Open questions:**

1. Is a map view required for launch demos, or can it wait?

### Story 8.3.4 — Build final summary panel

**Objective:** Present the deterministic workflow summary clearly.

**Tasks:**

1. Render the summary object from the run response.
2. Display top findings.
3. Display top properties.
4. Display warnings and limitations.
5. Render Markdown summary if present.
6. Add copy-to-clipboard for the summary text.

**Acceptance criteria:**

1. Users can read the final run summary.
2. Top findings are visible.
3. Warnings and limitations are not hidden.
4. Users can copy the summary text.

**Recommendations:**

1. Support copy/export as Markdown before building PDF export.
2. Keep the summary deterministic in V1.

**Open questions:**

1. Is Markdown export enough for V1, or is CSV export for results also required?

### Story 8.3.5 — Add partial and failed item visibility

**Objective:** Make partial runs understandable instead of silently hiding failures.

**Tasks:**

1. Show a partial-run banner when status is partial.
2. Display counts of successful and failed properties.
3. Add a failed-items section or filter.
4. Show item-level error messages safely.
5. Keep successful results visible.

**Acceptance criteria:**

1. Partial runs are clearly marked.
2. Successful property results remain visible.
3. Failed items are discoverable.
4. Users can understand whether results are complete.

**Recommendations:**

1. Do not treat partial as failed if useful outputs exist.
2. Make data quality visible in the summary and results table.

**Open questions:**

1. Should users be able to rerun only failed items in V1?

## Epic 8.4 — Rerun and workflow iteration

### Story 8.4.1 — Add rerun with same inputs

**Objective:** Let users repeat a completed run using the same workflow and input snapshot.

**Tasks:**

1. Add rerun action on run detail.
2. Use the original workflow ID and input snapshot.
3. Generate a new idempotency key.
4. Create a brand-new run.
5. Link or record source run ID if schema supports it.
6. Redirect to the new run detail.

**Acceptance criteria:**

1. Users can rerun with the same inputs.
2. Rerun creates a new run record.
3. Original run remains unchanged.
4. New run has its own status and results.

**Recommendations:**

1. Link reruns to source runs for traceability if simple.
2. Do not overwrite prior results.

**Open questions:**

1. Should rerun use the original workflow version or the latest published version?

### Story 8.4.2 — Add rerun with edited inputs

**Objective:** Let users adjust run inputs before starting a new run.

**Tasks:**

1. Add “rerun with edits” action.
2. Pre-fill the run form with original input values.
3. Let users modify inputs.
4. Submit as a new run with a new idempotency key.
5. Redirect to the new run detail.

**Acceptance criteria:**

1. Users can modify prior inputs for a new run.
2. Edited reruns do not mutate original runs.
3. Validation rules still apply.
4. New run is traceable from the UI.

**Recommendations:**

1. Implement after basic rerun if time allows.
2. Keep input editing limited to declared workflow inputs.

**Open questions:**

1. Should edited reruns be available from run list, run detail, or both?

### Story 8.4.3 — Add duplicate workflow from run context

**Objective:** Let users create a modified workflow based on a run’s source workflow.

**Tasks:**

1. Add duplicate workflow action on run detail.
2. Use the workflow definition associated with the run’s version.
3. Create a new draft workflow.
4. Redirect to the builder for the new workflow.
5. Show source workflow/run context if useful.

**Acceptance criteria:**

1. Users can duplicate a workflow from a run result.
2. The duplicate uses the definition that produced the run.
3. The duplicate opens as a draft.
4. The source run remains unchanged.

**Recommendations:**

1. This supports the loop of run, inspect, improve.
2. Prefer duplication over editing published versions directly.

**Open questions:**

1. Should duplicated workflow names include the source run date?

## Epic 8.5 — Starter workflows and release setup

### Story 8.5.1 — Seed starter workflow: Find Investment Opportunities

**Objective:** Provide a launch-ready workflow that finds and ranks properties in an area.

**Tasks:**

1. Create a seed definition for listing search.
2. Add property detail enrichment.
3. Add rent estimate.
4. Add comparables if available.
5. Add metrics calculation.
6. Add scoring.
7. Add summary.
8. Make the definition pass publish validation.

**Acceptance criteria:**

1. The starter workflow can be created from seed data.
2. The workflow can be published.
3. The workflow can run when provider contracts are available.
4. The workflow demonstrates the main V1 value proposition.

**Recommendations:**

1. Store starter workflows as code factories, not one-off production rows.
2. Keep assumptions visible and editable.

**Open questions:**

1. Which default location and filters should this demo workflow use?

### Story 8.5.2 — Seed starter workflow: Analyze One Property

**Objective:** Provide a workflow focused on rating a single property if provider support exists.

**Tasks:**

1. Confirm direct property lookup is supported.
2. Create a property lookup or detail root step.
3. Add rent estimate.
4. Add comparables.
5. Add metrics calculation.
6. Add scoring.
7. Add summary.
8. Make the definition pass publish validation.

**Acceptance criteria:**

1. The workflow exists if provider contracts support direct lookup.
2. The workflow can be published.
3. The workflow can run from user-provided property input.
4. Unsupported provider capability is not faked.

**Recommendations:**

1. Make this conditional on confirmed provider support.
2. If direct lookup is unavailable, defer this starter workflow.

**Open questions:**

1. Does the provider support address or property-ID lookup without prior listing search?

### Story 8.5.3 — Seed starter workflow: ZIP Area Snapshot

**Objective:** Provide a workflow focused on evaluating an area for investment potential.

**Tasks:**

1. Create a listing search step by ZIP or area input.
2. Add detail and rent estimate steps as needed.
3. Add metrics calculation.
4. Add area aggregation.
5. Add summary.
6. Make the definition pass publish validation.

**Acceptance criteria:**

1. The workflow can analyze an area from available listings.
2. Area aggregate results are produced.
3. Low-sample warnings are supported.
4. The workflow can be published and run.

**Recommendations:**

1. Use derived area aggregation in V1.
2. Avoid requiring a separate market-data provider.

**Open questions:**

1. What minimum sample size should the starter workflow require?

### Story 8.5.4 — Configure production deployment environment

**Objective:** Prepare the app for deployment with required runtime configuration.

**Tasks:**

1. Configure hosting project.
2. Add production environment variables.
3. Add database connection variables.
4. Add Better Auth secrets.
5. Add RapidAPI credentials.
6. Add execution transport configuration.
7. Confirm build command and output settings.

**Acceptance criteria:**

1. The production environment has required variables.
2. Secrets are not committed to source control.
3. The app can build in the hosting environment.
4. Deployment configuration matches the execution transport choice.

**Recommendations:**

1. Use Vercel if Vercel Workflows is selected.
2. Keep development and production secrets separate.

**Open questions:**

1. Will there be a separate staging environment before production?

### Story 8.5.5 — Configure production database migration path

**Objective:** Make production schema changes repeatable and deliberate.

**Tasks:**

1. Decide how migrations are run during deployment.
2. Confirm production database connection permissions.
3. Run migrations in a controlled release step.
4. Verify domain and auth tables exist after migration.
5. Avoid destructive production changes.

**Acceptance criteria:**

1. Production migrations can be applied predictably.
2. Migration execution is not accidental or hidden.
3. Production schema matches application expectations.
4. Release process avoids destructive schema operations.

**Recommendations:**

1. Run migrations as an explicit release step.
2. Keep rollback expectations simple for V1.

**Open questions:**

1. Who owns production migration execution during launch?

### Story 8.5.6 — Perform launch acceptance review

**Objective:** Confirm the V1 product works end to end before declaring the release complete.

**Tasks:**

1. Create a new user.
2. Confirm personal workspace provisioning.
3. Create a workflow.
4. Configure workflow steps.
5. Save a draft.
6. Publish the workflow.
7. Run the workflow.
8. Inspect step timeline.
9. Inspect property results.
10. Inspect summary output.
11. Confirm partial and failed states are understandable when encountered.
12. Confirm rerun behavior.

**Acceptance criteria:**

1. The core user journey works end to end.
2. Provider-backed tools produce usable outputs.
3. Run results are understandable.
4. Known limitations are identified before release.
5. No automated test stories are introduced by this review.

**Recommendations:**

1. Use the starter workflows for launch acceptance.
2. Capture blockers in the Phase 8 summary only.

**Open questions:**

1. What is the minimum acceptable first-run success rate for launch?

### Story 8.5.7 — Create phase-summary.md for Phase 8

**Objective:** Capture the final V1 release state.

**Tasks:**

1. Create a concise `phase-summary.md` for Phase 8.
2. List shipped end-user capabilities.
3. List known V1 limitations.
4. List unresolved launch blockers if any.
5. List items intentionally moved to V2.

**Acceptance criteria:**

1. The summary is under one page.
2. The summary clearly separates blockers from V2 follow-ups.
3. No additional documentation files are created for the phase.

**Recommendations:**

1. Treat this as the final V1 handoff note.
2. Keep it concise and operational.

**Open questions:**

1. None expected unless launch scope changed.

---

# V1 completion criteria

V1 is complete when all of the following are true:

1. A user can sign up, sign in, and operate inside a personal workspace.
2. A user can create, edit, save, publish, duplicate, and archive workflows.
3. A user can build workflows using the V1 tool catalog.
4. The V1 tool catalog includes Listing Search, Property Detail, Comparables, Rent Estimate, Metrics Calculation, Property Scoring, Area Aggregation, and Summary, subject to final provider contract support.
5. Published workflows run through the deterministic execution runtime.
6. Run creation is idempotent.
7. Workflow runs persist run-level and step-level history.
8. Successful, partial, and failed runs are represented clearly.
9. Users can inspect property results, area results, step timelines, warnings, errors, and final summaries.
10. Starter workflows exist for the main launch use cases, adjusted to actual provider support.
11. Deployment and migration paths are repeatable.
12. V1 exclusions remain excluded: no caching, no legal/data-rights review, no policy engine, no autonomous AI workflow generation, no multi-client implementation, no public SDK, and no automated test stories.

# V2 handoff candidates

The following should be considered after V1 is stable:

1. AI-assisted workflow creation.
2. AI agent that can choose tools and propose workflows.
3. Vercel AI SDK integration for structured AI outputs and tool calling.
4. LangGraph only if advanced stateful agent orchestration is needed.
5. Caching provider responses and normalized property data.
6. Multi-provider RapidAPI support and provider fallback logic.
7. Scheduling recurring workflow runs.
8. Alerts and notifications.
9. Collaboration, team workspaces, and invitations.
10. More advanced authorization and governance.
11. Data-rights and legal review workflow.
12. Public API/SDK for other clients.
13. Mobile, browser extension, or MCP client.
14. Rich observability dashboards.
15. More advanced retry, backoff, circuit breaker, and dead-letter handling.
16. Workflow templates marketplace or shared template library.
17. Import/export workflow JSON.
18. Map-based property and area result views.
19. PDF, CSV, and report exports.
20. LLM-generated natural-language summaries.
