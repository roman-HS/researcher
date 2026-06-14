import "server-only";

import {
  createToolExecutorWarning,
  type ToolExecutorWarning,
} from "@/contracts/runs/executors";
import type { RapidApiResult } from "@/integrations/rapidapi/types";

/**
 * Helpers for surfacing provider retry metadata in executor results.
 *
 * @see Story 7.4.3 — Add provider retry behavior
 */

export const PROVIDER_REQUEST_RETRIED_WARNING_CODE =
  "provider_request_retried" as const;

export function getProviderRetryDebugMeta(
  result: RapidApiResult<unknown>,
): Record<string, unknown> | undefined {
  if (!result.retryMeta || result.retryMeta.retryCount === 0) {
    return undefined;
  }

  return {
    providerRetry: result.retryMeta,
  };
}

export function mergeProviderRetryDebug(
  debug: Record<string, unknown>,
  result: RapidApiResult<unknown>,
): Record<string, unknown> {
  const retryDebug = getProviderRetryDebugMeta(result);

  if (!retryDebug) {
    return debug;
  }

  return {
    ...debug,
    ...retryDebug,
  };
}

export function createProviderRetryWarning(
  result: RapidApiResult<unknown>,
  endpointName: string,
): ToolExecutorWarning | undefined {
  if (!result.retryMeta || result.retryMeta.retryCount === 0) {
    return undefined;
  }

  return createToolExecutorWarning(
    PROVIDER_REQUEST_RETRIED_WARNING_CODE,
    `Provider request to ${endpointName} succeeded after ${result.retryMeta.retryCount} ${result.retryMeta.retryCount === 1 ? "retry" : "retries"}.`,
  );
}
