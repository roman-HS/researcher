export const apiErrorCodes = [
  "validation_error",
  "unauthorised",
  "forbidden",
  "not_found",
  "invalid_workflow_definition",
  "tool_contract_mismatch",
  "provider_rate_limited",
  "provider_error",
  "internal_error",
] as const;

export type ApiErrorCode = (typeof apiErrorCodes)[number];

export const apiErrorStatusByCode: Record<ApiErrorCode, number> = {
  validation_error: 400,
  unauthorised: 401,
  forbidden: 403,
  not_found: 404,
  invalid_workflow_definition: 400,
  tool_contract_mismatch: 400,
  provider_rate_limited: 429,
  provider_error: 502,
  internal_error: 500,
};
