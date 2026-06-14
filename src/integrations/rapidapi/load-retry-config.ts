import "server-only";

import { z } from "zod";

import {
  DEFAULT_PROVIDER_RETRY_BASE_DELAY_MS,
  DEFAULT_PROVIDER_MAX_RETRIES,
  type ProviderRetryConfig,
} from "@/integrations/rapidapi/retry";
import { getServerEnv } from "@/lib/env/server";

/**
 * Resolve provider retry settings from server config with conservative defaults.
 *
 * @see Story 7.4.3 — Add provider retry behavior
 */

const providerRetryConfigSchema = z
  .object({
    maxRetries: z.number().int().nonnegative(),
    baseDelayMs: z.number().int().positive(),
  })
  .strict();

export function loadProviderRetryConfigFromEnv(): ProviderRetryConfig {
  const env = getServerEnv();

  return providerRetryConfigSchema.parse({
    maxRetries:
      env.EXECUTION_PROVIDER_MAX_RETRIES ?? DEFAULT_PROVIDER_MAX_RETRIES,
    baseDelayMs:
      env.EXECUTION_PROVIDER_RETRY_BASE_DELAY_MS ??
      DEFAULT_PROVIDER_RETRY_BASE_DELAY_MS,
  });
}
