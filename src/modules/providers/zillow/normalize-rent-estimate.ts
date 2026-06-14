import {
  DEFAULT_CURRENCY,
  moneySchema,
  rentEstimateSchema,
  type PropertyDetail,
  type RentEstimate,
} from "@/contracts/domain";
import type { PropertyKey } from "@/contracts/runs";
import type {
  RentEstimatePayload,
  RentEstimateResponse,
} from "@/contracts/providers/zillow/rent-estimate";
import { ZILLOW_PROVIDER_NAME } from "@/contracts/providers/zillow/shared";

/**
 * Normalize private-Zillow rent estimate payloads into canonical DTOs.
 *
 * @see Story 6.3.4 — Implement Rent Estimate executor
 */

type NormalizeRentEstimateContext = {
  propertyKey: PropertyKey;
  subjectDetail: PropertyDetail;
  retrievedAt: string;
  zpid: string;
  includeRange: boolean;
};

type NormalizeRentEstimateSuccess = {
  ok: true;
  rentEstimate: RentEstimate;
  missingEstimate: boolean;
};

type NormalizeRentEstimateFailure = {
  ok: false;
  userMessage: string;
  debug: Record<string, unknown>;
};

export type NormalizeRentEstimateResult =
  | NormalizeRentEstimateSuccess
  | NormalizeRentEstimateFailure;

export function normalizeRentEstimateResponse(
  response: RentEstimateResponse,
  context: NormalizeRentEstimateContext,
): NormalizeRentEstimateResult {
  const payload = response.propertyDetails;

  if (!payload) {
    return {
      ok: false,
      userMessage: "Rent estimate response did not include property data.",
      debug: { propertyKey: context.propertyKey },
    };
  }

  try {
    const rentEstimate = normalizeRentEstimatePayload(payload, context);
    const parsedEstimate = rentEstimateSchema.parse(rentEstimate);
    const missingEstimate = parsedEstimate.estimatedRent === undefined;

    return {
      ok: true,
      rentEstimate: parsedEstimate,
      missingEstimate,
    };
  } catch (error) {
    return {
      ok: false,
      userMessage: "Rent estimate response could not be normalized.",
      debug: {
        propertyKey: context.propertyKey,
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    };
  }
}

function normalizeRentEstimatePayload(
  payload: RentEstimatePayload,
  context: NormalizeRentEstimateContext,
): RentEstimate {
  return {
    source: {
      provider: ZILLOW_PROVIDER_NAME,
      externalId: resolveExternalId(payload, context.zpid),
      ...(context.subjectDetail.source.additionalExternalIds
        ? {
            additionalExternalIds:
              context.subjectDetail.source.additionalExternalIds,
          }
        : {}),
      retrievedAt: context.retrievedAt,
    },
    estimatedRent: mapEstimatedRent(payload),
    ...(context.includeRange
      ? {
          rentRangeLow: mapOptionalMoneyField(payload, "rentZestimateLow", "rentRangeLow"),
          rentRangeHigh: mapOptionalMoneyField(
            payload,
            "rentZestimateHigh",
            "rentRangeHigh",
          ),
        }
      : {}),
    confidenceLabel: mapConfidenceLabel(payload),
  };
}

function resolveExternalId(
  payload: RentEstimatePayload,
  fallbackZpid: string,
): string {
  const payloadZpid =
    payload.zpid === null || payload.zpid === undefined
      ? undefined
      : String(payload.zpid).trim();

  if (payloadZpid && payloadZpid.length > 0) {
    return payloadZpid;
  }

  return fallbackZpid;
}

function mapEstimatedRent(
  payload: RentEstimatePayload,
): RentEstimate["estimatedRent"] {
  const value = payload.rentZestimate;

  if (value === undefined || value === null || !Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return moneySchema.parse({
    amount: formatMoneyAmount(value),
    currency: resolveCurrency(payload),
  });
}

function mapOptionalMoneyField(
  payload: RentEstimatePayload,
  ...fieldNames: string[]
): RentEstimate["rentRangeLow"] {
  const record = payload as Record<string, unknown>;

  for (const fieldName of fieldNames) {
    const value = record[fieldName];

    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      continue;
    }

    return moneySchema.parse({
      amount: formatMoneyAmount(value),
      currency: resolveCurrency(payload),
    });
  }

  return undefined;
}

function mapConfidenceLabel(payload: RentEstimatePayload): string | undefined {
  const record = payload as Record<string, unknown>;
  const candidateFields = [
    "confidenceLabel",
    "rentZestimateConfidence",
    "confidence",
  ] as const;

  for (const fieldName of candidateFields) {
    const value = record[fieldName];

    if (typeof value === "string") {
      const trimmed = value.trim();

      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }

  return undefined;
}

function resolveCurrency(payload: RentEstimatePayload): string {
  const record = payload as Record<string, unknown>;
  const currency = record.currency;

  if (typeof currency === "string") {
    const normalized = currency.trim().toUpperCase();

    if (normalized.length === 3) {
      return normalized;
    }
  }

  return DEFAULT_CURRENCY;
}

function formatMoneyAmount(value: number): string {
  const rounded = Math.round(value * 100) / 100;

  if (!Number.isFinite(rounded) || rounded < 0) {
    throw new Error("Invalid money amount.");
  }

  if (Number.isInteger(rounded)) {
    return String(rounded);
  }

  return rounded.toFixed(2).replace(/0$/, "");
}
