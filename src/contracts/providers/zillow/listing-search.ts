import { z } from "zod";

import { zillowAddressFragmentSchema } from "@/contracts/providers/zillow/shared";

/**
 * Confirmed private-Zillow listing search contract (`search/byaddress`).
 *
 * @see Story 6.1.1 — Confirm private-Zillow listing search contract
 */

export const listingSearchToolKey = "rapidapi.zillow.searchListings@1" as const;

export const listingSearchEndpointPath = "search/byaddress" as const;

/** RapidAPI returns up to 200 results per page; five pages cover the 1,000-result cap. */
export const LISTING_SEARCH_MAX_PAGE = 5 as const;

export const LISTING_SEARCH_RESULTS_PER_PAGE = 200 as const;

/** V1 workflows search active for-sale listings only. */
export const listingSearchV1ListingStatus = "For_Sale" as const;

export const listingSearchListingStatusSchema = z.enum([
  "For_Sale",
  "For_Rent",
  "Sold",
]);

export type ListingSearchListingStatus = z.infer<
  typeof listingSearchListingStatusSchema
>;

export const listingSearchBathroomsFilterSchema = z.enum([
  "Any",
  "OnePlus",
  "OneHalfPlus",
  "TwoPlus",
  "ThreePlus",
  "FourPlus",
]);

export const listingSearchParkingSpotsFilterSchema = z.enum([
  "Any",
  "OnePlus",
  "TwoPlus",
  "ThreePlus",
  "FourPlus",
]);

export const listingSearchMaxHoaFilterSchema = z.enum(["Any"]);

export const listingSearchListingTypeFilterSchema = z.enum(["Any"]);

export const listingSearchMustHaveBasementFilterSchema = z.enum(["No"]);

export const listingSearchDaysOnZillowFilterSchema = z.enum(["Any"]);

export const listingSearchSoldInLastFilterSchema = z.enum(["Any"]);

/**
 * Wire-accurate query params for `search/byaddress`.
 *
 * Params marked `rapid_do_not_include_in_request_key` in RapidAPI docs are omitted.
 */
export const listingSearchRequestSchema = z.object({
  location: z.string().min(1),
  listingStatus: listingSearchListingStatusSchema,
  page: z.number().int().min(1).max(LISTING_SEARCH_MAX_PAGE).optional(),
  listPriceRange: z.string().optional(),
  monthlyPayment: z.string().optional(),
  downPayment: z.number().nonnegative().optional(),
  bed_min: z.string().optional(),
  bed_max: z.string().optional(),
  bathrooms: listingSearchBathroomsFilterSchema.optional(),
  homeType: z.string().optional(),
  space: z.string().optional(),
  maxHOA: listingSearchMaxHoaFilterSchema.optional(),
  listingType: listingSearchListingTypeFilterSchema.optional(),
  listingTypeOptions: z.string().optional(),
  propertyStatus: z.string().optional(),
  tours: z.string().optional(),
  parkingSpots: listingSearchParkingSpotsFilterSchema.optional(),
  move_in_date: z.string().optional(),
  squareFeetRange: z.string().optional(),
  lotSizeRange: z.string().optional(),
  yearBuiltRange: z.string().optional(),
  mustHaveBasement: listingSearchMustHaveBasementFilterSchema.optional(),
  pets: z.string().optional(),
  otherAmenities: z.string().optional(),
  view: z.string().optional(),
  daysOnZillow: listingSearchDaysOnZillowFilterSchema.optional(),
  soldInLast: listingSearchSoldInLastFilterSchema.optional(),
  keywords: z.string().optional(),
});

export type ListingSearchRequest = z.infer<typeof listingSearchRequestSchema>;

export const listingSearchProviderIdSchema = z.union([
  z.number(),
  z.string().min(1),
]);

export type ListingSearchProviderId = z.infer<
  typeof listingSearchProviderIdSchema
>;

export const listingSearchPropertyPriceSchema = z
  .object({
    value: z.number().optional(),
    changedDate: z.number().optional(),
    priceChange: z.number().optional(),
    pricePerSquareFoot: z.number().optional(),
  })
  .loose();

