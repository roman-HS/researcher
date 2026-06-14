export {
  createRapidApiClient,
  createRapidApiTransportClient,
  getRapidApiClient,
} from "@/integrations/rapidapi/client";
export {
  loadProviderRetryConfigFromEnv,
} from "@/integrations/rapidapi/load-retry-config";
export {
  createProviderRetryWarning,
  getProviderRetryDebugMeta,
  mergeProviderRetryDebug,
  PROVIDER_REQUEST_RETRIED_WARNING_CODE,
} from "@/integrations/rapidapi/provider-request-meta";
export {
  computeProviderRetryDelayMs,
  DEFAULT_PROVIDER_MAX_RETRIES,
  DEFAULT_PROVIDER_RETRY_BASE_DELAY_MS,
  DEFAULT_PROVIDER_RETRY_CONFIG,
  isRetryableProviderErrorCategory,
  MAX_PROVIDER_RETRY_DELAY_MS,
  withProviderRetries,
  type ProviderRetryConfig,
} from "@/integrations/rapidapi/retry";
export {
  RapidApiConfigurationError,
  isRapidApiConfigurationError,
} from "@/integrations/rapidapi/errors";
export {
  mapRapidApiFailureToProviderError,
  parseRetryAfterSeconds,
  providerErrorToAppError,
  providerErrorToStepErrorJson,
} from "@/integrations/rapidapi/map-failure";
export {
  DEFAULT_RAPIDAPI_TIMEOUT_MS,
  RAPIDAPI_CLIENT_NAME,
  type CreateRapidApiClientOptions,
  type RapidApiClient,
  type RapidApiFailureKind,
  type RapidApiFailureResult,
  type RapidApiHttpMethod,
  type RapidApiRequestOptions,
  type RapidApiResult,
  type RapidApiSafeHeaders,
  type RapidApiSuccessResult,
  type ProviderRequestRetryMeta,
} from "@/integrations/rapidapi/types";
