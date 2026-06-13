import "server-only";

import {
  providerStepErrorSchema,
  providerUserMessages,
  type ProviderError,
  type ProviderErrorCategory,
  type ProviderStepError,
} from "@/contracts/providers/errors";
import { AppError } from "@/lib/api/errors";
import type {
  RapidApiFailureResult,
  RapidApiSafeHeaders,
} from "@/integrations/rapidapi/types";

const MAX_PROVIDER_MESSAGE_CHARS = 256;

const PROVIDER_MESSAGE_KEYS = ["message", "error", "detail"] as const;

function truncateProviderMessage(value: string): string {
  if (value.length <= MAX_PROVIDER_MESSAGE_CHARS) {
    return value;
  }

  return `${value.slice(0, MAX_PROVIDER_MESSAGE_CHARS)}…`;
}

function extractRateLimitHeaders(
  headers: RapidApiSafeHeaders | undefined,
): Record<string, string> | undefined {
  if (!headers) {
    return undefined;
  }

  const rateLimitHeaders = Object.fromEntries(
    Object.entries(headers).filter(([name]) => name.startsWith("x-ratelimit-")),
  );

  return Object.keys(rateLimitHeaders).length > 0 ? rateLimitHeaders : undefined;
}

export function parseRetryAfterSeconds(
  headers: RapidApiSafeHeaders | undefined,
): number | undefined {
  if (!headers) {
    return undefined;
  }

  const retryAfter = headers["retry-after"];
  if (retryAfter !== undefined) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.ceil(seconds);
    }
  }

  const resetHeader = headers["x-ratelimit-requests-reset"];
  if (resetHeader !== undefined) {
    const resetValue = Number(resetHeader);
    if (Number.isFinite(resetValue) && resetValue > 0) {
      const resetSeconds =
        resetValue > 1_000_000_000_000 ? Math.floor(resetValue / 1000) : resetValue;
      const delta = resetSeconds - Math.floor(Date.now() / 1000);
      if (delta >= 0) {
        return delta;
      }
    }
  }

  return undefined;
}

function extractProviderMessage(body: unknown): string | undefined {
  if (typeof body === "string" && body.length > 0) {
    return truncateProviderMessage(body);
  }

  if (body && typeof body === "object" && !Array.isArray(body)) {
    const record = body as Record<string, unknown>;

    for (const key of PROVIDER_MESSAGE_KEYS) {
      const value = record[key];
      if (typeof value === "string" && value.length > 0) {
        return truncateProviderMessage(value);
      }
    }
  }

  return undefined;
}

function mapHttpStatusToCategory(status: number): ProviderErrorCategory {
  if (status === 408 || status === 504) {
    return "timeout";
  }

  if (status === 429) {
    return "rate_limited";
  }

  if (status === 401 || status === 403) {
    return "unauthorized";
  }

  if (status === 404) {
    return "not_found";
  }

  if (status === 400 || status === 422) {
    return "bad_request";
  }

  if (status === 502 || status === 503 || status >= 500) {
    return "provider_unavailable";
  }

  if (status >= 400 && status < 500) {
    return "bad_request";
  }

  return "unknown";
}

function mapTransportKindToCategory(
  failure: RapidApiFailureResult,
): ProviderErrorCategory {
  if (failure.kind === "timeout") {
    return "timeout";
  }

  if (failure.kind === "network") {
    return "provider_unavailable";
  }

  if (failure.status === undefined) {
    return "unknown";
  }

  return mapHttpStatusToCategory(failure.status);
}

export function mapRapidApiFailureToProviderError(
  failure: RapidApiFailureResult,
): ProviderError {
  const category = mapTransportKindToCategory(failure);
  const rateLimitHeaders = extractRateLimitHeaders(failure.headers);
  const retryAfterSeconds = parseRetryAfterSeconds(failure.headers);
  const providerMessage = extractProviderMessage(failure.body);

  return {
    category,
    userMessage: providerUserMessages[category],
    endpointName: failure.endpointName,
    latencyMs: failure.latencyMs,
    ...(failure.status !== undefined && { statusCode: failure.status }),
    ...(retryAfterSeconds !== undefined && { retryAfterSeconds }),
    ...(providerMessage !== undefined && { providerMessage }),
    ...(rateLimitHeaders !== undefined && { rateLimitHeaders }),
    debug: {
      transportKind: failure.kind,
      transportMessage: failure.message,
    },
  };
}

export function providerErrorToAppError(error: ProviderError): AppError {
  const code = error.category === "rate_limited" ? "provider_rate_limited" : "provider_error";

  return new AppError(code, error.userMessage, {
    details: {
      category: error.category,
      endpointName: error.endpointName,
      statusCode: error.statusCode,
      latencyMs: error.latencyMs,
      ...(error.providerMessage !== undefined && {
        providerMessage: error.providerMessage,
      }),
      ...(error.rateLimitHeaders !== undefined && {
        rateLimitHeaders: error.rateLimitHeaders,
      }),
    },
    retryAfterSeconds: error.retryAfterSeconds,
  });
}

export function providerErrorToStepErrorJson(error: ProviderError): ProviderStepError {
  const stepError: ProviderStepError = {
    type: "provider_error",
    category: error.category,
    userMessage: error.userMessage,
    endpointName: error.endpointName,
    latencyMs: error.latencyMs,
    ...(error.statusCode !== undefined && { statusCode: error.statusCode }),
    ...(error.retryAfterSeconds !== undefined && {
      retryAfterSeconds: error.retryAfterSeconds,
    }),
    ...(error.providerMessage !== undefined && {
      providerMessage: error.providerMessage,
    }),
    ...(error.rateLimitHeaders !== undefined && {
      rateLimitHeaders: error.rateLimitHeaders,
    }),
  };

  return providerStepErrorSchema.parse(stepError);
}
