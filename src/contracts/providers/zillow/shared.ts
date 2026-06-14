import { z } from "zod";

/**
 * Shared constants for private-Zillow provider contracts.
 *
 * Listing search confirmed in Story 6.1.1; property detail in Story 6.1.2;
 * comparables in Story 6.1.3. Rent estimate remains a planning assumption until 6.1.4.
 */

export const ZILLOW_PROVIDER_NAME = "rapidapi.zillow" as const;

/** Planning assumption: Zillow property identifier field name and shape. */
export const zillowProviderIdSchema = z.string().min(1);

export type ZillowProviderId = z.infer<typeof zillowProviderIdSchema>;

/** Loose provider address fragment used across placeholder response items. */
export const zillowAddressFragmentSchema = z
  .object({
    streetAddress: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipcode: z.string().optional(),
  })
  .loose();

export type ZillowAddressFragment = z.infer<typeof zillowAddressFragmentSchema>;

/** Loose provider money fragment — provider may use number or string amounts. */
export const zillowMoneyFragmentSchema = z
  .object({
    amount: z.union([z.number(), z.string()]).optional(),
    currency: z.string().optional(),
  })
  .loose();

export type ZillowMoneyFragment = z.infer<typeof zillowMoneyFragmentSchema>;
