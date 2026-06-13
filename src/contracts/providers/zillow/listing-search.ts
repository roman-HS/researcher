import { z } from "zod";

import {
  zillowAddressFragmentSchema,
  zillowMoneyFragmentSchema,
  zillowProviderIdSchema,
} from "@/contracts/providers/zillow/shared";

/**
 * UNVERIFIED placeholder contract for private-Zillow listing search.
 * Confirm request parameters and response nesting in Story 6.1.1.
 */

export const listingSearchToolKey = "rapidapi.zillow.searchListings@1" as const;

export const listingSearchRequestSchema = z
  .object({
    zip: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    address: z.string().optional(),
    minPrice: z.number().nonnegative().optional(),
    maxPrice: z.number().nonnegative().optional(),
    minBeds: z.number().nonnegative().optional(),
    maxBeds: z.number().nonnegative().optional(),
    propertyType: z.string().optional(),
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().optional(),
  })
  .loose();

export type ListingSearchRequest = z.infer<typeof listingSearchRequestSchema>;

export const listingSearchListingItemSchema = z
  .object({
    zpid: zillowProviderIdSchema.optional(),
    address: zillowAddressFragmentSchema.optional(),
    listPrice: zillowMoneyFragmentSchema.optional(),
    listingStatus: z.string().optional(),
    listingUrl: z.string().optional(),
    bedrooms: z.number().nonnegative().optional(),
    bathrooms: z.number().nonnegative().optional(),
    livingAreaSqft: z.number().nonnegative().optional(),
  })
  .loose();

export type ListingSearchListingItem = z.infer<
  typeof listingSearchListingItemSchema
>;

export const listingSearchResponseSchema = z
  .object({
    listings: z.array(listingSearchListingItemSchema),
  })
  .loose();

export type ListingSearchResponse = z.infer<typeof listingSearchResponseSchema>;
