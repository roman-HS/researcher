# architecture-document.md

This document is the implementation source of truth for the first production version of the project. The product is a real-estate workflow builder in which users compose analyses from system-owned tools such as finding listings, loading property details, fetching comparables, estimating rents, calculating investment metrics, scoring properties, and generating summaries. V1 intentionally implements only the minimum subset of your longer-term target architecture: web client, application/API layer, deterministic workflow execution, tool integrations, and database persistence. Agent planning, memory layers, caching, and broader governance controls are deferred.

The V1/V2 split is technically sound. LangGraph distinguishes workflows with predetermined code paths from agents that dynamically decide how to use tools, while the Vercel AI SDK defines agents as LLMs using tools in a loop. That means the right first move is to make tool contracts, workflow persistence, and execution reliability excellent before allowing an LLM to author or run workflows on a user’s behalf. citeturn21view3turn22view0turn22view2

Because the product needs a single web client now but multiple clients later, the backend shape should be API-first. In Next.js App Router, Route Handlers live in the `app` directory and are the native mechanism for HTTP endpoints, while Server Actions are server-executed functions designed for form submissions and mutations. Next.js also recommends server-side validation and explicit auth checks inside each Server Action. citeturn19view0turn19view1turn19view2

> Important implementation note: every third-party endpoint contract proposed below is an internal adapter contract, not a claim about the exact live `private-zillow` endpoint names or payload shapes. RapidAPI requests require `X-RapidAPI-Host` and `X-RapidAPI-Key`, and Rapid runtime responses can include rate-limit headers such as request limits, remaining quota, and reset time. Those details must be re-verified against the subscribed plan and live provider docs during implementation. citeturn21view5turn21view6turn7search4

## Locked decisions

**Application shell and deployment.** Use Next.js App Router as the only full-stack application runtime in V1, deployed on Vercel. Route Handlers under `/api/v1/*` are the canonical machine-consumable API for future mobile, extension, SDK, or MCP clients; Server Actions are a convenience adapter for the web UI only. Vercel Functions are a good fit because they handle API and database connections without server management, and Route Handlers map directly to `app/api/**/route.ts`. citeturn19view0turn24view0

**Background execution.** Use Vercel Workflows to execute workflow runs. Vercel positions Workflows as a durable platform for multi-step applications and AI agents, and its queue layer exists as the lower-level primitive underneath it. That is a strong fit for long-running, multi-step property analyses where retries, durability, and state tracking matter more than raw request/response speed. citeturn17search0turn17search2turn15view2

**Authentication.** Use Better Auth with the Drizzle adapter against the same Postgres database. Enable email/password only in V1, include password reset, mount Better Auth on `/api/auth/[...all]/route.ts`, and keep sessions cookie-based. Better Auth documents the catch-all route-handler integration for Next App Router, its Drizzle adapter, email/password support, and its CLI for generating the required database schema. citeturn26view0turn20view0turn20view1turn20view2turn25view0

**Database and data access.** Use Supabase as managed Postgres only; do not use Supabase Auth in V1. Connect through the Supabase Shared Pooler, access data through Drizzle, and keep all reads and writes server-side. Supabase’s own Drizzle guide shows this path and notes that, if you rely only on Drizzle instead of the Supabase Data API, PostgREST can be turned off. Drizzle’s Supabase guide uses the `postgres` driver, and if transaction pool mode is used it recommends disabling prepared statements. Supabase’s database docs frame Row Level Security as the mechanism that makes tables safe to query directly from the client, so because V1 will not expose app tables directly to browsers, server-only access is the correct lighter-weight starting point. citeturn21view0turn22view5turn23view0turn10search8

**Schema and contract system.** Use Zod everywhere: incoming API bodies, Server Actions, workflow definitions, tool input and output schemas, and optional AI structured outputs. Zod 4 can convert schemas to JSON Schema, and the Vercel AI SDK accepts either Zod or JSON Schema for tool inputs and structured-object generation. This gives one schema language across HTTP contracts, workflow validation, and future agent tools. citeturn21view1turn21view2turn22view1

