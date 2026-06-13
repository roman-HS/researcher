import { z } from "zod";

import { propertyDetailItemSchema } from "@/contracts/providers/zillow/property-detail";
import {
  zillowAddressFragmentSchema,
  zillowProviderIdSchema,
} from "@/contracts/providers/zillow/shared";

/**
 * UNVERIFIED optional placeholder for direct property lookup by address or provider ID.
 * Confirm supported lookup modes in Story 6.1.2 before wiring executors or inspector forms.
 */

export const propertyLookupToolKey =
  "rapidapi.zillow.loadPropertyDetails@1" as const;

export const propertyLookupByProviderIdRequestSchema = z
  .object({
    lookupMode: z.literal("providerId"),
    zpid: zillowProviderIdSchema,
  })
  .loose();

export const propertyLookupByAddressRequestSchema = z
  .object({
    lookupMode: z.literal("address"),
    address: zillowAddressFragmentSchema,
  })
  .loose();

export const propertyLookupRequestSchema = z.discriminatedUnion("lookupMode", [
  propertyLookupByProviderIdRequestSchema,
  propertyLookupByAddressRequestSchema,
]);

export type PropertyLookupRequest = z.infer<typeof propertyLookupRequestSchema>;

export const propertyLookupResponseSchema = z
  .object({
    property: propertyDetailItemSchema,
  })
  .loose();

export type PropertyLookupResponse = z.infer<
  typeof propertyLookupResponseSchema
>;
