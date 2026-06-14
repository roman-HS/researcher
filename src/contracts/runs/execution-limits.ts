import { z } from "zod";

import { LISTING_SEARCH_V1_MAX_RESULTS } from "@/contracts/providers/zillow/listing-search";

/**
 * Bounded execution limits carried on a workflow run context.
 *
 * Enforcement is deferred to Story 7.4.2 — Add execution limits.
 *
 * @see Story 7.2.5 — Implement execution context service
 */

export const executionLimitsSchema = z
  .object({
    maxListingCount: z.number().int().positive(),
    maxPropertiesEnrichedPerRun: z.number().int().positive(),
    maxProviderCallsPerStep: z.number().int().positive(),
    maxProviderCallsPerRun: z.number().int().positive(),
    perRequestTimeoutMs: z.number().int().positive(),
  })
  .strict();

export type ExecutionLimits = z.infer<typeof executionLimitsSchema>;

/** Conservative v1 defaults; Story 7.4.2 may override via env at run start. */
export const DEFAULT_EXECUTION_LIMITS = {
  maxListingCount: LISTING_SEARCH_V1_MAX_RESULTS,
  maxPropertiesEnrichedPerRun: 50,
  maxProviderCallsPerStep: 100,
  maxProviderCallsPerRun: 300,
  perRequestTimeoutMs: 30_000,
} as const satisfies ExecutionLimits;

export function parseExecutionLimits(value: unknown): ExecutionLimits {
  return executionLimitsSchema.parse(value);
}

export function createDefaultExecutionLimits(): ExecutionLimits {
  return executionLimitsSchema.parse(DEFAULT_EXECUTION_LIMITS);
}
