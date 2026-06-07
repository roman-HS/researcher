import { z } from "zod";

/** App-owned entity identifiers — UUID strings at the application boundary. */
export const domainEntityIdSchema = z.uuid();

export type DomainEntityId = z.infer<typeof domainEntityIdSchema>;
export type WorkflowId = DomainEntityId;
export type RunId = DomainEntityId;
export type WorkflowVersionId = DomainEntityId;

/** ISO 8601 datetime with offset — canonical JSON/wire representation. */
export const isoDateTimeSchema = z.iso.datetime({ offset: true });

export type IsoDateTime = z.infer<typeof isoDateTimeSchema>;

const moneyAmountPattern = /^\d+(\.\d{1,2})?$/;

/** Non-negative decimal amount string with up to two fractional digits. */
export const moneyAmountSchema = z
  .string()
  .regex(moneyAmountPattern, "Amount must be a non-negative decimal with up to two fractional digits.");

/** ISO 4217 three-letter currency code. */
export const currencyCodeSchema = z
  .string()
  .length(3, "Currency must be a three-letter ISO 4217 code.")
  .transform((value) => value.toUpperCase());

export const DEFAULT_CURRENCY = "USD" as const;

export const moneySchema = z.object({
  amount: moneyAmountSchema,
  currency: currencyCodeSchema.default(DEFAULT_CURRENCY),
});

export type Money = z.infer<typeof moneySchema>;

export const usStateCodeSchema = z
  .string()
  .length(2, "State must be a two-letter code.");

/**
 * US-oriented postal address. All fields are optional at the primitive level
 * so sparse provider data can still pass shape validation.
 */
export const addressSchema = z.object({
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: usStateCodeSchema.optional(),
  postalCode: z.string().optional(),
  country: z.string().default("US"),
});

export type Address = z.infer<typeof addressSchema>;

export const geoCoordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type GeoCoordinate = z.infer<typeof geoCoordinateSchema>;

export const providerNameSchema = z.string().min(1);

export type ProviderName = z.infer<typeof providerNameSchema>;

export const providerSourceMetadataSchema = z.object({
  provider: providerNameSchema,
  externalId: z.string().min(1),
  additionalExternalIds: z.record(z.string(), z.string()).optional(),
  retrievedAt: isoDateTimeSchema.optional(),
});

export type ProviderSourceMetadata = z.infer<typeof providerSourceMetadataSchema>;
