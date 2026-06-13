/**
 * Provider adapter contracts (RapidAPI/Zillow request and response shapes).
 *
 * Canonical, provider-agnostic DTOs belong in `@/contracts/domain`.
 *
 * @see Naming and import rules in `src/contracts/index.ts`
 */

export {
  providerErrorCategories,
  providerErrorCategorySchema,
  providerErrorDebugSchema,
  providerErrorSchema,
  providerRateLimitHeadersSchema,
  providerStepErrorSchema,
  providerUserMessages,
  isProviderError,
  isProviderStepError,
  type ProviderError,
  type ProviderErrorCategory,
  type ProviderStepError,
} from "@/contracts/providers/errors";
export {
  providerNameSchema,
  providerSourceMetadataSchema,
  type ProviderName,
  type ProviderSourceMetadata,
} from "@/contracts/domain";
export {
  comparablesCompTypeSchema,
  comparablesItemSchema,
  comparablesRequestSchema,
  comparablesResponseSchema,
  comparablesToolKey,
  listingSearchListingItemSchema,
  listingSearchRequestSchema,
  listingSearchResponseSchema,
  listingSearchToolKey,
  propertyDetailItemSchema,
  propertyDetailRequestSchema,
  propertyDetailResponseSchema,
  propertyDetailToolKey,
  propertyLookupByAddressRequestSchema,
  propertyLookupByProviderIdRequestSchema,
  propertyLookupRequestSchema,
  propertyLookupResponseSchema,
  propertyLookupToolKey,
  rentEstimatePayloadSchema,
  rentEstimateRequestSchema,
  rentEstimateResponseSchema,
  rentEstimateToolKey,
  ZILLOW_PROVIDER_NAME,
  zillowAddressFragmentSchema,
  zillowMoneyFragmentSchema,
  zillowProviderIdSchema,
  type ComparablesCompType,
  type ComparablesItem,
  type ComparablesRequest,
  type ComparablesResponse,
  type ListingSearchListingItem,
  type ListingSearchRequest,
  type ListingSearchResponse,
  type PropertyDetailItem,
  type PropertyDetailRequest,
  type PropertyDetailResponse,
  type PropertyLookupRequest,
  type PropertyLookupResponse,
  type RentEstimatePayload,
  type RentEstimateRequest,
  type RentEstimateResponse,
  type ZillowAddressFragment,
  type ZillowMoneyFragment,
  type ZillowProviderId,
} from "@/contracts/providers/zillow";
