import { z } from "zod";

import {
  zillowAddressFragmentSchema,
  zillowMoneyFragmentSchema,
  zillowProviderIdSchema,
} from "@/contracts/providers/zillow/shared";

/**
 * UNVERIFIED placeholder contract for private-Zillow property detail enrichment.
 * Confirm lookup identifiers and response fields in Story 6.1.2.
 */

export const propertyDetailToolKey =
  "rapidapi.zillow.loadPropertyDetails@1" as const;

export const propertyDetailRequestSchema = z
  .object({
    zpid: zillowProviderIdSchema.optional(),
    zpids: z.array(zillowProviderIdSchema).optional(),
  })
  .loose();

export type PropertyDetailRequest = z.infer<typeof propertyDetailRequestSchema>;

export const propertyDetailItemSchema = z
  .object({
    zpid: zillowProviderIdSchema.optional(),
    address: zillowAddressFragmentSchema.optional(),
    yearBuilt: z.number().int().optional(),
    livingAreaSqft: z.number().nonnegative().optional(),
    lotSizeSqft: z.number().nonnegative().optional(),
    bedrooms: z.number().nonnegative().optional(),
    bathrooms: z.number().nonnegative().optional(),
    lastSalePrice: zillowMoneyFragmentSchema.optional(),
    lastSaleDate: z.string().optional(),
    taxAssessedValue: zillowMoneyFragmentSchema.optional(),
    hoaFee: zillowMoneyFragmentSchema.optional(),
    listPrice: zillowMoneyFragmentSchema.optional(),
    listingStatus: z.string().optional(),
  })
  .loose();

export type PropertyDetailItem = z.infer<typeof propertyDetailItemSchema>;

export const propertyDetailResponseSchema = z
  .object({
    properties: z.array(propertyDetailItemSchema),
  })
  .loose();

export type PropertyDetailResponse = z.infer<
  typeof propertyDetailResponseSchema
>;
