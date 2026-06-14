/**
 * Raw provider API response schemas (untrusted; normalize into `domain` DTOs).
 *
 * Listing search confirmed in Story 6.1.1; property detail in Story 6.1.2;
 * comparables in Story 6.1.3.
 */

export {
  comparablesItemSchema,
  comparablesPropertyPayloadSchema,
  comparablesResponseSchema,
  comparablesResultItemSchema,
  listingSearchListingItemSchema,
  listingSearchPropertySchema,
  listingSearchResponseSchema,
  propertyDetailItemSchema,
  propertyDetailsPayloadSchema,
  propertyDetailResponseSchema,
  propertyLookupResponseSchema,
  rentEstimatePayloadSchema,
  rentEstimateResponseSchema,
  type ComparablesItem,
  type ComparablesPropertyPayload,
  type ComparablesResponse,
  type ComparablesResultItem,
  type ListingSearchListingItem,
  type ListingSearchProperty,
  type ListingSearchResponse,
  type PropertyDetailItem,
  type PropertyDetailsPayload,
  type PropertyDetailResponse,
  type PropertyLookupResponse,
  type RentEstimatePayload,
  type RentEstimateResponse,
} from "@/contracts/providers/zillow";
