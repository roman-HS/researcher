import "server-only";

import {
  createToolExecutorFailedResult,
  createToolExecutorFatalError,
  createToolExecutorSuccessResult,
  type ToolExecutor,
} from "@/contracts/runs";
import {
  formatListingSearchListPriceRange,
  formatListingSearchLocation,
  listingSearchEndpointPath,
  listingSearchRequestSchema,
  listingSearchResponseSchema,
  listingSearchV1ListingStatus,
  LISTING_SEARCH_V1_MAX_RESULTS,
  type ListingSearchRequest,
} from "@/contracts/providers/zillow/listing-search";
import type { ProviderErrorCategory } from "@/contracts/providers/errors";
import { isRapidApiConfigurationError } from "@/integrations/rapidapi/errors";
import { mapRapidApiFailureToProviderError } from "@/integrations/rapidapi/map-failure";
import {
  getEffectiveListingResultCap,
  getWorkflowRunProviderClient,
} from "@/modules/runs/execution-session";
import {
  normalizeListingSearchResponse,
} from "@/modules/providers/zillow/normalize-listing-search";
import {
  listingSearchResolvedConfigSchema,
  type ListingSearchResolvedConfig,
} from "@/modules/tools/definitions/listing-search";

/**
 * Search for properties via private-Zillow and initialize the working set.
 *
 * @see Story 6.3.1 — Implement Listing Search executor
 */

const INVALID_CONFIG_CODE = "invalid_config" as const;
const PROVIDER_RESPONSE_INVALID_CODE = "provider_response_invalid" as const;
const NO_LISTINGS_NORMALIZED_CODE = "no_listings_normalized" as const;
const PROVIDER_CONFIGURATION_CODE = "provider_configuration_error" as const;

const PROVIDER_FATAL_CODES: Partial<Record<ProviderErrorCategory, string>> = {
  rate_limited: "provider_rate_limited",
};

export const executeListingSearch: ToolExecutor = async (input) => {
  const parsedConfig = listingSearchResolvedConfigSchema.safeParse(input.config);

  if (!parsedConfig.success) {
    return createToolExecutorFailedResult(
      createToolExecutorFatalError(
        INVALID_CONFIG_CODE,
        "Listing search configuration is invalid.",
        { debug: { issues: parsedConfig.error.issues } },
      ),
    );
  }

  const providerRequest = buildListingSearchProviderRequest(parsedConfig.data);

  let providerResponse: unknown;

  try {
    const client = getWorkflowRunProviderClient();
    const result = await client.request({
      path: listingSearchEndpointPath,
      method: "GET",
      query: providerRequest,
      endpointName: listingSearchEndpointPath,
    });

    if (!result.ok) {
      const providerError = mapRapidApiFailureToProviderError(result);
      const fatalCode =
        PROVIDER_FATAL_CODES[providerError.category] ?? "provider_error";

      return createToolExecutorFailedResult(
        createToolExecutorFatalError(fatalCode, providerError.userMessage, {
          debug: {
            category: providerError.category,
            endpointName: providerError.endpointName,
            statusCode: providerError.statusCode,
            providerMessage: providerError.providerMessage,
          },
        }),
      );
    }

    providerResponse = result.data;
  } catch (error) {
    if (isRapidApiConfigurationError(error)) {
      return createToolExecutorFailedResult(
        createToolExecutorFatalError(
          PROVIDER_CONFIGURATION_CODE,
          "Listing search is not configured. Contact your workspace administrator.",
          { debug: { reason: error.message } },
        ),
      );
    }

    throw error;
  }

  const parsedResponse = listingSearchResponseSchema.safeParse(providerResponse);

  if (!parsedResponse.success) {
    return createToolExecutorFailedResult(
      createToolExecutorFatalError(
        PROVIDER_RESPONSE_INVALID_CODE,
        "The listing search provider returned an unexpected response.",
        { debug: { issues: parsedResponse.error.issues } },
      ),
    );
  }

  const retrievedAt = new Date().toISOString();
  const normalized = normalizeListingSearchResponse(parsedResponse.data, {
    maxResults: getEffectiveListingResultCap(LISTING_SEARCH_V1_MAX_RESULTS),
    retrievedAt,
  });

  const searchResults = parsedResponse.data.searchResults ?? [];

  if (searchResults.length > 0 && normalized.propertyOrder.length === 0) {
    return createToolExecutorFailedResult(
      createToolExecutorFatalError(
        NO_LISTINGS_NORMALIZED_CODE,
        "Listing search returned results, but none could be normalized.",
      ),
      { itemErrors: normalized.itemErrors },
    );
  }

  return createToolExecutorSuccessResult(
    {
      propertyOrder: normalized.propertyOrder,
      listingsByKey: normalized.listingsByKey,
    },
    { itemErrors: normalized.itemErrors },
  );
};

function buildListingSearchProviderRequest(
  config: ListingSearchResolvedConfig,
): ListingSearchRequest {
  const location =
    config.locationSource === "zip"
      ? formatListingSearchLocation({ zip: config.zip })
      : formatListingSearchLocation({
          city: config.city,
          state: config.state,
        });

  const listPriceRange = formatListingSearchListPriceRange({
    min: config.minPrice,
    max: config.maxPrice,
  });

  return listingSearchRequestSchema.parse({
    location,
    listingStatus: listingSearchV1ListingStatus,
    page: 1,
    ...(listPriceRange ? { listPriceRange } : {}),
  });
}
