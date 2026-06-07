/**
 * Cross-cutting HTTP contracts (envelopes, error codes, pagination).
 * Resource-specific route bodies live under `@/contracts/<resource>`.
 *
 * @see Naming and import rules in `src/contracts/index.ts`
 */

export {
  apiErrorCodes,
  apiErrorStatusByCode,
  type ApiErrorCode,
} from "@/contracts/api/codes";
export {
  apiErrorEnvelopeSchema,
  apiErrorSchema,
  apiMetaSchema,
  apiRequestIdSchema,
  apiSuccessEnvelopeSchema,
  apiValidationErrorDetailsSchema,
  apiValidationIssueSchema,
  type ApiError,
  type ApiErrorEnvelope,
  type ApiMeta,
  type ApiRequestId,
  type ApiSuccessEnvelope,
  type ApiValidationErrorDetails,
  type ApiValidationIssue,
} from "@/contracts/api/envelopes";
export {
  createPaginationQuerySchema,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  apiListMetaSchema,
  apiPaginationMetaSchema,
  paginationQuerySchema,
  type ApiListMeta,
  type ApiPaginationMeta,
  type PaginationQuery,
} from "@/contracts/api/pagination";
