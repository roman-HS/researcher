import "server-only";

import type { ComparableSet, PropertyDetail } from "@/contracts/domain";
import type { ProviderErrorCategory } from "@/contracts/providers/errors";
import {
  comparablesEndpointPath,
  comparablesRequestSchema,
  comparablesResponseSchema,
} from "@/contracts/providers/zillow/comparables";
import {
  createToolExecutorFailedResult,
  createToolExecutorFatalError,
  createToolExecutorItemError,
  createToolExecutorSuccessResult,
  type ExecutionWorkingSet,
  type PropertyKey,
  type ToolExecutor,
  type ToolExecutorItemError,
  type ToolExecutorWarning,
} from "@/contracts/runs";
import { isRapidApiConfigurationError } from "@/integrations/rapidapi/errors";
import type { RapidApiClient } from "@/integrations/rapidapi/types";
import {
  getWorkflowRunProviderClient,
  limitEnrichmentTargets,
} from "@/modules/runs/execution-session";
import { mapRapidApiFailureToProviderError } from "@/integrations/rapidapi/map-failure";
import {
  createProviderRetryWarning,
  mergeProviderRetryDebug,
} from "@/integrations/rapidapi/provider-request-meta";
import { normalizeComparablesResponse } from "@/modules/providers/zillow/normalize-comparables";
import {
  fetchComparablesResolvedConfigSchema,
  type FetchComparablesResolvedConfig,
} from "@/modules/tools/definitions/fetch-comparables";

/**
 * Fetch comparable properties for enriched listings via private-Zillow.
 *
 * @see Story 6.3.3 — Implement Comparables executor
 */

export const COMPARABLES_FETCH_CONCURRENCY = 3 as const;

const INVALID_CONFIG_CODE = "invalid_config" as const;
const NO_PROPERTY_DETAILS_FOR_COMPARABLES_CODE =
  "no_property_details_for_comparables" as const;
const NO_COMPARABLE_SETS_FETCHED_CODE = "no_comparable_sets_fetched" as const;
const PROVIDER_CONFIGURATION_CODE = "provider_configuration_error" as const;
const MISSING_PROVIDER_ID_CODE = "missing_provider_id" as const;
const PROVIDER_RESPONSE_INVALID_CODE = "provider_response_invalid" as const;
const PROVIDER_ERROR_CODE = "provider_error" as const;
const PROVIDER_RATE_LIMITED_CODE = "provider_rate_limited" as const;

type ComparablesTarget = {
  propertyKey: PropertyKey;
  detail: PropertyDetail;
  zpid: string;
};

type ComparablesOutcome = {
  comparableSet?: ComparableSet;
  itemErrors: ToolExecutorItemError[];
  warnings?: ToolExecutorWarning[];
  stopRemaining: boolean;
};

export const executeFetchComparables: ToolExecutor = async (input) => {
  const parsedConfig = fetchComparablesResolvedConfigSchema.safeParse(input.config);

  if (!parsedConfig.success) {
    return createToolExecutorFailedResult(
      createToolExecutorFatalError(
        INVALID_CONFIG_CODE,
        "Comparables configuration is invalid.",
        { debug: { issues: parsedConfig.error.issues } },
      ),
    );
  }

  if (Object.keys(input.workingSet.detailsByKey).length === 0) {
    return createToolExecutorFailedResult(
      createToolExecutorFatalError(
        NO_PROPERTY_DETAILS_FOR_COMPARABLES_CODE,
        "No property details are available to fetch comparables for.",
      ),
    );
  }

  const targets = limitEnrichmentTargets(selectComparablesTargets(input.workingSet));

  if (targets.length === 0) {
    return createToolExecutorSuccessResult({});
  }

  const retrievedAt = new Date().toISOString();
  const comparablesByKey: Record<PropertyKey, ComparableSet> = {};
  const itemErrors: ToolExecutorItemError[] = [];
  const warnings: ToolExecutorWarning[] = [];

  let client: RapidApiClient;

  try {
    client = getWorkflowRunProviderClient();
  } catch (error) {
    if (isRapidApiConfigurationError(error)) {
      return createToolExecutorFailedResult(
        createToolExecutorFatalError(
          PROVIDER_CONFIGURATION_CODE,
          "Comparables fetching is not configured. Contact your workspace administrator.",
          { debug: { reason: error.message } },
        ),
      );
    }

    throw error;
  }

  const stopState = { value: false };

  await runWithConcurrencyLimit(
    targets,
    COMPARABLES_FETCH_CONCURRENCY,
    async (target) => {
      if (stopState.value) {
        return;
      }

      const outcome = await fetchComparablesForTarget(
        client,
        target,
        parsedConfig.data,
        retrievedAt,
      );

      itemErrors.push(...outcome.itemErrors);

      if (outcome.warnings) {
        warnings.push(...outcome.warnings);
      }

      if (outcome.comparableSet) {
        comparablesByKey[target.propertyKey] = outcome.comparableSet;
      }

      if (outcome.stopRemaining) {
        stopState.value = true;
      }
    },
  );

  if (Object.keys(comparablesByKey).length === 0) {
    return createToolExecutorFailedResult(
      createToolExecutorFatalError(
        NO_COMPARABLE_SETS_FETCHED_CODE,
        "Comparables fetching did not return any usable results.",
      ),
      { itemErrors },
    );
  }

  return createToolExecutorSuccessResult(
    { comparablesByKey },
    { itemErrors, warnings },
  );
};

