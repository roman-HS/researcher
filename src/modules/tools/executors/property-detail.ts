import "server-only";

import type { PropertyDetail, PropertyListing } from "@/contracts/domain";
import type { ProviderErrorCategory } from "@/contracts/providers/errors";
import {
  propertyDetailEndpointPath,
  propertyDetailRequestSchema,
  propertyDetailResponseSchema,
} from "@/contracts/providers/zillow/property-detail";
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
import { mapRapidApiFailureToProviderError } from "@/integrations/rapidapi/map-failure";
import {
  createProviderRetryWarning,
  mergeProviderRetryDebug,
} from "@/integrations/rapidapi/provider-request-meta";
import {
  getWorkflowRunProviderClient,
  limitEnrichmentTargets,
} from "@/modules/runs/execution-session";
import { normalizePropertyDetailResponse } from "@/modules/providers/zillow/normalize-property-detail";
import {
  propertyDetailResolvedConfigSchema,
  type PropertyDetailResolvedConfig,
} from "@/modules/tools/definitions/property-detail";

/**
 * Enrich listings with detailed property data via private-Zillow.
 *
 * @see Story 6.3.2 — Implement Property Detail executor
 */

export const PROPERTY_DETAIL_ENRICHMENT_CONCURRENCY = 3 as const;

const INVALID_CONFIG_CODE = "invalid_config" as const;
const NO_LISTINGS_TO_ENRICH_CODE = "no_listings_to_enrich" as const;
const NO_PROPERTY_DETAILS_ENRICHED_CODE = "no_property_details_enriched" as const;
const PROVIDER_CONFIGURATION_CODE = "provider_configuration_error" as const;
const MISSING_PROVIDER_ID_CODE = "missing_provider_id" as const;
const PROVIDER_RESPONSE_INVALID_CODE = "provider_response_invalid" as const;
const PROVIDER_ERROR_CODE = "provider_error" as const;
const PROVIDER_RATE_LIMITED_CODE = "provider_rate_limited" as const;
const PROPERTY_DETAIL_NORMALIZATION_FAILED_CODE =
  "property_detail_normalization_failed" as const;

type EnrichmentTarget = {
  propertyKey: PropertyKey;
  listing: PropertyListing;
  zpid: string;
};

type EnrichmentOutcome = {
  detail?: PropertyDetail & { propertyKey: PropertyKey };
  itemError?: ToolExecutorItemError;
  warnings?: ToolExecutorWarning[];
  stopRemaining: boolean;
};

export const executePropertyDetail: ToolExecutor = async (input) => {
  const parsedConfig = propertyDetailResolvedConfigSchema.safeParse(input.config);

  if (!parsedConfig.success) {
    return createToolExecutorFailedResult(
      createToolExecutorFatalError(
        INVALID_CONFIG_CODE,
        "Property detail configuration is invalid.",
        { debug: { issues: parsedConfig.error.issues } },
      ),
    );
  }

  if (Object.keys(input.workingSet.listingsByKey).length === 0) {
    return createToolExecutorFailedResult(
      createToolExecutorFatalError(
        NO_LISTINGS_TO_ENRICH_CODE,
        "No listings are available to enrich with property details.",
      ),
    );
  }

  const targets = limitEnrichmentTargets(
    selectEnrichmentTargets(input.workingSet, parsedConfig.data),
    { stepMaxProperties: parsedConfig.data.maxProperties },
  );

  if (targets.length === 0) {
    return createToolExecutorSuccessResult({});
  }

  const retrievedAt = new Date().toISOString();
  const detailsByKey: Record<
    PropertyKey,
    PropertyDetail & { propertyKey: PropertyKey }
  > = {};
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
          "Property detail enrichment is not configured. Contact your workspace administrator.",
          { debug: { reason: error.message } },
        ),
      );
    }

    throw error;
  }

  const stopState = { value: false };

  await runWithConcurrencyLimit(
    targets,
    PROPERTY_DETAIL_ENRICHMENT_CONCURRENCY,
    async (target) => {
      if (stopState.value) {
        return;
      }

      const outcome = await enrichPropertyTarget(client, target, retrievedAt);

      if (outcome.itemError) {
        itemErrors.push(outcome.itemError);
      }

      if (outcome.warnings) {
        warnings.push(...outcome.warnings);
      }

      if (outcome.detail) {
        detailsByKey[target.propertyKey] = outcome.detail;
      }

      if (outcome.stopRemaining) {
        stopState.value = true;
      }
    },
  );

  if (Object.keys(detailsByKey).length === 0) {
    return createToolExecutorFailedResult(
      createToolExecutorFatalError(
        NO_PROPERTY_DETAILS_ENRICHED_CODE,
        "Property detail enrichment did not return any usable results.",
      ),
      { itemErrors },
    );
  }

  return createToolExecutorSuccessResult({ detailsByKey }, { itemErrors, warnings });
};

function selectEnrichmentTargets(
  workingSet: ExecutionWorkingSet,
  config: PropertyDetailResolvedConfig,
): EnrichmentTarget[] {
  const targets: EnrichmentTarget[] = [];

  for (const propertyKey of workingSet.propertyOrder) {
    if (targets.length >= config.maxProperties) {
      break;
    }

    if (workingSet.detailsByKey[propertyKey]) {
      continue;
    }

    const listing = workingSet.listingsByKey[propertyKey];

    if (!listing) {
      continue;
    }

    targets.push({
      propertyKey,
      listing,
      zpid: listing.source.externalId.trim(),
    });
  }

  return targets;
}

async function enrichPropertyTarget(
  client: RapidApiClient,
  target: EnrichmentTarget,
  retrievedAt: string,
): Promise<EnrichmentOutcome> {
  if (target.zpid.length === 0) {
    return {
      itemError: createToolExecutorItemError(
        MISSING_PROVIDER_ID_CODE,
        "This listing does not include a provider property ID and cannot be enriched.",
        { propertyKey: target.propertyKey },
      ),
      stopRemaining: false,
    };
  }

  const providerRequest = propertyDetailRequestSchema.parse({
    zpid: target.zpid,
  });

  const result = await client.request({
    path: propertyDetailEndpointPath,
    method: "GET",
    query: providerRequest,
    endpointName: propertyDetailEndpointPath,
  });

  if (!result.ok) {
    const providerError = mapRapidApiFailureToProviderError(result);

    return {
      itemError: createToolExecutorItemError(
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
      stopRemaining: providerError.category === "rate_limited",
    };
  }

  const retryWarning = createProviderRetryWarning(result, propertyDetailEndpointPath);

  const parsedResponse = propertyDetailResponseSchema.safeParse(result.data);

  if (!parsedResponse.success) {
    return {
      itemError: createToolExecutorItemError(
        PROVIDER_RESPONSE_INVALID_CODE,
        "The property detail provider returned an unexpected response.",
        {
          propertyKey: target.propertyKey,
          debug: { issues: parsedResponse.error.issues },
        },
      ),
      stopRemaining: false,
    };
  }

  const normalized = normalizePropertyDetailResponse(parsedResponse.data, {
    propertyKey: target.propertyKey,
    listing: target.listing,
    retrievedAt,
    zpid: target.zpid,
  });

  if (!normalized.ok) {
    return {
      itemError: createToolExecutorItemError(
        PROPERTY_DETAIL_NORMALIZATION_FAILED_CODE,
        normalized.userMessage,
        {
          propertyKey: target.propertyKey,
          debug: normalized.debug,
        },
      ),
      stopRemaining: false,
    };
  }

  return {
    detail: normalized.detail,
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
