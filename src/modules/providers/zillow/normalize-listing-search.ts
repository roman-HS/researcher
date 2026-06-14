import {
  DEFAULT_CURRENCY,
  moneySchema,
  propertyListingSchema,
  type Address,
  type ListingStatus,
  type PropertyListing,
} from "@/contracts/domain";
import type { ToolExecutorItemError } from "@/contracts/runs";
import {
  createToolExecutorItemError,
  derivePropertyKey,
  type PropertyKey,
} from "@/contracts/runs";
import {
  listingSearchPropertySchema,
  type ListingSearchProperty,
  type ListingSearchResponse,
  type ListingSearchResultItem,
} from "@/contracts/providers/zillow/listing-search";
import { ZILLOW_PROVIDER_NAME } from "@/contracts/providers/zillow/shared";
import type { ZillowAddressFragment } from "@/contracts/providers/zillow/shared";

/**
 * Normalize private-Zillow listing search payloads into canonical DTOs.
 *
 * @see Story 6.3.1 — Implement Listing Search executor
 */

export const LISTING_NORMALIZATION_FAILED_CODE = "listing_normalization_failed" as const;

type NormalizeListingSearchOptions = {
  maxResults: number;
  retrievedAt: string;
};

type NormalizeListingSearchOutcome = {
  listingsByKey: Record<PropertyKey, PropertyListing>;
  propertyOrder: PropertyKey[];
  itemErrors: ToolExecutorItemError[];
};

export function normalizeListingSearchResponse(
  response: ListingSearchResponse,
  options: NormalizeListingSearchOptions,
): NormalizeListingSearchOutcome {
  const searchResults = response.searchResults ?? [];
  const listingsByKey: Record<PropertyKey, PropertyListing> = {};
  const propertyOrder: PropertyKey[] = [];
  const itemErrors: ToolExecutorItemError[] = [];

  for (const [index, resultItem] of searchResults.entries()) {
    if (propertyOrder.length >= options.maxResults) {
      break;
    }

    const normalized = normalizeListingSearchResultItem(resultItem, {
      retrievedAt: options.retrievedAt,
      resultIndex: index,
    });

    if (!normalized.ok) {
      itemErrors.push(
        createToolExecutorItemError(
          LISTING_NORMALIZATION_FAILED_CODE,
          normalized.userMessage,
          { debug: normalized.debug },
        ),
      );
      continue;
    }

    const { propertyKey, listing } = normalized.value;

    if (!listingsByKey[propertyKey]) {
      propertyOrder.push(propertyKey);
    }

    listingsByKey[propertyKey] = listing;
  }

  return {
    listingsByKey,
    propertyOrder,
    itemErrors,
  };
}

function normalizeListingSearchResultItem(
  resultItem: ListingSearchResultItem,
  context: { retrievedAt: string; resultIndex: number },
):
  | { ok: true; value: { propertyKey: PropertyKey; listing: PropertyListing } }
  | {
      ok: false;
      userMessage: string;
      debug: Record<string, unknown>;
    } {
  const property = resultItem.property;

  if (!property) {
    return {
      ok: false,
      userMessage: "Listing search result did not include property data.",
      debug: { resultIndex: context.resultIndex },
    };
  }

  const parsedProperty = listingSearchPropertySchema.safeParse(property);

  if (!parsedProperty.success) {
    return {
      ok: false,
      userMessage: "Listing search result property data was invalid.",
      debug: {
        resultIndex: context.resultIndex,
        issues: parsedProperty.error.issues,
      },
    };
  }

  try {
    const listing = normalizeListingSearchProperty(parsedProperty.data, context.retrievedAt);
    const propertyKey = derivePropertyKey({
      provider: ZILLOW_PROVIDER_NAME,
      externalId: parsedProperty.data.zpid,
      address: listing.address,
    });

    return {
      ok: true,
      value: {
        propertyKey,
        listing: propertyListingSchema.parse({
          ...listing,
          propertyKey,
        }),
      },
    };
  } catch (error) {
    return {
      ok: false,
      userMessage: "Listing search result could not be normalized.",
      debug: {
        resultIndex: context.resultIndex,
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    };
  }
}

function normalizeListingSearchProperty(
  property: ListingSearchProperty,
  retrievedAt: string,
): PropertyListing {
  const address = mapProviderAddress(property.address, property.country);
  const externalId = buildSourceExternalId(property, address);
  const palsId = property.listing?.palsId?.trim();

  return propertyListingSchema.parse({
    source: {
      provider: ZILLOW_PROVIDER_NAME,
      externalId,
      ...(palsId ? { additionalExternalIds: { palsId } } : {}),
      retrievedAt,
    },
    address,
    geo: mapProviderGeo(property.location),
    propertyType: property.propertyType?.trim() || undefined,
    listPrice: mapProviderListPrice(property),
    listingStatus: mapProviderListingStatus(
      property.listing?.listingStatus ?? property.hdpView?.listingStatus,
    ),
    listingUrl: parseAbsoluteUrl(property.hdpView?.hdpUrl),
    listedAt: parseListedAt(property.listingDateTimeOnZillow),
  });
}

function buildSourceExternalId(
  property: ListingSearchProperty,
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
    throw new Error("Cannot build source externalId without zpid or address.");
  }

  const parts = [
    address.postalCode?.trim(),
    address.line1?.trim().toLowerCase(),
    address.city?.trim().toLowerCase(),
    address.state?.trim().toUpperCase(),
  ].filter((part): part is string => Boolean(part && part.length > 0));

  if (parts.length === 0) {
    throw new Error("Cannot build source externalId from an empty address.");
  }

  return parts.join(":");
}

function mapProviderAddress(
  fragment: ZillowAddressFragment | undefined,
  country: string | undefined,
): Address | undefined {
  if (!fragment) {
    return undefined;
  }

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
    country: country?.trim() || "US",
  };
}

function mapProviderGeo(
  location: ListingSearchProperty["location"],
): PropertyListing["geo"] {
  const latitude = location?.latitude;
  const longitude = location?.longitude;

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

function mapProviderListPrice(
  property: ListingSearchProperty,
): PropertyListing["listPrice"] {
  const value = property.price?.value ?? property.hdpView?.price;

  if (value === undefined || !Number.isFinite(value) || value < 0) {
    return undefined;
  }

  const currency = property.currency?.trim().toUpperCase();

  return moneySchema.parse({
    amount: formatMoneyAmount(value),
    currency: currency && currency.length === 3 ? currency : DEFAULT_CURRENCY,
  });
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

function mapProviderListingStatus(
  status: string | undefined,
): ListingStatus | undefined {
  if (!status) {
    return undefined;
  }

  switch (status) {
    case "For_Sale":
      return "for_sale";
    case "Sold":
      return "sold";
    default:
      return "other";
  }
}

function parseAbsoluteUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = new URL(value);

    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function parseListedAt(epochValue: number | undefined): string | undefined {
  if (epochValue === undefined || !Number.isFinite(epochValue)) {
    return undefined;
  }

  const timestamp = epochValue > 1_000_000_000_000 ? epochValue : epochValue * 1000;
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}
