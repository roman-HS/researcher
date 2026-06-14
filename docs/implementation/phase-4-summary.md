# Phase 4 Summary — Workflow Persistence and Authoring APIs

Handoff note for Phase 5. Stories 4.1.1–4.3.9 complete.

## Completed

- **Workflow tables** — `workflows` and `workflow_versions` with Drizzle schema, relations, and enums aligned to `src/contracts/workflows/lifecycle.ts`.
- **Lifecycle helpers** — Transition guards, publish/archive patches, and post-publish draft creation in `src/modules/workflows/lifecycle.ts`.
- **Definition contracts** — `WorkflowDefinition` (v1 JSON: manual trigger, runtime inputs, tool nodes, edges, positions); parameter bindings (`const` | `workflowInput` only); runtime input types (`text`, `number`, `boolean`, `select`).
- **Validation** — Server-side orchestration in `validateWorkflowDefinition` with `draft` and `publish` profiles; graph topology rules in `src/contracts/workflows/graph-validation.ts`.
- **Compiled plan (minimal)** — `compileWorkflowDefinition` persists `compiledPlanJson` on publish (`planVersion: 1`); Story 7.2.1 can extend the plan shape later.
- **Authoring services** — Create, list, get, update draft, publish, duplicate, archive under `src/modules/workflows/`.
- **Workflow API routes** — Live `/api/v1/workflows/*` endpoints (workspace auth, Zod validation, standard envelopes).
- **Error mapping** — `createApiRoute` maps `WorkflowLifecycleError` → `conflict` (409, `details.code`); `WorkflowDefinitionValidationError` → `invalid_workflow_definition` (400).

**Applied migrations:** `20260613181312_neat_may_parker` (workflows), `20260613182237_parallel_invaders` (workflow_versions).

## Workflow lifecycle behavior

| Entity | States | Allowed transitions |
|---|---|---|
| Workflow | `active`, `archived` | `active` → `archived` only |
| Version | `draft`, `published`, `archived` | `draft` → `published` \| `archived`; `published` and `archived` are terminal |

| Operation | Behavior |
|---|---|
| Create | New `active` workflow + version 1 `draft` with empty definition |
| Save draft | Updates active draft definition/metadata; creates draft row if missing; `draft` profile validation (semantic issues → warnings) |
| Publish | Strict `publish` validation; compiles plan; promotes current draft row to `published`; inserts next `draft` copied from published definition |
| Duplicate | New workflow + version 1 `draft`; copies source definition (default: current draft, else latest published); server name `"Copy of …"` with collision suffixes |
| Archive | Soft-archive workflow + active draft version; published versions unchanged; no unarchive in V1 |
| List | Default `status=active`; `archived` and `all` filters supported |
| Get detail | Returns metadata + current `draft` + latest `published` summaries; excludes `archived` version rows |

**Constraints:** One active draft per workflow (partial unique index). Active workflow names unique per workspace. Archived workflows are readable and duplicatable but not mutable or runnable (`assertWorkflowAllowsMutation` / `assertWorkflowAllowsRun`).

## Validation rules (summary)

- **Schema** — Zod parse of full definition document (`definitionVersion: 1`).
- **Tools** — Known registry keys; per-tool `configSchema` validation.
- **Bindings** — `workflowInput` bindings must reference declared runtime input keys; no step-output or expression bindings in V1.
- **Graph (draft)** — Unknown edge refs, cycles, branching, disconnected nodes reported as **warnings**.
- **Graph (publish)** — Same checks as **errors**; additionally requires ≥2 nodes, exactly one root and one terminal, single linear path covering all nodes.
- **Publish warnings** — `upstream_artefact_missing` is non-blocking; only `severity: "error"` prevents publish.

## Workflow API (`/api/v1/workflows`)

| Method | Path | Status | Notes |
|---|---|---|---|
| `GET` | `/workflows` | 200 | Paginated `{ data, meta.pagination }`; query `status` |
| `POST` | `/workflows` | 201 | Body: `name`, optional `description` |
| `GET` | `/workflows/:workflowId` | 200 | Detail with draft definition when present |
| `PATCH` | `/workflows/:workflowId/draft` | 200 | Body: `definition`, optional `name`/`description` |
| `POST` | `/workflows/:workflowId/publish` | 200 | Empty body |
| `POST` | `/workflows/:workflowId/duplicate` | 201 | Optional `name`, `description`, `source` (`draft` \| `published`) |
| `DELETE` | `/workflows/:workflowId` | 200 | Soft archive (not hard delete) |

## Builder constraints for Phase 5

- V1 graphs must be a **single linear pipeline** (no branches, loops, or parallel paths) even though the canvas is graph-shaped.
- Draft saves may succeed with warnings; publish requires a valid linear publish profile.
- After publish, the builder should reload to show the new draft (post-publish draft is a copy of the published snapshot).
- Archived workflows have no editable draft in `getWorkflow`; draft-only archived workflows return no version definition in detail API.
- Tool configs and runtime inputs must match registry schemas and binding rules above; inspector forms should surface server validation issues (`errors` / `warnings` with optional `nodeId` / `path`).
- Duplicate from list/builder should not require a client-generated name; server resolves collisions.

## API differences from roadmap / architecture plan

- **Draft update path** — `PATCH …/draft` (roadmap 4.3.8), not flat `PATCH …/:workflowId` (older architecture table).
- **Archive** — `DELETE …/:workflowId` soft archive; no `POST /archive` or hard delete.
- **Create payload** — No initial `definition` in create request; server seeds an empty definition.
- **Publish** — No `changeNote` field; no separate published-version row insert (draft row is promoted in place).
- **Conflict errors** — New `conflict` API code (409) for lifecycle failures (`invalid_transition`, `no_draft_to_publish`, `workflow_archived`, etc.).
- **List filter** — Explicit `status=active|archived|all` query param implemented in 4.3.2.

## Resolved in Phase 4

- **Workflow names** — Unique among active workflows per workspace.
- **One draft** — Enforced by DB partial unique index; archive archives the active draft to keep constraint consistent.
- **Publish model** — In-place draft → published, then new draft row with incremented version number.
- **Duplicate source** — Default draft, optional `source: "published"`; full definition JSON copied including runtime input defaults.
- **Compiled plan** — Persisted at publish with minimal v1 shape; full runtime compiler deferred to Phase 7.

## Deferred beyond Phase 4

- **Workflow builder UI** — Phase 5 (React Flow canvas, inspectors, validation panel, actions).
- **Run engine** — Phase 7 (`workflow_runs`, executors, Vercel Workflows transport).
- **Full compiler / binding resolver at run time** — Stories 7.2.1, 7.2.4.
- **Unarchive, version-specific duplicate from run context** — Not in V1 unless added later (Stories 4.3.7 recommendation, 8.4.3).
- **Read-only archived workflow detail** — Archived draft definitions not exposed via `getWorkflow` today.
