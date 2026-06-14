import "server-only";

import type { ProviderErrorCategory } from "@/contracts/providers/errors";

import { mapRapidApiFailureToProviderError } from "@/integrations/rapidapi/map-failure";
import type {
  ProviderRequestRetryMeta,
  RapidApiClient,
  RapidApiRequestOptions,
  RapidApiResult,
} from "@/integrations/rapidapi/types";

/**
 * Bounded retry policy for transient RapidAPI provider failures.
 *
 * @see Story 7.4.3 — Add provider retry behavior
 */

export const DEFAULT_PROVIDER_MAX_RETRIES = 2 as const;
export const DEFAULT_PROVIDER_RETRY_BASE_DELAY_MS = 500 as const;
export const MAX_PROVIDER_RETRY_DELAY_MS = 2_000 as const;

export type ProviderRetryConfig = {
  maxRetries: number;
  baseDelayMs: number;
};

export const DEFAULT_PROVIDER_RETRY_CONFIG = {
  maxRetries: DEFAULT_PROVIDER_MAX_RETRIES,
  baseDelayMs: DEFAULT_PROVIDER_RETRY_BASE_DELAY_MS,
} as const satisfies ProviderRetryConfig;

const RETRYABLE_PROVIDER_ERROR_CATEGORIES = new Set<ProviderErrorCategory>([
  "timeout",
  "provider_unavailable",
]);

export function isRetryableProviderErrorCategory(
  category: ProviderErrorCategory,
): boolean {
  return RETRYABLE_PROVIDER_ERROR_CATEGORIES.has(category);
}

export function computeProviderRetryDelayMs(
  retryIndex: number,
  config: ProviderRetryConfig,
): number {
  const exponentialDelay = config.baseDelayMs * 2 ** retryIndex;
  return Math.min(exponentialDelay, MAX_PROVIDER_RETRY_DELAY_MS);
}

function attachRetryMeta<T>(
  result: RapidApiResult<T>,
  retryMeta: ProviderRequestRetryMeta,
): RapidApiResult<T> {
  if (result.ok && retryMeta.retryCount === 0) {
    return result;
  }

  return {
    ...result,
    retryMeta,
  };
}

export type WithProviderRetriesOptions = {
  beforeAttempt?: () => void;
  sleep?: (delayMs: number) => Promise<void>;
};

export function withProviderRetries(
  client: RapidApiClient,
  config: ProviderRetryConfig,
  options: WithProviderRetriesOptions = {},
): RapidApiClient {
  const sleep =
    options.sleep ??
    ((delayMs: number) => new Promise((resolve) => setTimeout(resolve, delayMs)));

  return {
    name: client.name,

    async request<T = unknown>(
      requestOptions: RapidApiRequestOptions,
    ): Promise<RapidApiResult<T>> {
      const delayMs: number[] = [];
      let attemptCount = 0;

      while (true) {
        attemptCount += 1;
        options.beforeAttempt?.();

        const result = await client.request<T>(requestOptions);
        const retryMeta: ProviderRequestRetryMeta = {
          attemptCount,
          retryCount: delayMs.length,
          delayMs: [...delayMs],
        };

        if (result.ok) {
          return attachRetryMeta(result, retryMeta);
        }

        const providerError = mapRapidApiFailureToProviderError(result);
        const retriesRemaining = config.maxRetries - delayMs.length;

        if (
          retriesRemaining <= 0 ||
          !isRetryableProviderErrorCategory(providerError.category)
        ) {
          return attachRetryMeta(result, retryMeta);
        }

        const nextDelayMs = computeProviderRetryDelayMs(delayMs.length, config);
        delayMs.push(nextDelayMs);
        await sleep(nextDelayMs);
      }
    },
  };
}
