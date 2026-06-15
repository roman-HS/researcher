# Phase 3 Summary — API Conventions, Contracts, Tool Registry, and Provider Shell

Handoff note for Phase 4. Stories 3.1.1–3.4.4 complete.

## Completed

- **API envelopes** — Success/error envelopes, error codes, validation issue shape, and response helpers in `src/contracts/api/` and `src/lib/api/responses.ts`; errors include a generated `requestId`.
- **Pagination** — Page-based query schema (`page`, `pageSize`), list meta helpers in `src/lib/api/pagination.ts`.
- **Route handler wrapper** — `createApiRoute` in `src/lib/api/handler.ts` with Zod body/query/params parsing, auth levels (`none` | `user` | `workspace` | `workspace-owner`), and normalized error mapping.
- **V1 API namespace** — `/api/v1/tools` (live), `/api/v1/workflows` and `/api/v1/runs` (not-implemented placeholders).
- **Contract layout** — `src/contracts/{api,domain,workflows,runs,tools,providers}/` with Zod naming and import-direction rules documented in `src/contracts/index.ts`.
- **Domain DTOs** — Primitives, property/listing/detail/comparable/rent schemas, and analysis DTOs under `src/contracts/domain/`.
- **Tool registry** — Code-first definitions, categories (`search`, `enrich`, `analyze`, `summarize`), registry helpers, and `GET /api/v1/tools` discovery (workspace auth; no executor internals exposed).
- **RapidAPI client shell** — Shared HTTP wrapper in `src/integrations/rapidapi/` with env-based auth headers, configurable timeout, and transport-level success/failure results.
- **Provider error mapping** — Seven internal categories, `mapRapidApiFailureToProviderError()`, and helpers for `AppError` and step `errorJson` persistence.
- **Provider placeholders** — UNVERIFIED private-Zillow request/response schemas under `src/contracts/providers/zillow/`.

**Two placeholder layers:** tool step I/O still uses empty `toolInputPlaceholderSchema` / `toolOutputPlaceholderSchema` in `src/modules/tools/schemas/placeholders.ts`; provider API shapes live separately under `contracts/providers/zillow/` for Phase 6 adapters.

## Registered V1 tools

| Key | Name | Category | Status |
|---|---|---|---|
| `rapidapi.zillow.searchListings@1` | Listing Search | search | config placeholder; I/O placeholder; no executor |
| `rapidapi.zillow.loadPropertyDetails@1` | Property Detail | enrich | config placeholder; I/O placeholder; no executor |
| `rapidapi.zillow.fetchComparables@1` | Fetch Comparables | enrich | config placeholder; I/O placeholder; no executor |
| `rapidapi.zillow.estimateRent@1` | Estimate Rent | enrich | config placeholder; I/O placeholder; no executor |
| `analysis.calculateMetrics@1` | Calculate Metrics | analyze | config placeholder; I/O placeholder; no executor |
| `analysis.scoreProperties@1` | Score Properties | analyze | config placeholder; I/O placeholder; no executor |
| `analysis.aggregateArea@1` | Aggregate Area | analyze | config placeholder; I/O placeholder; no executor |
| `ai.generateSummary@1` | Generate Summary | summarize | config placeholder; I/O placeholder; no executor |

## Unconfirmed RapidAPI / private-Zillow contracts

All modules below are planning assumptions with `.passthrough()` fields — confirm against live RapidAPI docs in Phase 6.

| Placeholder module | Confirm in | Notes |
|---|---|---|
| `zillow/listing-search.ts` | Story 6.1.1 | Location/filter field names unverified |
| `zillow/property-detail.ts` | Story 6.1.2 | Batch lookup by `zpid`/`zpids` assumed |
| `zillow/property-lookup.ts` | Story 6.1.2 | Optional direct lookup by ID or address |
| `zillow/comparables.ts` | Story 6.1.3 | Assumed same provider; sale/rent comp modes unverified |
| `zillow/rent-estimate.ts` | Story 6.1.4 | Assumed same provider; endpoint existence unverified |

## Developer baseline

Phase 2 steps still apply. Additionally:

- Optional for local UI/API work: `RAPIDAPI_HOST`, `RAPIDAPI_KEY`, `RAPIDAPI_TIMEOUT_MS` (default 30s) in `.env.local`.
- Provider client throws on first use if RapidAPI credentials are missing; app boot does not require them.
- `pnpm check` before opening a PR.

## Resolved in Phase 3

- **API request IDs** — Included on all API error responses.
- **Pagination** — Page-based for V1 list endpoints.
- **Route auth** — Workspace-scoped discovery routes; no external API-key auth in V1.
- **RapidAPI credentials** — Single application-level key from env; no workspace BYOK.
- **Rate limits** — Fail step immediately; persist `retryAfterSeconds` metadata; no pause/resume.
- **Provider errors** — Transport failures in the client; category mapping in a separate mapper; `provider_rate_limited` vs `provider_error` API codes only.
- **Provider contracts** — Schemas only (no endpoint paths in contracts); `zillow/` subfolder for future multi-provider growth.

## Unresolved for Phase 4

- **Tool filtering** — Whether tools should later be filtered by workspace plan (Story 3.3.4).
- **Single-property workflows** — Separate “Analyze Single Property” root tool vs Property Detail supporting direct lookup (Stories 3.3.3, 5.3.5).
- **Listing search modes** — Which location modes the provider actually supports: ZIP, city/state, address, etc. (Story 5.3.4; blocks inspector fields until 6.1.1).
- **Private-Zillow coverage** — Whether comparables and rent estimates are available on the subscribed API or need another provider (Story 3.4.3).

## Setup deviations from roadmap

- **Integrations location** — RapidAPI client lives in `src/integrations/rapidapi/` (single-app layout), not a separate `packages/integrations` package.
- **Client vs mapper split** — HTTP wrapper returns transport-level results; provider error categories applied via explicit mapper call (Stories 3.4.1–3.4.2).
- **Provider contract layout** — Per-endpoint modules under `contracts/providers/zillow/` rather than only top-level `requests.ts` / `responses.ts` barrels.
- **Tool vs provider placeholders** — Tool config schemas are defined per tool; step I/O and provider API contracts remain separate placeholder layers.
