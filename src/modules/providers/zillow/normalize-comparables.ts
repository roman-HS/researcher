import {
  comparablePropertySchema,
  comparableSetSchema,
  DEFAULT_CURRENCY,
  moneySchema,
  type Address,
  type ComparableProperty,
  type ComparableSet,
  type PropertyDetail,
} from "@/contracts/domain";
import {
  createToolExecutorItemError,
  derivePropertyKey,
  type PropertyKey,
  type ToolExecutorItemError,
} from "@/contracts/runs";
import type {
  ComparablesPropertyPayload,
  ComparablesResponse,
  ComparablesResultItem,
} from "@/contracts/providers/zillow/comparables";
import {
  ZILLOW_PROVIDER_NAME,
  type ZillowAddressFragment,
} from "@/contracts/providers/zillow/shared";

/**
 * Normalize private-Zillow comparables payloads into canonical DTOs.
 *
 * @see Story 6.3.3 — Implement Comparables executor
 */

export const COMPARABLE_NORMALIZATION_FAILED_CODE =
  "comparable_normalization_failed" as const;

const NO_COMPARABLES_RETURNED_WARNING =
  "No comparable properties were returned for this subject." as const;

const SOME_COMPARABLES_SKIPPED_WARNING =
  "Some comparable properties could not be normalized." as const;

type NormalizeComparablesContext = {
  propertyKey: PropertyKey;
  subjectDetail: PropertyDetail;
  retrievedAt: string;
  zpid: string;
  maxComparables: number;
};

export type NormalizeComparablesResult = {
  comparableSet: ComparableSet;
  itemErrors: ToolExecutorItemError[];
};

export function normalizeComparablesResponse(
  response: ComparablesResponse,
  context: NormalizeComparablesContext,
): NormalizeComparablesResult {
  const resultItems = response.comparable_homes ?? [];
  const comparables: ComparableProperty[] = [];
  const itemErrors: ToolExecutorItemError[] = [];
  const setWarnings: string[] = [];

  for (const [index, resultItem] of resultItems.entries()) {
    if (comparables.length >= context.maxComparables) {
      break;
    }

    const normalized = normalizeComparableResultItem(resultItem, {
      retrievedAt: context.retrievedAt,
      resultIndex: index,
      subjectPropertyKey: context.propertyKey,
    });

    if (!normalized.ok) {
      itemErrors.push(
        createToolExecutorItemError(
          COMPARABLE_NORMALIZATION_FAILED_CODE,
          normalized.userMessage,
          {
            propertyKey: context.propertyKey,
            debug: normalized.debug,
          },
        ),
      );
      continue;
    }

    comparables.push(normalized.value);
  }

  if (comparables.length === 0 && resultItems.length === 0) {
    setWarnings.push(NO_COMPARABLES_RETURNED_WARNING);
  }

  if (itemErrors.length > 0) {
    setWarnings.push(SOME_COMPARABLES_SKIPPED_WARNING);
  }

  const comparableSet = comparableSetSchema.parse({
    subjectSource: {
      provider: context.subjectDetail.source.provider,
      externalId: context.zpid,
      ...(context.subjectDetail.source.additionalExternalIds
        ? {
            additionalExternalIds:
              context.subjectDetail.source.additionalExternalIds,
          }
        : {}),
      retrievedAt: context.retrievedAt,
    },
    comparables,
    fetchedAt: context.retrievedAt,
    ...(setWarnings.length > 0 ? { warnings: setWarnings } : {}),
  });

  return {
    comparableSet,
    itemErrors,
  };
}

