# Phase 6 Summary — Provider Adapters and Deterministic Tool Executors

Handoff note for Phase 7. Stories 6.1.1–6.4.5 complete.

## Completed

- **Confirmed RapidAPI contracts** — Wire-accurate Zod schemas under `src/contracts/providers/zillow/` for four private-Zillow endpoints (see table below).
- **Provider normalizers** — Canonical DTO mapping in `src/modules/providers/zillow/` (`normalize-listing-search`, `normalize-property-detail`, `normalize-comparables`, `normalize-rent-estimate`).
- **Provider executors** — Listing Search, Property Detail, Fetch Comparables, and Estimate Rent call `getRapidApiClient()` with per-item concurrency (3) where applicable; transport failures map through `mapRapidApiFailureToProviderError`.
- **Execution contracts** — Tool executor interface, success/failure/warning shapes, and property-key helpers in `src/contracts/runs/`.
- **Working set** — Versioned in-memory state (`propertyOrder`, `*ByKey` maps, optional `summary`) merged between steps via `mergeExecutionWorkingSet`.
- **Executor registry** — All eight V1 tool keys resolve to real executors in `src/modules/tools/executors/registry.ts`.
- **Deterministic analysis** — Metrics, scoring, area aggregation, and summary compute modules under `src/modules/analysis/` with unit tests on core logic.

Primary paths: `src/contracts/providers/zillow/`, `src/modules/providers/zillow/`, `src/modules/tools/executors/`, `src/modules/analysis/`, `src/contracts/runs/`.

## Confirmed RapidAPI / private-Zillow contracts

| Endpoint | Contract module | V1 usage |
|---|---|---|
| `search/byaddress` | `zillow/listing-search.ts` | ZIP or `city, state` location; `For_Sale` only; optional `listPriceRange`; page 1 only (≤200 results) |
| `pro/byzpid` | `zillow/property-detail.ts` | One `zpid` per request; batch enrichment in executor loop |
| `comparable_homes` | `zillow/comparables.ts` | `byzpid` lookup; recently-sold sale comparables only |
| `pro/byzpid` | `zillow/rent-estimate.ts` | Same endpoint as property detail; reads `rentZestimate` from `propertyDetails` |

Schemas use `.loose()` for forward-compatible provider fields. `property-lookup.ts` re-exports the property-detail contract (provider ID only; no address lookup in V1).

## Implemented provider-backed tools

| Key | Executor | Working-set output |
|---|---|---|
| `rapidapi.zillow.searchListings@1` | `executeListingSearch` | Initializes `propertyOrder`, `listingsByKey` |
| `rapidapi.zillow.loadPropertyDetails@1` | `executePropertyDetail` | `detailsByKey` (listing-based; respects `maxProperties`) |
| `rapidapi.zillow.fetchComparables@1` | `executeFetchComparables` | `comparablesByKey` |
| `rapidapi.zillow.estimateRent@1` | `executeEstimateRent` | `rentEstimatesByKey` |

Per-property misses (missing `zpid`, absent rent, normalization failures) emit item errors or warnings; rate limits fail the step fatally with `provider_rate_limited`.

## Implemented deterministic analysis tools

| Key | Executor | Compute module | Working-set output |
|---|---|---|---|
| `analysis.calculateMetrics@1` | `executeCalculateMetrics` | `metrics/compute-metric-bundle.ts` | `metricsByKey` |
| `analysis.scoreProperties@1` | `executeScoreProperties` | `scoring/compute-property-score.ts` | `scoresByKey` |
| `analysis.aggregateArea@1` | `executeAggregateArea` | `aggregation/compute-area-aggregates.ts` | `areaAggregatesByKey` |
| `ai.generateSummary@1` | `executeGenerateSummary` | `summary/compute-workflow-summary.ts` | `summary` |

All analysis executors are non-LLM. Summary ranks top properties by score, supports configurable sections/Markdown, and succeeds with placeholder content when upstream artefacts are missing.

## Provider limitations and contract mismatches

- **Listing search** — V1 fetches a single page (max 200 listings); multi-page search is not implemented despite provider support for pages 1–5. Many documented query filters exist in the contract schema but are not exposed in the builder (only ZIP/city-state and min/max price).
- **Property detail** — `sourceMode` is `listingBased` only; no standalone address/URL lookup workflow. Each property requires a separate `pro/byzpid` call.
- **Comparables** — Sale comps only; no rent-comparable mode. `maxComparables` is applied client-side after fetch — the provider request has no radius, count, or filter params. Distance/similarity fields are mapped when present but often sparse.
- **Rent estimate** — Reuses `pro/byzpid` (duplicate provider call when both Property Detail and Estimate Rent run). Provider returns a point `rentZestimate` only; `includeRange` in the inspector reads optional `rentZestimateLow`/`High` if ever returned — not confirmed on the live contract. Missing/null rent is a recoverable warning; rent-dependent metrics mark fields unavailable.
- **Score config** — `minimumScore` is in the inspector schema but not enforced by the scoring executor.
- **Tool I/O schemas** — Step input/output still use `toolInputPlaceholderSchema` / `toolOutputPlaceholderSchema`; runtime validation is via working-set patches, not per-tool output schemas.

## Execution must not assume

Phase 7 run engine and persistence should treat Phase 6 executors as library functions behind a dispatcher:

- **Config resolution is not wired** — Executors expect binding-free `*ResolvedConfigSchema` values. Story 7.2.4 must resolve `workflowInput` bindings before calling executors; the builder UI still writes constants only.
- **Working set is in-memory only** — Nothing persists run state until Phase 7; partial working sets are valid between steps.
- **Property keys are stable** — Prefer `provider:externalId` (`derivePropertyKey`); address fallback keys exist for listings without `zpid`.
- **Provider credentials required at runtime** — `RAPIDAPI_HOST` and `RAPIDAPI_KEY` must be set for provider steps; analysis-only paths (metrics → score → summary on pre-seeded working sets) do not need RapidAPI.
- **Executor registry is complete** — All V1 tools have implementations; `createNotImplementedToolExecutor` is a defensive fallback only.
- **Summary is terminal presentation** — Non-fatal warnings for empty sections; structured `WorkflowSummary` plus optional Markdown is the run output surface for Story 7.5 / Phase 8 UI.

## Open product decisions (unchanged from planning)

- **Listing search pagination** — Whether V1 runs should auto-fetch beyond 200 results.
- **Single-property root workflows** — Property Detail does not support direct lookup without a prior Listing Search step.
- **Rent estimate duplication** — Whether Estimate Rent should reuse Property Detail responses instead of re-calling `pro/byzpid`.
- **Minimum score filtering** — Whether sub-threshold properties should be excluded from scoring output or summary top-N.

## Developer baseline

Phase 3–5 steps still apply. Additionally:

- Set `RAPIDAPI_HOST`, `RAPIDAPI_KEY`, and optionally `RAPIDAPI_TIMEOUT_MS` (default 30s) for provider executor development.
- Unit tests for analysis modules: `pnpm test src/modules/analysis/`.
- `pnpm check` before opening a PR.