**UI layer.** Use shadcn/ui with Tailwind as the design-system foundation. shadcn/ui’s model is intentionally “open code” rather than a black-box component package, which is a good fit for a workflow product that will likely need custom builder widgets, step inspectors, result panes, and AI-assisted UI iteration over time. citeturn21view4

**AI position in V1.** Keep AI narrow in V1. The AI SDK should power an optional summary-generation step and later agent features, but property calculations, ranking, and scoring must remain deterministic application logic. The AI SDK already supports schema-validated structured outputs and tool definitions, so it is a good boundary for the “summary” step without allowing AI to become the workflow engine itself. citeturn22view1turn21view2turn22view0

**LangChain and LangGraph.** Do not make LangChain or LangGraph part of V1’s critical execution path. LangGraph describes itself as a low-level runtime for long-running, stateful agents and recommends higher-level agent abstractions when teams are just getting started. That makes it a better V2 candidate once planning, interrupts, human approval, and cross-step memory become first-class requirements. citeturn22view2turn21view3

**External data strategy.** Put a provider adapter boundary around RapidAPI from day one. RapidAPI auth and quota behaviour are gateway concerns, and the broader Zillow and Bridge ecosystem already spans normalised listing data, public records, Zestimates, and market metrics. The application should therefore speak canonical internal models rather than any marketplace JSON shape directly. citeturn21view5turn21view6turn18search5turn18search6turn18search7turn18search11turn21view7

**Caching and compliance.** Shared caching, rate-aware memoisation, data-rights reviews, policy engines, and formal legal/compliance review are explicitly out of scope for V1. Route Handlers are already uncached by default in current Next.js docs, which aligns cleanly with the decision to optimise first for correctness and implementation speed. citeturn19view0turn0search16

## V1 reference architecture

V1 should implement only five runtime layers: the Next.js web UI, versioned HTTP APIs, application services, durable workflow execution, and integrations/data persistence. Short synchronous actions such as saving a draft, publishing a workflow, or updating user settings stay inside Route Handlers and Server Actions. Long-running workflow runs move immediately into Vercel Workflows, which then call tool implementations and persist step state into Postgres. Because Route Handlers are uncached by default, simple polling from the UI is acceptable in V1 and much lighter than adding Realtime or web sockets immediately. citeturn19view0turn24view0turn17search0turn17search2

```text
User
  -> Next.js App Router UI
      -> Route Handlers (/api/v1/*) and web-only Server Actions
          -> Application services
              -> Workflow publish/validate service
              -> Workflow run starter
                  -> Vercel Workflow runner
                      -> Tool registry
                          -> RapidAPI provider adapters
                          -> Deterministic analysis tools
                          -> Optional AI summary tool
                      -> Supabase Postgres via Drizzle
```

A recommended workspace layout is below. The point is not ceremony for its own sake; it is to ensure that future clients can reuse contracts and business logic instead of inheriting behaviour trapped inside page files.

| Package or app          | Responsibility                                                                  |
| ----------------------- | ------------------------------------------------------------------------------- |
| `apps/web`              | Next.js app, auth pages, dashboard shell, workflow editor, run results UI       |
| `packages/auth`         | Better Auth server config, auth client helpers, route protection helpers        |
| `packages/db`           | Drizzle client, schema, migrations, seed utilities                              |
| `packages/schemas`      | Zod schemas for APIs, workflows, tool I/O, common domain objects                |
| `packages/workflows`    | Workflow validator, binding resolver, publish logic, run orchestration services |
| `packages/tools`        | Tool registry, deterministic analysis tools, compatibility metadata             |
| `packages/integrations` | RapidAPI HTTP client, endpoint adapters, provider mappers, error translation    |
| `packages/ai`           | Optional AI SDK wrapper for narrative summaries and future agent work           |

