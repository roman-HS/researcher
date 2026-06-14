/**
 * Raw provider API response schemas (untrusted; normalize into `domain` DTOs).
 *
 * Listing search confirmed in Story 6.1.1; other Zillow tools remain placeholders.
 */

export {
  comparablesItemSchema,
  comparablesResponseSchema,
  listingSearchListingItemSchema,
  listingSearchPropertySchema,
  listingSearchResponseSchema,
  propertyDetailItemSchema,
  propertyDetailResponseSchema,
  propertyLookupResponseSchema,
  rentEstimatePayloadSchema,
  rentEstimateResponseSchema,
  type ComparablesItem,
  type ComparablesResponse,
  type ListingSearchListingItem,
  type ListingSearchProperty,
  type ListingSearchResponse,
  type PropertyDetailItem,
  type PropertyDetailResponse,
  type PropertyLookupResponse,
  type RentEstimatePayload,
  type RentEstimateResponse,
} from "@/contracts/providers/zillow";
