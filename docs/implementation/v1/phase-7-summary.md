# Phase 7 Summary — Workflow Execution Runtime

Handoff note for Phase 8. Stories 7.1.1–7.5.3 complete.

## Completed

- **Run persistence** — `workflow_runs`, `workflow_run_steps`, `run_property_results`, `run_area_results`, `run_idempotency_keys` with workspace-scoped indexes and Drizzle schema aligned to `src/contracts/runs/lifecycle.ts`.
- **Compiled plan runtime** — `planVersion: 2` with `executionOrder`, step `title`/`executorKey`, and `runtimeInputs`; loaded via `loadCompiledPlanForPublishedVersion` (legacy v1 plans recompiled on read).
- **Execution context** — Serializable `WorkflowExecutionContext` with working set, usage counters, and env-resolved limits.
- **Run creation** — Idempotent `createRun` (`POST /api/v1/runs`, `Idempotency-Key` header); validates runtime inputs, requires published workflow version, starts background execution.
- **Step dispatcher** — Sequential `dispatchWorkflowRunSteps` resolves bindings, calls executor registry, persists step rows and compact output snapshots.
- **Result persistence** — Final working set mapped to property/area result tables and `outputSummaryJson` on terminal completion.
- **Failure handling** — Unhandled errors mark run `failed`; sanitized `errorJson` on run and step rows (secrets redacted).
- **Run read APIs** — `GET /api/v1/runs` (paginated list) and `GET /api/v1/runs/:runId` (detail with timeline, results, summary, counts).

**Applied migration:** `20260614183620_sudden_blizzard`.

Primary paths: `src/modules/runs/`, `src/contracts/runs/`, `src/app/api/v1/runs/`.

## Run and step lifecycle

| Entity | States | Allowed transitions |
|---|---|---|
| Run | `pending`, `running`, `succeeded`, `partial`, `failed`, `canceled` | `pending` → `running` \| `failed`; `running` → `succeeded` \| `partial` \| `failed` \| `canceled`; terminal states have no outbound transitions |
| Step | `pending`, `running`, `succeeded`, `failed`, `skipped` | `pending` → `running` \| `skipped`; `running` → `succeeded` \| `failed`; terminal states have no outbound transitions |

| Runtime behavior | Detail |
|---|---|
| Run start | `pending` run claimed atomically (`pending` → `running`) before execution; duplicate workers skip already-claimed runs |
| Step execution | One step row created per compiled-plan step; resolved config persisted as `inputJson` when step starts |
| Terminal outcomes | `succeeded` or `partial` persist result rows + summary; `failed` preserves completed step outputs; `canceled` is schema-supported but **no cancel API or worker path sets it in V1** |
| Successful run | `succeeded` and `partial` are both treated as successful (`isSuccessfulRunStatus`) |

## Execution guarantees

- **Linear only** — Dispatcher walks `compiledPlan.steps` in order; no branching, loops, or parallel fan-out.
- **Immutable version** — Every run links to one published `workflowVersionId`; inputs snapshotted to `inputJson`.
- **Binding resolution** — `workflowInput` and `const` bindings resolved at step start via `resolveWorkflowStepConfig`; failures fail the step fatally.
- **Bounded working set** — Listing count, enrichment count, provider calls, per-request timeout, and total run duration enforced in `execution-session.ts`; limit breaches fail the current step fatally.
- **Provider retries** — RapidAPI client retries transient failures (default 2 retries, 500ms base delay, 2s cap); configured via `EXECUTION_PROVIDER_MAX_RETRIES` / `EXECUTION_PROVIDER_RETRY_BASE_DELAY_MS`.
- **Secret safety** — Error and step output persistence runs through `sanitize-persisted-run-error.ts`.

## Configured execution limits (defaults)

Resolved at run start by `loadExecutionLimitsFromEnv()`; overridable per env var:

| Limit | Default | Env override |
|---|---|---|
| `maxListingCount` | 200 (`LISTING_SEARCH_V1_MAX_RESULTS`) | `EXECUTION_MAX_LISTING_COUNT` |
| `maxPropertiesEnrichedPerRun` | 50 | `EXECUTION_MAX_PROPERTIES_ENRICHED_PER_RUN` |
| `maxProviderCallsPerStep` | 100 | `EXECUTION_MAX_PROVIDER_CALLS_PER_STEP` |
| `maxProviderCallsPerRun` | 300 | `EXECUTION_MAX_PROVIDER_CALLS_PER_RUN` |
| `perRequestTimeoutMs` | 30,000 | `EXECUTION_PER_REQUEST_TIMEOUT_MS` (falls back to `RAPIDAPI_TIMEOUT_MS`) |
| `maxRunDurationMs` | 600,000 (10 min) | `EXECUTION_MAX_RUN_DURATION_MS` |

Phase 8 UI may surface these limits when explaining failed or truncated runs.

## Partial-result behavior

- **Trigger** — After enrichment steps (not listing search), any per-property `itemErrors` mark the run `partial` instead of `succeeded`.
- **Persistence** — Successful property rows are still written; failed properties retain item errors on `run_property_results.errorsJson`.
- **Summary annotation** — `WorkflowSummary` gains a data-quality note and `"Some property enrichments failed…"` warning; summary step output snapshot amended when present.
- **Step-level** — Item errors are stored on compact step `outputJson`; root listing-search item errors do not alone trigger partial status.

## Execution transport

| Transport | `EXECUTION_TRANSPORT` | V1 behavior |
|---|---|---|
| Direct (default) | `direct` | `queueMicrotask` → `enqueueWorkflowRunExecution` → in-process `executeWorkflowRun` |
| Vercel Workflows | `vercel_workflows` | Placeholder only — `startRun` throws `transport_unavailable`; run creation marks run `failed` with user-safe message |

**Limitations:** No durable out-of-process queue, no run cancellation, no automatic retry of failed runs, and no websocket/realtime events. Polling `GET /api/v1/runs/:runId` is the intended progress mechanism for Phase 8.

## Run APIs (`/api/v1/runs`)

| Method | Path | Status | Notes |
|---|---|---|---|
| `POST` | `/runs` | 201 / 200 | Requires `Idempotency-Key`; body `workflowId`, optional `inputs`; returns `pollAfterMs: 2000` |
| `GET` | `/runs` | 200 | Paginated list; optional `workflowId` filter; sorted `createdAt` desc |
| `GET` | `/runs/:runId` | 200 | Full detail: header metadata, `runtimeInputs` + `inputValues`, timeline, property/area results, `summary`, `counts`; query `includeStepDetails=true` adds step `inputJson`, full `outputJson`, and error `debug` |

Inaccessible runs return `404 not_found` (workspace-scoped, no cross-tenant leakage). List responses stay compact (no result JSON); detail omits raw step payloads by default.

## Phase 8 should assume

- Poll `GET /api/v1/runs/:runId` while `status` is `pending` or `running`; detail synthesizes `pending` timeline placeholders from the compiled plan.
- Property/area UI reads persisted result rows; archived workflows remain readable via run joins.
- Provider workflows require `RAPIDAPI_HOST` and `RAPIDAPI_KEY`.

## Deferred beyond Phase 7

Run cancellation, rerun API, Vercel Workflows transport, realtime events, multi-page listing search, and separate raw-detail endpoints.