The canonical persisted model should already be graph-shaped, but V1 runtime behaviour should be intentionally constrained. Store workflows as `nodes + edges`, yet validate them so that published V1 flows are acyclic, single-entry, single-path, and manually triggered. That preserves a clean path to branching and parallelism later without forcing V1 to solve every graph-execution problem on day one.

To keep the runtime simple, collection fan-out should happen inside tools, not inside the workflow engine. In practice that means a step such as `loadPropertyDetails` should accept an array of listing references and return an array of enriched properties, rather than asking V1 orchestration to spawn child runs per listing. This is one of the biggest “start small, scale later” decisions in the document.

No user-authored JavaScript, custom code execution, or arbitrary expression language should exist in V1. Users compose system-owned tools, constants, and references to prior step outputs. Any complex transformation that matters should become an explicit tool with its own schema, validation, and tests.

Keep Vercel and Supabase in the same region from the beginning. Vercel’s own function guidance says functions should run close to the data source to reduce latency, so the deployment region should be chosen explicitly instead of left as an afterthought. citeturn24view0

If schedule pressure appears, it is acceptable for the first editor UI to be an ordered step builder instead of a free-form canvas, provided that it still writes the same graph document to the database. The storage model matters more than whether the very first UX is drag-and-drop.

## V1 domain model and data contracts

The internal domain model must not mirror any single provider payload. Zillow’s official ecosystem already spans close to 20 APIs and datasets and includes normalised listing output, public records, Zestimates, and real-estate metrics. That is a strong signal that the product boundary should be your own canonical types: `Listing`, `Property`, `ComparableSet`, `RentEstimate`, `MetricsBundle`, `ScoreBundle`, `AreaSummary`, and `SummaryResult`. citeturn21view7turn18search0turn18search5turn18search6turn18search7turn18search11

Authentication tables should be generated by Better Auth and persisted in the same database as the app tables. Better Auth documents both the schema-generation flow and the App Router catch-all route mount under `/api/auth/[...all]/route.ts`. citeturn25view0turn26view0

| Table                 | Purpose                                            | Important fields                                                                                                                                            |
| --------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user`                | Better Auth user table                             | `id`, `name`, `email`, `emailVerified`, timestamps                                                                                                          |
| `session`             | Better Auth session table                          | `id`, `token`, `userId`, `expiresAt`, `ipAddress`, `userAgent`                                                                                              |
| `account`             | Better Auth account/provider linkage               | Provider/account identifiers, auth metadata                                                                                                                 |
| `verification`        | Better Auth verification tokens                    | Token, identifier, expiry                                                                                                                                   |
| `workflows`           | Editable workflow metadata and current draft       | `id`, `ownerUserId`, `name`, `description`, `status`, `draftDefinitionJson`, `latestPublishedVersionId`, timestamps                                         |
| `workflow_versions`   | Immutable published snapshots                      | `id`, `workflowId`, `versionNumber`, `definitionJson`, `toolManifestJson`, `publishedAt`, `changeNote`                                                      |
| `workflow_runs`       | One execution attempt against one workflow version | `id`, `workflowId`, `workflowVersionId`, `status`, `triggerType`, `inputJson`, `outputJson`, `errorJson`, `startedAt`, `finishedAt`                         |
| `workflow_run_steps`  | Per-node execution record                          | `id`, `runId`, `nodeId`, `toolKey`, `toolVersion`, `status`, `resolvedInputJson`, `outputJson`, `rawProviderJson`, `attemptCount`, `latencyMs`, `errorJson` |
| `workflow_run_events` | Append-only timeline for UI and debugging          | `id`, `runId`, `stepId`, `eventType`, `payloadJson`, `createdAt`                                                                                            |

The tool registry is code-defined, not database-defined, in V1. That keeps execution safe and deployable. Tools can be enabled, versioned, and described centrally in TypeScript, and the API exposes their manifests to the builder.

```ts
import { z } from "zod";

