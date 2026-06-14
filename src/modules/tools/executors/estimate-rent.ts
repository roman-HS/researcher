import "server-only";

import type { PropertyDetail, RentEstimate } from "@/contracts/domain";
import type { ProviderErrorCategory } from "@/contracts/providers/errors";
import {
  rentEstimateEndpointPath,
  rentEstimateRequestSchema,
  rentEstimateResponseSchema,
} from "@/contracts/providers/zillow/rent-estimate";
import {
  createToolExecutorFailedResult,
  createToolExecutorFatalError,
  createToolExecutorItemError,
  createToolExecutorSuccessResult,
  createToolExecutorWarning,
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
import { normalizeRentEstimateResponse } from "@/modules/providers/zillow/normalize-rent-estimate";
import {
  estimateRentResolvedConfigSchema,
  type EstimateRentResolvedConfig,
} from "@/modules/tools/definitions/estimate-rent";

/**
 * Fetch rent estimates for enriched properties via private-Zillow.
 *
 * @see Story 6.3.4 — Implement Rent Estimate executor
 */

export const RENT_ESTIMATE_FETCH_CONCURRENCY = 3 as const;

const INVALID_CONFIG_CODE = "invalid_config" as const;
const NO_PROPERTY_DETAILS_FOR_RENT_ESTIMATES_CODE =
  "no_property_details_for_rent_estimates" as const;
const NO_RENT_ESTIMATES_FETCHED_CODE = "no_rent_estimates_fetched" as const;
const PROVIDER_CONFIGURATION_CODE = "provider_configuration_error" as const;
const MISSING_PROVIDER_ID_CODE = "missing_provider_id" as const;
const MISSING_RENT_ESTIMATE_CODE = "missing_rent_estimate" as const;
const PROVIDER_RESPONSE_INVALID_CODE = "provider_response_invalid" as const;
const RENT_ESTIMATE_NORMALIZATION_FAILED_CODE =
  "rent_estimate_normalization_failed" as const;
const PROVIDER_ERROR_CODE = "provider_error" as const;
const PROVIDER_RATE_LIMITED_CODE = "provider_rate_limited" as const;

type RentEstimateTarget = {
  propertyKey: PropertyKey;
  detail: PropertyDetail;
  zpid: string;
};

type RentEstimateOutcome = {
  rentEstimate?: RentEstimate;
  itemErrors: ToolExecutorItemError[];
  warnings: ToolExecutorWarning[];
  stopRemaining: boolean;
};

export const executeEstimateRent: ToolExecutor = async (input) => {
  const parsedConfig = estimateRentResolvedConfigSchema.safeParse(input.config);

  if (!parsedConfig.success) {
    return createToolExecutorFailedResult(
      createToolExecutorFatalError(
        INVALID_CONFIG_CODE,
        "Rent estimate configuration is invalid.",
        { debug: { issues: parsedConfig.error.issues } },
      ),
    );
  }

  if (Object.keys(input.workingSet.detailsByKey).length === 0) {
    return createToolExecutorFailedResult(
      createToolExecutorFatalError(
        NO_PROPERTY_DETAILS_FOR_RENT_ESTIMATES_CODE,
        "No property details are available to fetch rent estimates for.",
      ),
    );
  }

  const targets = limitEnrichmentTargets(selectRentEstimateTargets(input.workingSet));

  if (targets.length === 0) {
    return createToolExecutorSuccessResult({});
  }

  const retrievedAt = new Date().toISOString();
  const rentEstimatesByKey: Record<PropertyKey, RentEstimate> = {};
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
          "Rent estimate fetching is not configured. Contact your workspace administrator.",
          { debug: { reason: error.message } },
        ),
      );
    }

    throw error;
  }

  const stopState = { value: false };

  await runWithConcurrencyLimit(
    targets,
    RENT_ESTIMATE_FETCH_CONCURRENCY,
    async (target) => {
      if (stopState.value) {
        return;
      }

      const outcome = await fetchRentEstimateForTarget(
        client,
        target,
        parsedConfig.data,
        retrievedAt,
      );

      itemErrors.push(...outcome.itemErrors);
      warnings.push(...outcome.warnings);

      if (outcome.rentEstimate) {
        rentEstimatesByKey[target.propertyKey] = outcome.rentEstimate;
      }

      if (outcome.stopRemaining) {
        stopState.value = true;
      }
    },
  );

  if (Object.keys(rentEstimatesByKey).length === 0) {
    return createToolExecutorFailedResult(
      createToolExecutorFatalError(
        NO_RENT_ESTIMATES_FETCHED_CODE,
        "Rent estimate fetching did not return any usable results.",
      ),
      { itemErrors, warnings },
    );
  }

  return createToolExecutorSuccessResult(
    { rentEstimatesByKey },
    { itemErrors, warnings },
  );
};