function normalizeComparableResultItem(
  resultItem: ComparablesResultItem,
  context: {
    retrievedAt: string;
    resultIndex: number;
    subjectPropertyKey: PropertyKey;
  },
):
  | { ok: true; value: ComparableProperty }
  | {
      ok: false;
      userMessage: string;
      debug: Record<string, unknown>;
    } {
  const property = resultItem.property;

  if (!property) {
    return {
      ok: false,
      userMessage: "Comparable result did not include property data.",
      debug: {
        subjectPropertyKey: context.subjectPropertyKey,
        resultIndex: context.resultIndex,
      },
    };
  }

  if (shouldSkipComparableProperty(property)) {
    return {
      ok: false,
      userMessage: "Comparable property was excluded because it is not a sold comp.",
      debug: {
        subjectPropertyKey: context.subjectPropertyKey,
        resultIndex: context.resultIndex,
        homeStatus: property.homeStatus,
      },
    };
  }

  try {
    return {
      ok: true,
      value: comparablePropertySchema.parse(
        normalizeComparableProperty(property, context.retrievedAt),
      ),
    };
  } catch (error) {
    return {
      ok: false,
      userMessage: "Comparable property could not be normalized.",
      debug: {
        subjectPropertyKey: context.subjectPropertyKey,
        resultIndex: context.resultIndex,
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    };
  }
}

function shouldSkipComparableProperty(property: ComparablesPropertyPayload): boolean {
  const homeStatus = property.homeStatus?.trim();

  if (!homeStatus) {
    return false;
  }

  return !homeStatus.toLowerCase().includes("sold");
}

function normalizeComparableProperty(
  property: ComparablesPropertyPayload,
  retrievedAt: string,
): ComparableProperty {
  const address = mapProviderAddress(property);
  const externalId = resolveComparableExternalId(property, address);
  const propertyKey = derivePropertyKey({
    provider: ZILLOW_PROVIDER_NAME,
    externalId,
    address,
  });

  return {
    source: {
      provider: ZILLOW_PROVIDER_NAME,
      externalId,
      retrievedAt,
    },
    propertyKey,
    address,
    geo: mapProviderGeo(property.latitude, property.longitude),
    propertyType: property.homeType?.trim() || undefined,
    soldPrice: mapSoldPrice(property),
    distanceMiles: mapOptionalNonNegativeNumber(property, "distanceMiles", "distance"),
    similarityScore: mapOptionalSimilarityScore(property),
  };
}

function resolveComparableExternalId(
  property: ComparablesPropertyPayload,
  address: Address | undefined,
): string {
  const zpid =
    property.zpid === null || property.zpid === undefined
      ? undefined
      : String(property.zpid).trim();

  if (zpid && zpid.length > 0) {
    return zpid;
  }

  if (!address) {
    throw new Error("Cannot build comparable externalId without zpid or address.");
  }

  const parts = [
    address.postalCode?.trim(),
    address.line1?.trim().toLowerCase(),
    address.city?.trim().toLowerCase(),
    address.state?.trim().toUpperCase(),
  ].filter((part): part is string => Boolean(part && part.length > 0));

  if (parts.length === 0) {
    throw new Error("Cannot build comparable externalId from an empty address.");
  }

  return parts.join(":");
}

function mapProviderAddress(
  property: ComparablesPropertyPayload,
): Address | undefined {
  if (property.address) {
    return mapAddressFragment(property.address);
  }

  return undefined;
}

function mapAddressFragment(
  fragment: ZillowAddressFragment,
): Address | undefined {
  const line1 = fragment.streetAddress?.trim();
  const city = fragment.city?.trim();
  const state = fragment.state?.trim();
  const postalCode = fragment.zipcode?.trim();
  const normalizedState =
    state && state.length === 2 ? state.toUpperCase() : undefined;

  if (!line1 && !city && !normalizedState && !postalCode) {
    return undefined;
  }

  return {
    ...(line1 ? { line1 } : {}),
    ...(city ? { city } : {}),
    ...(normalizedState ? { state: normalizedState } : {}),
    ...(postalCode ? { postalCode } : {}),
    country: "US",
  };
}

function mapProviderGeo(
  latitude: number | undefined,
  longitude: number | undefined,
): ComparableProperty["geo"] {
  if (
    latitude === undefined ||
    longitude === undefined ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return undefined;
  }

  return {
    latitude,
    longitude,
  };
}

function mapSoldPrice(
  property: ComparablesPropertyPayload,
): ComparableProperty["soldPrice"] {
  if (
    property.price === undefined ||
    !Number.isFinite(property.price) ||
    property.price < 0
  ) {
    return undefined;
  }

  return moneySchema.parse({
    amount: formatMoneyAmount(property.price),
    currency: resolveCurrency(property.currency),
  });
}

function mapOptionalNonNegativeNumber(
  property: ComparablesPropertyPayload,
  ...fieldNames: string[]
): number | undefined {
  const record = property as Record<string, unknown>;

  for (const fieldName of fieldNames) {
    const value = record[fieldName];

    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      return value;
    }
  }

  return undefined;
}

function mapOptionalSimilarityScore(
  property: ComparablesPropertyPayload,
): number | undefined {
  const value = mapOptionalNonNegativeNumber(
    property,
    "similarityScore",
    "similarity",
  );

  if (value === undefined || value > 1) {
    return undefined;
  }

  return value;
}

function resolveCurrency(currency: string | undefined): string {
  const normalized = currency?.trim().toUpperCase();

  return normalized && normalized.length === 3 ? normalized : DEFAULT_CURRENCY;
}

function formatMoneyAmount(value: number): string {
  const rounded = Math.round(value * 100) / 100;

  if (!Number.isFinite(rounded) || rounded < 0) {
    throw new Error("Invalid money amount.");
  }

  if (Number.isInteger(rounded)) {
    return String(rounded);
  }

  return rounded.toFixed(2).replace(/0$/, "");
}
