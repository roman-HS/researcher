import { z } from "zod";

import {
  propertyDetailEndpointPath,
  propertyDetailProviderIdSchema,
} from "@/contracts/providers/zillow/property-detail";

/**
 * Confirmed private-Zillow rent estimate contract (`pro/byzpid`).
 *
 * V1 workflows call by provider ID from upstream Property Detail. The provider
 * returns a point `rentZestimate` only — no rent range or confidence fields.
 * Normalize `rentZestimate` into `RentEstimate.estimatedRent` in Story 6.3.4.
 *
 * Absent or null `rentZestimate` is a recoverable per-property miss (warning,
 * not a hard failure); rent-dependent metrics mark fields unavailable.
 *
 * @see Story 6.1.4 — Confirm private-Zillow rent estimate contract
 */

export const rentEstimateToolKey = "rapidapi.zillow.estimateRent@1" as const;

export const rentEstimateEndpointPath = propertyDetailEndpointPath;

export const rentEstimateProviderIdSchema = propertyDetailProviderIdSchema;

export type RentEstimateProviderId = z.infer<typeof rentEstimateProviderIdSchema>;

/** V1 treats absent `rentZestimate` as a recoverable per-property miss. */
export const rentEstimateV1MissingBehavior = "warning" as const;

/** Wire-accurate query params for `pro/byzpid` rent lookups. */
export const rentEstimateRequestSchema = z.object({
  zpid: rentEstimateProviderIdSchema,
});

export type RentEstimateRequest = z.infer<typeof rentEstimateRequestSchema>;

/**
 * Wire-accurate `propertyDetails` rent fields from `pro/byzpid`.
 * Additional provider fields pass through via `.loose()`.
 */
export const rentEstimatePayloadSchema = z
  .object({
    zpid: rentEstimateProviderIdSchema.optional(),
    rentZestimate: z.number().optional(),
  })
  .loose();

export type RentEstimatePayload = z.infer<typeof rentEstimatePayloadSchema>;

export const rentEstimateResponseSchema = z
  .object({
    message: z.string().optional(),
    source: z.string().optional(),
    zillowURL: z.string().optional(),
    propertyDetails: rentEstimatePayloadSchema.optional(),
  })
  .loose();

export type RentEstimateResponse = z.infer<typeof rentEstimateResponseSchema>;
