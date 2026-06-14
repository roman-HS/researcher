import { z } from "zod";

import {
  addressSchema,
  providerNameSchema,
  type Address,
  type ProviderName,
  type ProviderSourceMetadata,
} from "@/contracts/domain";

/**
 * Stable working-set key for a property across workflow steps.
 *
 * @see Story 6.2.2 — Create execution working-set model
 */

export const propertyKeySchema = z.string().min(1);

export type PropertyKey = z.infer<typeof propertyKeySchema>;

const ADDRESS_FALLBACK_PREFIX = "address" as const;

function normalizePropertyKeyToken(value: string | undefined): string {
  const normalized = value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";

  return normalized.length > 0 ? normalized : "_";
}

export function buildPropertyKeyFromProviderId(
  provider: ProviderName,
  externalId: string | number,
): PropertyKey {
  const normalizedExternalId = String(externalId).trim();

  if (normalizedExternalId.length === 0) {
    throw new Error("Cannot build propertyKey from an empty externalId.");
  }

  return propertyKeySchema.parse(`${provider}:${normalizedExternalId}`);
}

export function buildPropertyKeyFromSource(
  source: ProviderSourceMetadata,
): PropertyKey {
  return buildPropertyKeyFromProviderId(source.provider, source.externalId);
}

export function buildPropertyKeyFromAddressFallback(
  provider: ProviderName,
  address: Address,
): PropertyKey {
  const parsedAddress = addressSchema.parse(address);
  const postal = normalizePropertyKeyToken(parsedAddress.postalCode);
  const street = normalizePropertyKeyToken(parsedAddress.line1);
  const city = normalizePropertyKeyToken(parsedAddress.city);
  const state = normalizePropertyKeyToken(parsedAddress.state).toUpperCase();

  return propertyKeySchema.parse(
    `${provider}:${ADDRESS_FALLBACK_PREFIX}:${postal}:${street}:${city}:${state}`,
  );
}

export function derivePropertyKey(input: {
  provider: ProviderName;
  externalId?: string | number | null;
  address?: Address;
}): PropertyKey {
  providerNameSchema.parse(input.provider);

  const externalId =
    input.externalId === null || input.externalId === undefined
      ? undefined
      : String(input.externalId).trim();

  if (externalId && externalId.length > 0) {
    return buildPropertyKeyFromProviderId(input.provider, externalId);
  }

  if (input.address) {
    return buildPropertyKeyFromAddressFallback(input.provider, input.address);
  }

  throw new Error(
    "Cannot derive propertyKey without a provider externalId or address.",
  );
}

export function withPropertyKey<T extends { propertyKey?: string }>(
  propertyKey: PropertyKey,
  value: T,
): T & { propertyKey: PropertyKey } {
  return {
    ...value,
    propertyKey,
  };
}
