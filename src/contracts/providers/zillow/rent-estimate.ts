import { z } from "zod";

import {
  zillowMoneyFragmentSchema,
  zillowProviderIdSchema,
} from "@/contracts/providers/zillow/shared";

/**
 * UNVERIFIED placeholder contract for private-Zillow rent estimates.
 * Assumed same provider — confirm endpoint availability and fields in Story 6.1.4.
 */

export const rentEstimateToolKey = "rapidapi.zillow.estimateRent@1" as const;

export const rentEstimateRequestSchema = z
  .object({
    zpid: zillowProviderIdSchema,
  })
  .loose();

export type RentEstimateRequest = z.infer<typeof rentEstimateRequestSchema>;

export const rentEstimatePayloadSchema = z
  .object({
    zpid: zillowProviderIdSchema.optional(),
    estimatedRent: zillowMoneyFragmentSchema.optional(),
    rentRangeLow: zillowMoneyFragmentSchema.optional(),
    rentRangeHigh: zillowMoneyFragmentSchema.optional(),
    confidenceLabel: z.string().optional(),
  })
  .loose();

export type RentEstimatePayload = z.infer<typeof rentEstimatePayloadSchema>;

export const rentEstimateResponseSchema = z
  .object({
    rentEstimate: rentEstimatePayloadSchema,
  })
  .loose();

export type RentEstimateResponse = z.infer<typeof rentEstimateResponseSchema>;
