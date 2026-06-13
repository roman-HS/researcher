/**
 * Shared Zod contracts — naming and dependency conventions (Story 3.2.1).
 *
 * Naming:
 * - Schemas: `camelCase…Schema` (e.g. `createWorkflowRequestSchema`).
 * - Inferred types: `PascalCase` via `z.infer<typeof …Schema>`.
 * - HTTP request bodies: `…RequestSchema` in the matching entity folder.
 * - HTTP response DTOs: `…ResponseSchema` in the matching entity folder.
 * - Non-HTTP shapes (definitions, tool I/O, canonical DTOs): `…Schema` without
 *   HTTP suffixes (e.g. `workflowDefinitionSchema`, `propertyListingSchema`).
 *
 * Layout:
 * - `api/` — cross-cutting HTTP envelopes, error codes, pagination.
 * - `workflows/`, `runs/`, `tools/` — route I/O (`requests.ts`, `responses.ts`)
 *   and resource-internal shapes (`internal.ts`).
 * - `providers/` — provider adapter request/response shapes (`requests.ts`,
 *   `responses.ts`, `internal.ts`).
 * - `domain/` — provider-agnostic canonical DTOs (`primitives.ts`, `internal.ts`).
 *
 * Import direction (avoid circular deps):
 * - `domain` may be imported by any contract folder.
 * - Entity folders may import `domain` and `api` envelopes only.
 * - `contracts/*` must never import from `modules/`, `db/`, `integrations/`,
 *   `components/`, `ui/`, or `app/`.
 * - Prefer `@/contracts/<domain>` for resource schemas; use this root barrel for
 *   cross-cutting `api` exports and shared ID types only.
 */

export {
  apiErrorCodes,
  apiErrorEnvelopeSchema,
  apiErrorSchema,
  apiErrorStatusByCode,
  apiListMetaSchema,
  apiMetaSchema,
  apiPaginationMetaSchema,
  apiRequestIdSchema,
  apiSuccessEnvelopeSchema,
  apiValidationErrorDetailsSchema,
  apiValidationIssueSchema,
  createPaginationQuerySchema,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  paginationQuerySchema,
  type ApiError,
  type ApiErrorCode,
  type ApiErrorEnvelope,
  type ApiListMeta,
  type ApiMeta,
  type ApiPaginationMeta,
  type ApiRequestId,
  type ApiSuccessEnvelope,
  type ApiValidationErrorDetails,
  type ApiValidationIssue,
  type PaginationQuery,
} from "./api";
export type {
  DomainEntityId,
  WorkflowVersionId,
} from "./domain";
export type { ProviderName } from "./providers";
export type { RunId } from "./runs";
export type {
  ToolArtefactType,
  ToolCategory,
  ToolCategoryDefinition,
  ToolCategorySummary,
  ToolDefinition,
  ToolDefinitionMetadata,
  ToolKey,
  ToolManifest,
} from "./tools";
export type { WorkflowId } from "./workflows";