export type ToolDefinition<I, O> = {
  key: `${string}@${number}`;
  title: string;
  category: "source" | "analysis" | "ai";
  description: string;
  inputSchema: z.ZodType<I>;
  outputSchema: z.ZodType<O>;
  ui: {
    accepts: string[];
    produces: string[];
    icon?: string;
  };
  execute: (ctx: ToolContext, input: I) => Promise<O>;
};
```

The persisted workflow document should follow this shape. It is graph-based in storage, but V1 publication rules allow only a single valid path.

```ts
type Binding =
  | { kind: "const"; value: unknown }
  | { kind: "workflowInput"; path: string }
  | { kind: "stepOutput"; nodeId: string; path: string };

type WorkflowNode = {
  id: string;
  kind: "tool";
  toolKey: `${string}@${number}`;
  title: string;
  input: Record<string, Binding>;
  options?: Record<string, unknown>;
};

type WorkflowDefinition = {
  trigger: { type: "manual" };
  inputSchemaJson: Record<string, unknown>;
  nodes: WorkflowNode[];
  edges: Array<{ source: string; target: string }>;
  output: Binding;
};
```

Zod remains the canonical contract system for these definitions and tool payloads. Where the UI or documentation layer needs JSON Schema, convert from Zod rather than maintaining a second shape by hand. Each tool should also include builder metadata such as accepted artefact types, produced artefact types, and field descriptions so the editor does not have to infer an entire user experience from schema structure alone. citeturn21view1turn21view2

The initial V1 tool catalogue should be limited and opinionated:

| Tool key                                | Purpose                                                               | Notes                                                                            |
| --------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `rapidapi.zillow.searchListings@1`      | Search listings by ZIP, city, address, or other supported filter set  | Adapter contract only; live provider request fields must be verified             |
| `rapidapi.zillow.loadPropertyDetails@1` | Enrich lightweight listing references into canonical property records | Accept arrays to avoid engine fan-out                                            |
| `rapidapi.zillow.fetchComparables@1`    | Retrieve or derive comparable properties                              | May be backed by a dedicated comps endpoint or by sold/rental search composition |
| `rapidapi.zillow.estimateRent@1`        | Produce rent estimate inputs for underwriting                         | Prefer deterministic provider data where available                               |
| `analysis.calculateMetrics@1`           | Compute deterministic investment metrics                              | Pure application logic; heavily unit-tested                                      |
| `analysis.scoreProperties@1`            | Apply user-selected scoring weights and thresholds                    | Deterministic and transparent                                                    |
| `analysis.aggregateArea@1`              | Produce ZIP or area-level rollups                                     | Enables “is this area good for investing?” workflows                             |
| `ai.generateSummary@1`                  | Produce a narrative summary of deterministic results                  | Optional final step only                                                         |

The `ai.generateSummary@1` step should be optional and last in the chain. It should consume already-calculated deterministic outputs and return structured summary objects plus markdown text. The AI SDK supports schema-validated structured outputs, which is exactly the right fit here. citeturn22view1

The HTTP API should live under `/api/v1/*` and be implemented with Route Handlers. Server Actions may call the same application services, but they should not be the only way to access core functionality because later clients will need stable HTTP contracts. citeturn19view0turn19view1

| Method and path                              | Purpose                                     | Request                                      | Returns                                               |
| -------------------------------------------- | ------------------------------------------- | -------------------------------------------- | ----------------------------------------------------- |
| `GET /api/v1/tools`                          | List available tools                        | Query by category optional                   | Tool manifests with schema summaries and UI metadata  |
| `GET /api/v1/tools/:toolKey`                 | Fetch full tool descriptor                  | None                                         | Full manifest including input and output schemas      |
| `GET /api/v1/workflows`                      | List current user’s workflows               | Pagination optional                          | Workflow summaries                                    |
| `POST /api/v1/workflows`                     | Create a new workflow draft                 | `name`, `description?`, initial `definition` | Created workflow record                               |
| `GET /api/v1/workflows/:workflowId`          | Get workflow detail                         | None                                         | Metadata, current draft, latest published version     |
| `PATCH /api/v1/workflows/:workflowId`        | Update draft metadata or definition         | Partial fields                               | Updated workflow record                               |
| `POST /api/v1/workflows/:workflowId/publish` | Validate draft and create immutable version | Optional `changeNote`                        | Published version metadata                            |
| `POST /api/v1/workflow-runs`                 | Start a run                                 | `workflowId` or `workflowVersionId`, `input` | `runId`, `status`, `workflowVersionId`, `pollAfterMs` |
| `GET /api/v1/workflow-runs/:runId`           | Fetch run status and final output           | None                                         | Run summary, status, output, error                    |
| `GET /api/v1/workflow-runs/:runId/events`    | Fetch timeline events                       | Cursor optional                              | Append-only event list for UI polling                 |

A proposed workflow create payload looks like this:

```json
{
  "name": "Property opportunity finder",
  "description": "ZIP-based opportunity workflow",
  "definition": {
    "trigger": { "type": "manual" },
    "inputSchemaJson": {
      "type": "object",
      "properties": {
        "zipCode": { "type": "string" },
        "minPrice": { "type": "number" },
        "maxPrice": { "type": "number" }
      },
      "required": ["zipCode"],
      "additionalProperties": false
    },
    "nodes": [
      {
        "id": "search",
        "kind": "tool",
        "toolKey": "rapidapi.zillow.searchListings@1",
        "title": "Find listings",
        "input": {
          "zipCode": { "kind": "workflowInput", "path": "$.zipCode" },
          "minPrice": { "kind": "workflowInput", "path": "$.minPrice" },
          "maxPrice": { "kind": "workflowInput", "path": "$.maxPrice" }
        }
      },
      {
        "id": "details",
        "kind": "tool",
        "toolKey": "rapidapi.zillow.loadPropertyDetails@1",
        "title": "Load details",
        "input": {
          "listingRefs": {
            "kind": "stepOutput",
            "nodeId": "search",
            "path": "$.listingRefs"
          }
        }
      }
    ],
    "edges": [{ "source": "search", "target": "details" }],
    "output": { "kind": "stepOutput", "nodeId": "details", "path": "$" }
  }
}
```

A proposed run-start payload looks like this:

```json
{
  "workflowId": "wf_123",
  "input": {
    "zipCode": "33139",
    "minPrice": 250000,
    "maxPrice": 650000
  }
}
```

And the first response should be deliberately small:

```json
{
  "runId": "wr_987",
  "workflowVersionId": "wv_5",
  "status": "queued",
  "pollAfterMs": 2000
}
```

All request and response bodies must be validated with Zod at the Route Handler boundary and again when step inputs are resolved inside the workflow runner. This double-validation prevents “valid draft, invalid run” bugs and catches provider contract drift as early as possible. citeturn21view1turn21view2

Use a single error envelope across the API:

```json
{
  "error": {
    "code": "provider_rate_limited",
    "message": "RapidAPI quota exceeded",
    "retryAfterSeconds": 58,
    "details": {}
  }
}
```

Important error codes in V1 are `validation_error`, `unauthorised`, `forbidden`, `not_found`, `invalid_workflow_definition`, `tool_contract_mismatch`, `provider_rate_limited`, `provider_error`, and `internal_error`. Mapping RapidAPI quota failures into a first-class `provider_rate_limited` response is worthwhile because Rapid exposes request-limit, remaining, and reset headers. citeturn21view6turn7search4

## V1 implementation plan

The implementation order should prioritise a thin but complete vertical slice over broad surface area. The first goal is not “many tools”; it is “one published workflow can run end to end, persist its state, and be debugged confidently”.

| Milestone                   | Scope                                                                                                                  | Exit criteria                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Foundation                  | Create workspace layout, env handling, Vercel project, Supabase project, Drizzle configuration, base CI                | App boots locally and in preview; database migrations run cleanly             |
| Auth and shell              | Better Auth setup, email/password sign-up and sign-in, password reset, protected app shell, current-user helpers       | A user can create an account, sign in, and reach the authenticated dashboard  |
| Workflow contracts          | Zod schemas for workflow documents, common artefacts, API envelopes; publish validator and compatibility checks        | Invalid flows cannot be published; draft and published version concepts exist |
| Tool registry               | Code-defined registry, tool metadata API, compatibility tags, UI metadata                                              | Builder can list tools and show typed configuration forms                     |
| RapidAPI adapter foundation | Shared HTTP client, auth headers, error mapper, canonical mappers, fixture-driven tests                                | One provider-backed tool works against mocked and live responses              |
| Workflow run engine         | Start-run API, Vercel Workflow orchestration, per-step persistence, run event timeline, polling endpoints              | A published workflow can execute sequentially and expose step-level progress  |
| Initial real-estate tools   | Listing search, property details, comparables, rent estimate, metrics, scoring, area aggregate                         | At least two meaningful user workflows work end to end                        |
| Summary and results UX      | Result pages, step inspector, raw/debug payload view, optional AI summary step                                         | User can inspect what happened at each step and understand final results      |
| Hardening                   | Contract tests, deterministic calculation unit tests, route-handler integration tests, Playwright happy-path E2E tests | Release readiness with reproducible runs and visible failure modes            |

During implementation, treat the RapidAPI adapter layer as a contract-testing priority. Rapid runtime exposes quota metadata and provider responses can drift, so each live endpoint wrapper should have recorded fixtures, schema assertions, and graceful retry/backoff around transient `429` and `5xx` failures. Vercel already exposes function metrics and logs, so V1 can rely on structured application logs plus persisted run and step tables instead of adding a separate observability platform immediately. citeturn21view6turn24view0

For the database connection, start with the Supabase Shared Pooler and Drizzle’s `postgres` path. If transaction pool mode is chosen during implementation testing, set `prepare: false` as documented by Drizzle’s Supabase guide. That should be captured in the first infrastructure story, not left to later debugging. citeturn21view0turn23view0

For the web UI, use Server Actions only where they improve ergonomics for the web client, such as sign-in, save-draft, or simple metadata edits. Even there, keep each action thin, perform explicit auth checks, and delegate to application services. That follows Next.js guidance and preserves the future multi-client API. citeturn19view1turn19view2

The first release should deliberately exclude team workspaces, scheduled triggers, webhooks, shared caching, browser extensions, mobile clients, MCP, end-user external credentials, and agent-authored workflows. Shipping an auditable deterministic builder first is the shortest path to a stable platform.

## V2 evolution

V2 should add agentic capability only after V1 workflows, contracts, and persistence are stable. At that point, the Vercel AI SDK’s agent model and LangGraph’s durable, stateful orchestration become relevant in a way they are not on day one. citeturn22view0turn22view2turn21view3

- Add an agent planner that can inspect the tool registry and propose workflows from natural-language goals, with explicit human approval before save or publish.
- Introduce conditional branches, parallel fan-out and fan-in, loops, and richer graph validation.
- Add scheduling, saved triggers, and webhook-based workflow starts.
- Introduce caching, memoisation, and provider-aware quota management.
- Add more data providers and categories such as demographics, schools, crime, mortgage data, geocoding, and short-term-rental data.
- Add workspaces, memberships, and role-based collaboration.
- Add reusable workflow templates and a template gallery.
- Add richer export paths such as PDF, spreadsheet, and shareable report generation.
- Add mobile, Chrome extension, SDK, and MCP clients against the same `/api/v1` surface.
- Add LangSmith tracing, evaluations, and deeper AI observability for the agent layer. citeturn22view3
- Add policy controls, provider compliance review, data-rights handling, and legal review once the product surface and commercial model are clearer.
