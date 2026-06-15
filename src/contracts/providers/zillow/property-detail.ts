import { z } from "zod";

import { zillowAddressFragmentSchema } from "@/contracts/providers/zillow/shared";

/**
 * Confirmed private-Zillow property detail contract (`pro/byzpid`).
 *
 * One `zpid` per request; batch enrichment is handled by the executor loop.
 * Provider field names are wire-accurate — normalize into `PropertyDetail` in
 * Story 6.3.2.
 *
 * @see Story 6.1.2 — Confirm private-Zillow property detail contract
 */

export const propertyDetailToolKey =
  "rapidapi.zillow.loadPropertyDetails@1" as const;

export const propertyDetailEndpointPath = "pro/byzpid" as const;

export const propertyDetailProviderIdSchema = z.union([
  z.number(),
  z.string().min(1),
]);

export type PropertyDetailProviderId = z.infer<
  typeof propertyDetailProviderIdSchema
>;

/** Wire-accurate query params for `pro/byzpid`. */
export const propertyDetailRequestSchema = z.object({
  zpid: propertyDetailProviderIdSchema,
});

export type PropertyDetailRequest = z.infer<typeof propertyDetailRequestSchema>;

const nullableNumberSchema = z.number().nullable().optional();
const nullableNonNegativeNumberSchema = z.number().nonnegative().nullable().optional();

export const propertyDetailPriceHistoryItemSchema = z
  .object({
    date: z.string().optional(),
    time: z.number().optional(),
    price: z.number().nullable().optional(),
    pricePerSquareFoot: nullableNumberSchema,
    priceChangeRate: z.number().optional(),
    event: z.string().optional(),
    source: z.string().optional(),
    postingIsRental: z.boolean().optional(),
    buyerAgent: z.record(z.string(), z.unknown()).nullable().optional(),
    sellerAgent: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .loose();

export const propertyDetailResoFactsSchema = z
  .object({
    yearBuilt: z.number().int().optional(),
    bedrooms: z.number().nonnegative().optional(),
    bathrooms: z.number().nonnegative().optional(),
    livingArea: z.string().nullable().optional(),
    lotSize: z.string().nullable().optional(),
    taxAssessedValue: nullableNumberSchema,
    associationFee: z
      .union([z.number(), z.string()])
      .nullable()
      .optional(),
    pricePerSquareFoot: nullableNumberSchema,
    homeType: z.string().optional(),
  })
  .loose();

/**
 * Wire-accurate `propertyDetails` payload from `pro/byzpid`.
 * Additional provider fields pass through via `.loose()`.
 */
export const propertyDetailsPayloadSchema = z
  .object({
    zpid: propertyDetailProviderIdSchema.optional(),
    listingDataSource: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    zipcode: z.string().optional(),
    streetAddress: z.string().optional(),
    abbreviatedAddress: z.string().optional(),
    address: zillowAddressFragmentSchema.optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    bedrooms: z.number().nonnegative().optional(),
    bathrooms: z.number().nonnegative().optional(),
    yearBuilt: z.number().int().optional(),
    livingArea: nullableNonNegativeNumberSchema,
    livingAreaValue: nullableNonNegativeNumberSchema,
    livingAreaUnits: z.string().nullable().optional(),
    lotSize: nullableNonNegativeNumberSchema,
    lotAreaValue: nullableNonNegativeNumberSchema,
    lotAreaUnits: z.string().nullable().optional(),
    price: nullableNumberSchema,
    zestimate: nullableNumberSchema,
    rentZestimate: nullableNumberSchema,
    lastSoldPrice: nullableNumberSchema,
    homeStatus: z.string().optional(),
    keystoneHomeStatus: z.string().optional(),
    homeType: z.string().optional(),
    description: z.string().optional(),
    monthlyHoaFee: z.number().nullable().optional(),
    hdpUrl: z.string().optional(),
    daysOnZillow: z.number().nonnegative().optional(),
    currency: z.string().optional(),
    priceHistory: z.array(propertyDetailPriceHistoryItemSchema).optional(),
    resoFacts: propertyDetailResoFactsSchema.optional(),
  })
  .loose();

export type PropertyDetailsPayload = z.infer<
  typeof propertyDetailsPayloadSchema
>;

/** @deprecated Use `propertyDetailsPayloadSchema`. */
export const propertyDetailItemSchema = propertyDetailsPayloadSchema;

/** @deprecated Use `PropertyDetailsPayload`. */
export type PropertyDetailItem = PropertyDetailsPayload;

export const propertyDetailResponseSchema = z
  .object({
    message: z.string().optional(),
    source: z.string().optional(),
    zillowURL: z.string().optional(),
    propertyDetails: propertyDetailsPayloadSchema.optional(),
  })
  .loose();

export type PropertyDetailResponse = z.infer<
  typeof propertyDetailResponseSchema
>;
