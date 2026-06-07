import { z } from "zod";

import {
  addressSchema,
  geoCoordinateSchema,
  isoDateTimeSchema,
  moneySchema,
  providerSourceMetadataSchema,
} from "@/contracts/domain/primitives";

export const listingStatusSchema = z.enum([
  "for_sale",
  "pending",
  "sold",
  "off_market",
  "other",
]);

export type ListingStatus = z.infer<typeof listingStatusSchema>;

export const propertyCoreSchema = z.object({
  source: providerSourceMetadataSchema,
  propertyKey: z.string().min(1).optional(),
  address: addressSchema.optional(),
  geo: geoCoordinateSchema.optional(),
  propertyType: z.string().optional(),
});

export type PropertyCore = z.infer<typeof propertyCoreSchema>;

export const propertyListingSchema = propertyCoreSchema.extend({
  listPrice: moneySchema.optional(),
  listingStatus: listingStatusSchema.optional(),
  listingUrl: z.url().optional(),
  listedAt: isoDateTimeSchema.optional(),
});

export type PropertyListing = z.infer<typeof propertyListingSchema>;

export const propertyDetailSchema = propertyCoreSchema.extend({
  yearBuilt: z.number().int().min(1000).max(2100).optional(),
  livingAreaSqft: z.number().int().positive().optional(),
  lotSizeSqft: z.number().int().positive().optional(),
  bedrooms: z.number().nonnegative().optional(),
  bathrooms: z.number().nonnegative().optional(),
  lastSalePrice: moneySchema.optional(),
  lastSaleDate: isoDateTimeSchema.optional(),
  taxAssessedValue: moneySchema.optional(),
  hoaFee: moneySchema.optional(),
});

export type PropertyDetail = z.infer<typeof propertyDetailSchema>;

export const comparablePropertySchema = propertyCoreSchema.extend({
  distanceMiles: z.number().nonnegative().optional(),
  soldAt: isoDateTimeSchema.optional(),
  soldPrice: moneySchema.optional(),
  rentPrice: moneySchema.optional(),
  similarityScore: z.number().min(0).max(1).optional(),
});

export type ComparableProperty = z.infer<typeof comparablePropertySchema>;

export const comparableSetSchema = z.object({
  subjectSource: providerSourceMetadataSchema,
  comparables: z.array(comparablePropertySchema),
  fetchedAt: isoDateTimeSchema.optional(),
  warnings: z.array(z.string()).optional(),
});

export type ComparableSet = z.infer<typeof comparableSetSchema>;

export const rentEstimateSchema = z.object({
  source: providerSourceMetadataSchema,
  estimatedRent: moneySchema.optional(),
  rentRangeLow: moneySchema.optional(),
  rentRangeHigh: moneySchema.optional(),
  confidenceLabel: z.string().optional(),
});

export type RentEstimate = z.infer<typeof rentEstimateSchema>;