export const listingSearchPropertyListingSchema = z
  .object({
    listingStatus: z.string().optional(),
    marketingStatus: z.string().optional(),
    palsId: z.string().optional(),
    listingSubType: z.record(z.string(), z.unknown()).optional(),
  })
  .loose();

export const listingSearchPropertyHdpViewSchema = z
  .object({
    listingStatus: z.string().optional(),
    price: z.number().optional(),
    hdpUrl: z.string().optional(),
  })
  .loose();

export const listingSearchPropertyEstimatesSchema = z
  .object({
    zestimate: z.number().optional(),
    rentZestimate: z.number().optional(),
  })
  .loose();

export const listingSearchPropertyGeoSchema = z
  .object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  })
  .loose();

export const listingSearchPropertySchema = z
  .object({
    zpid: listingSearchProviderIdSchema.optional(),
    location: listingSearchPropertyGeoSchema.optional(),
    address: zillowAddressFragmentSchema.optional(),
    bedrooms: z.number().nonnegative().optional(),
    bathrooms: z.number().nonnegative().optional(),
    livingArea: z.number().nonnegative().optional(),
    yearBuilt: z.number().int().optional(),
    propertyType: z.string().optional(),
    listingDateTimeOnZillow: z.number().optional(),
    daysOnZillow: z.number().nonnegative().optional(),
    currency: z.string().optional(),
    country: z.string().optional(),
    price: listingSearchPropertyPriceSchema.optional(),
    listing: listingSearchPropertyListingSchema.optional(),
    hdpView: listingSearchPropertyHdpViewSchema.optional(),
    estimates: listingSearchPropertyEstimatesSchema.optional(),
  })
  .loose();

export type ListingSearchProperty = z.infer<typeof listingSearchPropertySchema>;

/** @deprecated Use `listingSearchPropertySchema`. */
export const listingSearchListingItemSchema = listingSearchPropertySchema;

/** @deprecated Use `ListingSearchProperty`. */
export type ListingSearchListingItem = ListingSearchProperty;

export const listingSearchResultItemSchema = z
  .object({
    property: listingSearchPropertySchema.optional(),
    resultType: z.string().optional(),
  })
  .loose();

export type ListingSearchResultItem = z.infer<
  typeof listingSearchResultItemSchema
>;

export const listingSearchResultsCountSchema = z
  .object({
    totalMatchingCount: z.number().nonnegative().optional(),
    ungroupedResultCount: z.number().nonnegative().optional(),
    scrapeable_count: z.number().nonnegative().optional(),
  })
  .loose();

export const listingSearchPagesInfoSchema = z
  .object({
    totalPages: z.number().int().nonnegative().optional(),
    currentPage: z.number().int().positive().optional(),
    resultsPerPage: z.number().int().positive().optional(),
  })
  .loose();

export const listingSearchResponseSchema = z
  .object({
    message: z.string().optional(),
    source: z.string().optional(),
    resultsCount: listingSearchResultsCountSchema.optional(),
    pagesInfo: listingSearchPagesInfoSchema.optional(),
    searchResults: z.array(listingSearchResultItemSchema).optional(),
  })
  .loose();

export type ListingSearchResponse = z.infer<typeof listingSearchResponseSchema>;

/** Build the provider `location` query param from structured author inputs. */
export function formatListingSearchLocation(options: {
  zip?: string;
  city?: string;
  state?: string;
}): string {
  const zip = options.zip?.trim();

  if (zip) {
    return zip;
  }

  const city = options.city?.trim() ?? "";
  const state = options.state?.trim().toUpperCase() ?? "";

  return [city, state].filter(Boolean).join(", ");
}

/** Build the provider `listPriceRange` query param from numeric bounds. */
export function formatListingSearchListPriceRange(options: {
  min?: number;
  max?: number;
}): string | undefined {
  const parts: string[] = [];

  if (options.min !== undefined) {
    parts.push(`min:${options.min}`);
  }

  if (options.max !== undefined) {
    parts.push(`max:${options.max}`);
  }

  return parts.length > 0 ? parts.join(", ") : undefined;
}
