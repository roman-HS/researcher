import { z } from "zod";

import { zillowAddressFragmentSchema } from "@/contracts/providers/zillow/shared";

/**
 * Confirmed private-Zillow comparables contract (`comparable_homes`).
 *
 * V1 workflows call by provider ID from upstream Property Detail; the endpoint
 * also accepts address or Zillow URL strings in `byzpid`. Provider responses
 * return recently-sold sale comparables only — normalize into `ComparableSet` in
 * Story 6.3.3.
 *
 * @see Story 6.1.3 — Confirm private-Zillow comparables contract
 */

export const comparablesToolKey = "rapidapi.zillow.fetchComparables@1" as const;

export const comparablesEndpointPath = "comparable_homes" as const;

/** V1 returns recently-sold sale comparables only. */
export const comparablesV1CompStatus = "RECENTLY_SOLD" as const;

export const comparablesProviderIdSchema = z.union([
  z.number(),
  z.string().min(1),
]);

export type ComparablesProviderId = z.infer<typeof comparablesProviderIdSchema>;

/**
 * Wire-accurate query params for `comparable_homes`.
 *
 * `byzpid` accepts a Zillow property ID
 */
export const comparablesRequestSchema = z.object({
  byzpid: z.string().min(1),
});

export type ComparablesRequest = z.infer<typeof comparablesRequestSchema>;

const nullableNumberSchema = z.number().nullable().optional();
const nullableNonNegativeNumberSchema = z.number().nonnegative().nullable().optional();

/**
 * Wire-accurate `property` payload from `comparable_homes` result items.
 * Additional provider fields pass through via `.loose()`.
 */
export const comparablesPropertyPayloadSchema = z
  .object({
    zpid: comparablesProviderIdSchema.optional(),
    address: zillowAddressFragmentSchema.optional(),
    latitude: nullableNumberSchema,
    longitude: nullableNumberSchema,
    bedrooms: z.number().nonnegative().optional(),
    bathrooms: z.number().nonnegative().optional(),
    livingArea: nullableNonNegativeNumberSchema,
    livingAreaValue: nullableNonNegativeNumberSchema,
    livingAreaUnits: z.string().nullable().optional(),
    lotSize: z.number().nullable().optional(),
    lotAreaValue: z.number().nullable().optional(),
    lotAreaUnits: z.string().optional(),
    price: z.number().optional(),
    currency: z.string().optional(),
    homeStatus: z.string().optional(),
    homeType: z.string().optional(),
    hdpUrl: z.string().optional(),
    state: z.string().optional(),
  })
  .loose();

export type ComparablesPropertyPayload = z.infer<
  typeof comparablesPropertyPayloadSchema
>;

/** @deprecated Use `comparablesPropertyPayloadSchema`. */
export const comparablesItemSchema = comparablesPropertyPayloadSchema;

/** @deprecated Use `ComparablesPropertyPayload`. */
export type ComparablesItem = ComparablesPropertyPayload;

export const comparablesResultItemSchema = z
  .object({
    property: comparablesPropertyPayloadSchema.optional(),
  })
  .loose();

export type ComparablesResultItem = z.infer<typeof comparablesResultItemSchema>;

export const comparablesResponseSchema = z
  .object({
    message: z.string().optional(),
    source: z.string().optional(),
    zpid: comparablesProviderIdSchema.optional(),
    comparable_homes: z.array(comparablesResultItemSchema).optional(),
  })
  .loose();

export type ComparablesResponse = z.infer<typeof comparablesResponseSchema>;
