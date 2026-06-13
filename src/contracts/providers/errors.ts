import { z } from "zod";

export const providerErrorCategories = [
  "timeout",
  "rate_limited",
  "unauthorized",
  "not_found",
  "bad_request",
  "provider_unavailable",
  "unknown",
] as const;

export type ProviderErrorCategory = (typeof providerErrorCategories)[number];

export const providerErrorCategorySchema = z.enum(providerErrorCategories);

export const providerUserMessages: Record<ProviderErrorCategory, string> = {
  timeout: "The data provider took too long to respond.",
  rate_limited: "The data provider rate limit was exceeded.",
  unauthorized: "The data provider rejected the request credentials.",
  not_found: "The requested data was not found at the provider.",
  bad_request: "The data provider rejected the request.",
  provider_unavailable: "The data provider is temporarily unavailable.",
  unknown: "An unexpected error occurred while contacting the data provider.",
};

export const providerRateLimitHeadersSchema = z.record(z.string(), z.string());

export const providerErrorDebugSchema = z.object({
  transportKind: z.enum(["timeout", "network", "http"]).optional(),
  transportMessage: z.string().optional(),
});

export const providerErrorSchema = z.object({
  category: providerErrorCategorySchema,
  userMessage: z.string(),
  endpointName: z.string(),
  latencyMs: z.number().int().nonnegative(),
  statusCode: z.number().int().optional(),
  retryAfterSeconds: z.number().int().nonnegative().optional(),
  providerMessage: z.string().max(256).optional(),
  rateLimitHeaders: providerRateLimitHeadersSchema.optional(),
  debug: providerErrorDebugSchema.optional(),
});

export type ProviderError = z.infer<typeof providerErrorSchema>;

export const providerStepErrorSchema = z.object({
  type: z.literal("provider_error"),
  category: providerErrorCategorySchema,
  userMessage: z.string(),
  endpointName: z.string(),
  latencyMs: z.number().int().nonnegative(),
  statusCode: z.number().int().optional(),
  retryAfterSeconds: z.number().int().nonnegative().optional(),
  providerMessage: z.string().max(256).optional(),
  rateLimitHeaders: providerRateLimitHeadersSchema.optional(),
});

export type ProviderStepError = z.infer<typeof providerStepErrorSchema>;

export function isProviderError(value: unknown): value is ProviderError {
  return providerErrorSchema.safeParse(value).success;
}

export function isProviderStepError(value: unknown): value is ProviderStepError {
  return providerStepErrorSchema.safeParse(value).success;
}
