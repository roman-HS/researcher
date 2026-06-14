import {
  DEFAULT_CURRENCY,
  moneySchema,
  propertyDetailSchema,
  type Address,
  type PropertyDetail,
  type PropertyListing,
} from "@/contracts/domain";
import type { PropertyKey } from "@/contracts/runs";
import type {
  PropertyDetailResponse,
  PropertyDetailsPayload,
} from "@/contracts/providers/zillow/property-detail";
import {
  ZILLOW_PROVIDER_NAME,
  type ZillowAddressFragment,
} from "@/contracts/providers/zillow/shared";

type PropertyDetailPriceHistoryItem = NonNullable<
  PropertyDetailsPayload["priceHistory"]
>[number];

type PropertyDetailResoFacts = NonNullable<PropertyDetailsPayload["resoFacts"]>;

/**
 * Normalize private-Zillow property detail payloads into canonical DTOs.
 *
 * @see Story 6.3.2 — Implement Property Detail executor
 */

type NormalizePropertyDetailContext = {
  propertyKey: PropertyKey;
  listing: PropertyListing;
  retrievedAt: string;
  zpid: string;
};

type NormalizePropertyDetailSuccess = {
  ok: true;
  detail: PropertyDetail & { propertyKey: PropertyKey };
};

type NormalizePropertyDetailFailure = {
  ok: false;
  userMessage: string;
  debug: Record<string, unknown>;
};

export type NormalizePropertyDetailResult =
  | NormalizePropertyDetailSuccess
  | NormalizePropertyDetailFailure;

export function normalizePropertyDetailResponse(
  response: PropertyDetailResponse,
  context: NormalizePropertyDetailContext,
): NormalizePropertyDetailResult {
  const payload = response.propertyDetails;

  if (!payload) {
    return {
      ok: false,
      userMessage: "Property detail response did not include property data.",
      debug: { propertyKey: context.propertyKey },
    };
  }

  try {
    const detail = normalizePropertyDetailsPayload(payload, context);
    const parsedDetail = propertyDetailSchema.parse(detail);

    return {
      ok: true,
      detail: {
        ...parsedDetail,
        propertyKey: context.propertyKey,
      },
    };
  } catch (error) {
    return {
      ok: false,
      userMessage: "Property detail response could not be normalized.",
      debug: {
        propertyKey: context.propertyKey,
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    };
  }
}

function normalizePropertyDetailsPayload(
  payload: PropertyDetailsPayload,
  context: NormalizePropertyDetailContext,
): PropertyDetail {
  const resoFacts = payload.resoFacts;
  const providerAddress = mapProviderAddress(payload);
  const listingAddress = context.listing.address;
  const providerGeo = mapProviderGeo(payload.latitude, payload.longitude);

  return {
    source: {
      provider: ZILLOW_PROVIDER_NAME,
      externalId: resolveExternalId(payload, context.zpid),
      retrievedAt: context.retrievedAt,
    },
    address: mergeAddress(providerAddress, listingAddress),
    geo: providerGeo ?? context.listing.geo,
    propertyType:
      payload.homeType?.trim() ||
      resoFacts?.homeType?.trim() ||
      context.listing.propertyType,
    yearBuilt: payload.yearBuilt ?? resoFacts?.yearBuilt,
    livingAreaSqft: resolveLivingAreaSqft(payload, resoFacts),
    lotSizeSqft: resolveLotSizeSqft(payload, resoFacts),
    bedrooms: payload.bedrooms ?? resoFacts?.bedrooms,
    bathrooms: payload.bathrooms ?? resoFacts?.bathrooms,
    lastSalePrice: mapLastSalePrice(payload),
    lastSaleDate: mapLastSaleDate(payload.priceHistory),
    taxAssessedValue: mapTaxAssessedValue(resoFacts),
    hoaFee: mapHoaFee(payload, resoFacts),
  };
}

function resolveExternalId(
  payload: PropertyDetailsPayload,
  fallbackZpid: string,
): string {
  const payloadZpid =
    payload.zpid === null || payload.zpid === undefined
      ? undefined
      : String(payload.zpid).trim();

  if (payloadZpid && payloadZpid.length > 0) {
    return payloadZpid;
  }

  return fallbackZpid;
}

function mergeAddress(
  providerAddress: Address | undefined,
  listingAddress: Address | undefined,
): Address | undefined {
  if (!providerAddress && !listingAddress) {
    return undefined;
  }

  return {
    line1: providerAddress?.line1 ?? listingAddress?.line1,
    line2: providerAddress?.line2 ?? listingAddress?.line2,
    city: providerAddress?.city ?? listingAddress?.city,
    state: providerAddress?.state ?? listingAddress?.state,
    postalCode: providerAddress?.postalCode ?? listingAddress?.postalCode,
    country: providerAddress?.country ?? listingAddress?.country ?? "US",
  };
}

function mapProviderAddress(payload: PropertyDetailsPayload): Address | undefined {
  if (payload.address) {
    return mapAddressFragment(payload.address, payload.country);
  }

  const line1 = payload.streetAddress?.trim() || payload.abbreviatedAddress?.trim();
  const city = payload.city?.trim();
  const state = payload.state?.trim();
  const postalCode = payload.zipcode?.trim();
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
    country: payload.country?.trim() || "US",
  };
}