function selectRentEstimateTargets(
  workingSet: ExecutionWorkingSet,
): RentEstimateTarget[] {
  const targets: RentEstimateTarget[] = [];

  for (const propertyKey of workingSet.propertyOrder) {
    if (workingSet.rentEstimatesByKey[propertyKey]) {
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

async function fetchRentEstimateForTarget(
  client: RapidApiClient,
  target: RentEstimateTarget,
  config: EstimateRentResolvedConfig,
  retrievedAt: string,
): Promise<RentEstimateOutcome> {
  if (target.zpid.length === 0) {
    return {
      itemErrors: [
        createToolExecutorItemError(
          MISSING_PROVIDER_ID_CODE,
          "This property does not include a provider property ID and cannot fetch a rent estimate.",
          { propertyKey: target.propertyKey },
        ),
      ],
      warnings: [],
      stopRemaining: false,
    };
  }

  const providerRequest = rentEstimateRequestSchema.parse({
    zpid: target.zpid,
  });

  const result = await client.request({
    path: rentEstimateEndpointPath,
    method: "GET",
    query: providerRequest,
    endpointName: rentEstimateEndpointPath,
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
            debug: {
              category: providerError.category,
              endpointName: providerError.endpointName,
              statusCode: providerError.statusCode,
              providerMessage: providerError.providerMessage,
            },
          },
        ),
      ],
      warnings: [],
      stopRemaining: providerError.category === "rate_limited",
    };
  }

  const parsedResponse = rentEstimateResponseSchema.safeParse(result.data);

  if (!parsedResponse.success) {
    return {
      itemErrors: [
        createToolExecutorItemError(
          PROVIDER_RESPONSE_INVALID_CODE,
          "The rent estimate provider returned an unexpected response.",
          {
            propertyKey: target.propertyKey,
            debug: { issues: parsedResponse.error.issues },
          },
        ),
      ],
      warnings: [],
      stopRemaining: false,
    };
  }

  const normalized = normalizeRentEstimateResponse(parsedResponse.data, {
    propertyKey: target.propertyKey,
    subjectDetail: target.detail,
    retrievedAt,
    zpid: target.zpid,
    includeRange: config.includeRange,
  });

  if (!normalized.ok) {
    return {
      itemErrors: [
        createToolExecutorItemError(
          RENT_ESTIMATE_NORMALIZATION_FAILED_CODE,
          normalized.userMessage,
          {
            propertyKey: target.propertyKey,
            debug: normalized.debug,
          },
        ),
      ],
      warnings: [],
      stopRemaining: false,
    };
  }

  const warnings: ToolExecutorWarning[] = [];

  if (normalized.missingEstimate) {
    warnings.push(
      createToolExecutorWarning(
        MISSING_RENT_ESTIMATE_CODE,
        "The provider did not return a rent estimate for this property.",
        { propertyKey: target.propertyKey },
      ),
    );
  }

  return {
    rentEstimate: normalized.rentEstimate,
    itemErrors: [],
    warnings,
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
