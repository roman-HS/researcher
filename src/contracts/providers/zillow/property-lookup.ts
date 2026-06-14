/**
 * Compatibility re-exports — direct property lookup uses the same `pro/byzpid`
 * contract as listing-based enrichment (provider ID only; no address lookup in V1).
 *
 * @see Story 6.1.2 — Confirm private-Zillow property detail contract
 */

export {
  propertyDetailEndpointPath,
  propertyDetailProviderIdSchema,
  propertyDetailRequestSchema,
  propertyDetailResponseSchema,
  propertyDetailToolKey,
  propertyDetailsPayloadSchema,
  type PropertyDetailProviderId,
  type PropertyDetailRequest,
  type PropertyDetailResponse,
  type PropertyDetailsPayload,
} from "@/contracts/providers/zillow/property-detail";

/** @deprecated Use `propertyDetailToolKey`. */
export { propertyDetailToolKey as propertyLookupToolKey } from "@/contracts/providers/zillow/property-detail";

/** @deprecated Use `propertyDetailRequestSchema`. */
export { propertyDetailRequestSchema as propertyLookupRequestSchema } from "@/contracts/providers/zillow/property-detail";

/** @deprecated Use `propertyDetailResponseSchema`. */
export { propertyDetailResponseSchema as propertyLookupResponseSchema } from "@/contracts/providers/zillow/property-detail";

/** @deprecated Use `PropertyDetailRequest`. */
export type { PropertyDetailRequest as PropertyLookupRequest } from "@/contracts/providers/zillow/property-detail";

/** @deprecated Use `PropertyDetailResponse`. */
export type { PropertyDetailResponse as PropertyLookupResponse } from "@/contracts/providers/zillow/property-detail";