function selectComparablesTargets(
  workingSet: ExecutionWorkingSet,
): ComparablesTarget[] {
  const targets: ComparablesTarget[] = [];

  for (const propertyKey of workingSet.propertyOrder) {
    if (workingSet.comparablesByKey[propertyKey]) {
      continue;
    }

    const detail = workingSet.detailsByKey[propertyKey];

    if (!detail) {
      continue;
    }

    targets.push({
      propertyKey,
      detail,
      zpid: detail.source.externalId.trim(),
    });
  }

  return targets;
}

async function fetchComparablesForTarget(
  client: RapidApiClient,
  target: ComparablesTarget,
  config: FetchComparablesResolvedConfig,
  retrievedAt: string,
): Promise<ComparablesOutcome> {
  if (target.zpid.length === 0) {
    return {
      itemErrors: [
        createToolExecutorItemError(
          MISSING_PROVIDER_ID_CODE,
          "This property does not include a provider property ID and cannot fetch comparables.",
          { propertyKey: target.propertyKey },
        ),
      ],
      stopRemaining: false,
    };
  }

  const providerRequest = comparablesRequestSchema.parse({
    byzpid: target.zpid,
  });

  const result = await client.request({
    path: comparablesEndpointPath,
    method: "GET",
    query: providerRequest,
    endpointName: comparablesEndpointPath,
  });

  if (!result.ok) {
    const providerError = mapRapidApiFailureToProviderError(result);

    return {
      itemErrors: [
        createToolExecutorItemError(
          mapProviderCategoryToItemCode(providerError.category),
          providerError.userMessage,
          {
            propertyKey: target.propertyKey,
            debug: mergeProviderRetryDebug(
              {
                category: providerError.category,
                endpointName: providerError.endpointName,
                statusCode: providerError.statusCode,
                providerMessage: providerError.providerMessage,
              },
              result,
            ),
          },
        ),
      ],
      stopRemaining: providerError.category === "rate_limited",
    };
  }

  const retryWarning = createProviderRetryWarning(result, comparablesEndpointPath);

  const parsedResponse = comparablesResponseSchema.safeParse(result.data);

  if (!parsedResponse.success) {
    return {
      itemErrors: [
        createToolExecutorItemError(
          PROVIDER_RESPONSE_INVALID_CODE,
          "The comparables provider returned an unexpected response.",
          {
            propertyKey: target.propertyKey,
            debug: { issues: parsedResponse.error.issues },
          },
        ),
      ],
      stopRemaining: false,
    };
  }

  const normalized = normalizeComparablesResponse(parsedResponse.data, {
    propertyKey: target.propertyKey,
    subjectDetail: target.detail,
    retrievedAt,
    zpid: target.zpid,
    maxComparables: config.maxComparables,
  });

  return {
    comparableSet: normalized.comparableSet,
    itemErrors: normalized.itemErrors,
    ...(retryWarning ? { warnings: [retryWarning] } : {}),
    stopRemaining: false,
  };
}

function mapProviderCategoryToItemCode(category: ProviderErrorCategory): string {
  if (category === "rate_limited") {
    return PROVIDER_RATE_LIMITED_CODE;
  }

  return PROVIDER_ERROR_CODE;
}

async function runWithConcurrencyLimit<T>(
  items: readonly T[],
  limit: number,
  handler: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) {
        return;
      }

      const item = items[currentIndex];

      if (item === undefined) {
        return;
      }

      await handler(item);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}
