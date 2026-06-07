/**
 * Provider-agnostic canonical DTOs and shared primitives.
 *
 * Import direction: `domain` may be imported by any contract folder; it must not
 * import from entity folders (`workflows`, `runs`, etc.).
 *
 * @see Naming and import rules in `src/contracts/index.ts`
 */

export {
  addressSchema,
  currencyCodeSchema,
  DEFAULT_CURRENCY,
  domainEntityIdSchema,
  geoCoordinateSchema,
  isoDateTimeSchema,
  moneyAmountSchema,
  moneySchema,
  providerNameSchema,
  providerSourceMetadataSchema,
  usStateCodeSchema,
  type Address,
  type DomainEntityId,
  type GeoCoordinate,
  type IsoDateTime,
  type Money,
  type ProviderName,
  type ProviderSourceMetadata,
  type RunId,
  type WorkflowId,
  type WorkflowVersionId,
} from "@/contracts/domain/primitives";
export {
  comparablePropertySchema,
  comparableSetSchema,
  listingStatusSchema,
  propertyCoreSchema,
  propertyDetailSchema,
  propertyListingSchema,
  rentEstimateSchema,
  type ComparableProperty,
  type ComparableSet,
  type ListingStatus,
  type PropertyCore,
  type PropertyDetail,
  type PropertyListing,
  type RentEstimate,
} from "@/contracts/domain/property";