function mapAddressFragment(
  fragment: ZillowAddressFragment,
  country: string | undefined,
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
    country: country?.trim() || "US",
  };
}

function mapProviderGeo(
  latitude: number | undefined,
  longitude: number | undefined,
): PropertyDetail["geo"] {
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

function resolveLivingAreaSqft(
  payload: PropertyDetailsPayload,
  resoFacts: PropertyDetailResoFacts | undefined,
): number | undefined {
  return (
    parsePositiveInteger(payload.livingArea) ??
    parsePositiveInteger(payload.livingAreaValue) ??
    parseSqftFromString(resoFacts?.livingArea)
  );
}

function resolveLotSizeSqft(
  payload: PropertyDetailsPayload,
  resoFacts: PropertyDetailResoFacts | undefined,
): number | undefined {
  return (
    parsePositiveInteger(payload.lotSize) ??
    parsePositiveInteger(payload.lotAreaValue) ??
    parseSqftFromString(resoFacts?.lotSize)
  );
}

function parsePositiveInteger(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  return Math.round(value);
}

function parseSqftFromString(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);

  if (!match) {
    return undefined;
  }

  const parsed = Number(match[1]);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.round(parsed);
}

function mapLastSalePrice(
  payload: PropertyDetailsPayload,
): PropertyDetail["lastSalePrice"] {
  if (
    payload.lastSoldPrice === undefined ||
    payload.lastSoldPrice === null ||
    !Number.isFinite(payload.lastSoldPrice) ||
    payload.lastSoldPrice < 0
  ) {
    return undefined;
  }

  return moneySchema.parse({
    amount: formatMoneyAmount(payload.lastSoldPrice),
    currency: resolveCurrency(payload.currency),
  });
}

function mapLastSaleDate(
  priceHistory: PropertyDetailPriceHistoryItem[] | undefined,
): PropertyDetail["lastSaleDate"] {
  const soldEntry = findMostRecentSoldPriceHistoryEntry(priceHistory);

  if (!soldEntry) {
    return undefined;
  }

  return parsePriceHistoryDate(soldEntry);
}

function findMostRecentSoldPriceHistoryEntry(
  priceHistory: PropertyDetailPriceHistoryItem[] | undefined,
): PropertyDetailPriceHistoryItem | undefined {
  if (!priceHistory || priceHistory.length === 0) {
    return undefined;
  }

  const soldEntries = priceHistory.filter((entry) => isSoldPriceHistoryEvent(entry.event));

  if (soldEntries.length === 0) {
    return undefined;
  }

  return [...soldEntries].sort(comparePriceHistoryEntries)[0];
}

function isSoldPriceHistoryEvent(event: string | undefined): boolean {
  return event?.trim().toLowerCase().includes("sold") ?? false;
}

function comparePriceHistoryEntries(
  left: PropertyDetailPriceHistoryItem,
  right: PropertyDetailPriceHistoryItem,
): number {
  const leftTimestamp = resolvePriceHistoryTimestamp(left);
  const rightTimestamp = resolvePriceHistoryTimestamp(right);

  if (leftTimestamp !== undefined && rightTimestamp !== undefined) {
    return rightTimestamp - leftTimestamp;
  }

  if (leftTimestamp !== undefined) {
    return -1;
  }

  if (rightTimestamp !== undefined) {
    return 1;
  }

  return 0;
}

function resolvePriceHistoryTimestamp(
  entry: PropertyDetailPriceHistoryItem,
): number | undefined {
  if (entry.time !== undefined && Number.isFinite(entry.time)) {
    return entry.time > 1_000_000_000_000 ? entry.time : entry.time * 1000;
  }

  if (entry.date) {
    const parsed = Date.parse(entry.date);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function parsePriceHistoryDate(
  entry: PropertyDetailPriceHistoryItem,
): string | undefined {
  if (entry.time !== undefined && Number.isFinite(entry.time)) {
    const timestamp = entry.time > 1_000_000_000_000 ? entry.time : entry.time * 1000;
    const date = new Date(timestamp);

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  if (entry.date) {
    const parsed = Date.parse(entry.date);

    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }

  return undefined;
}

function mapTaxAssessedValue(
  resoFacts: PropertyDetailResoFacts | undefined,
): PropertyDetail["taxAssessedValue"] {
  const value = resoFacts?.taxAssessedValue;

  if (value === undefined || !Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return moneySchema.parse({
    amount: formatMoneyAmount(value),
    currency: DEFAULT_CURRENCY,
  });
}

function mapHoaFee(
  payload: PropertyDetailsPayload,
  resoFacts: PropertyDetailResoFacts | undefined,
): PropertyDetail["hoaFee"] {
  const monthlyFee =
    payload.monthlyHoaFee === null ? undefined : payload.monthlyHoaFee;
  const associationFee =
    resoFacts?.associationFee === null ? undefined : resoFacts?.associationFee;
  const value = monthlyFee ?? associationFee;

  if (value === undefined || !Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return moneySchema.parse({
    amount: formatMoneyAmount(value),
    currency: resolveCurrency(payload.currency),
  });
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
