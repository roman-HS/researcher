import { z } from "zod";

import {
  zillowAddressFragmentSchema,
  zillowMoneyFragmentSchema,
  zillowProviderIdSchema,
} from "@/contracts/providers/zillow/shared";

/**
 * UNVERIFIED placeholder contract for private-Zillow comparables.
 * Assumed same provider — confirm endpoint availability and fields in Story 6.1.3.
 */

export const comparablesToolKey = "rapidapi.zillow.fetchComparables@1" as const;

export const comparablesCompTypeSchema = z.enum(["sale", "rent", "both"]);

export type ComparablesCompType = z.infer<typeof comparablesCompTypeSchema>;

export const comparablesRequestSchema = z
  .object({
    zpid: zillowProviderIdSchema,
    maxCount: z.number().int().positive().optional(),
    radiusMiles: z.number().positive().optional(),
    compType: comparablesCompTypeSchema.optional(),
  })
  .loose();

export type ComparablesRequest = z.infer<typeof comparablesRequestSchema>;

export const comparablesItemSchema = z
  .object({
    zpid: zillowProviderIdSchema.optional(),
    address: zillowAddressFragmentSchema.optional(),
    distanceMiles: z.number().nonnegative().optional(),
    soldPrice: zillowMoneyFragmentSchema.optional(),
    soldDate: z.string().optional(),
    rentPrice: zillowMoneyFragmentSchema.optional(),
    similarityScore: z.number().min(0).max(1).optional(),
    bedrooms: z.number().nonnegative().optional(),
    bathrooms: z.number().nonnegative().optional(),
    livingAreaSqft: z.number().nonnegative().optional(),
  })
  .loose();

export type ComparablesItem = z.infer<typeof comparablesItemSchema>;

export const comparablesResponseSchema = z
  .object({
    comparables: z.array(comparablesItemSchema),
  })
  .loose();

export type ComparablesResponse = z.infer<typeof comparablesResponseSchema>;
