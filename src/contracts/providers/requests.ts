/**
 * Outbound provider API request schemas.
 *
 * Listing search confirmed in Story 6.1.1; other Zillow tools remain placeholders.
 */

export {
  comparablesRequestSchema,
  listingSearchRequestSchema,
  propertyDetailRequestSchema,
  propertyLookupByAddressRequestSchema,
  propertyLookupByProviderIdRequestSchema,
  propertyLookupRequestSchema,
  rentEstimateRequestSchema,
  type ComparablesRequest,
  type ListingSearchRequest,
  type PropertyDetailRequest,
  type PropertyLookupRequest,
  type RentEstimateRequest,
} from "@/contracts/providers/zillow";
