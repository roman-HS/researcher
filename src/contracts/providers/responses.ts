/**
 * Raw provider API response schemas (untrusted; normalize into `domain` DTOs).
 *
 * UNVERIFIED placeholders — confirm during Stories 6.1.1–6.1.4.
 */

export {
  comparablesItemSchema,
  comparablesResponseSchema,
  listingSearchListingItemSchema,
  listingSearchResponseSchema,
  propertyDetailItemSchema,
  propertyDetailResponseSchema,
  propertyLookupResponseSchema,
  rentEstimatePayloadSchema,
  rentEstimateResponseSchema,
  type ComparablesItem,
  type ComparablesResponse,
  type ListingSearchListingItem,
  type ListingSearchResponse,
  type PropertyDetailItem,
  type PropertyDetailResponse,
  type PropertyLookupResponse,
  type RentEstimatePayload,
  type RentEstimateResponse,
} from "@/contracts/providers/zillow";
