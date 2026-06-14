import "server-only";

import {
  createDefaultExecutionLimits,
  DEFAULT_EXECUTION_LIMITS,
  executionLimitsSchema,
  type ExecutionLimits,
} from "@/contracts/runs/execution-limits";
import { DEFAULT_RAPIDAPI_TIMEOUT_MS } from "@/integrations/rapidapi/types";
import { getServerEnv } from "@/lib/env/server";

/**
 * Resolve workflow execution limits from server config with conservative defaults.
 *
 * @see Story 7.4.2 — Add execution limits
 */

export function loadExecutionLimitsFromEnv(): ExecutionLimits {
  const env = getServerEnv();

  return executionLimitsSchema.parse({
    maxListingCount:
      env.EXECUTION_MAX_LISTING_COUNT ?? DEFAULT_EXECUTION_LIMITS.maxListingCount,
    maxPropertiesEnrichedPerRun:
      env.EXECUTION_MAX_PROPERTIES_ENRICHED_PER_RUN ??
      DEFAULT_EXECUTION_LIMITS.maxPropertiesEnrichedPerRun,
    maxProviderCallsPerStep:
      env.EXECUTION_MAX_PROVIDER_CALLS_PER_STEP ??
      DEFAULT_EXECUTION_LIMITS.maxProviderCallsPerStep,
    maxProviderCallsPerRun:
      env.EXECUTION_MAX_PROVIDER_CALLS_PER_RUN ??
      DEFAULT_EXECUTION_LIMITS.maxProviderCallsPerRun,
    perRequestTimeoutMs:
      env.EXECUTION_PER_REQUEST_TIMEOUT_MS ??
      env.RAPIDAPI_TIMEOUT_MS ??
      DEFAULT_RAPIDAPI_TIMEOUT_MS,
    maxRunDurationMs:
      env.EXECUTION_MAX_RUN_DURATION_MS ??
      DEFAULT_EXECUTION_LIMITS.maxRunDurationMs,
  });
}

export function createDefaultExecutionLimitsForRuntime(): ExecutionLimits {
  try {
    return loadExecutionLimitsFromEnv();
  } catch {
    return createDefaultExecutionLimits();
  }
}
