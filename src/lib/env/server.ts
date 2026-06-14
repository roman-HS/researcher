import "server-only";

import { z } from "zod";

import { formatEnvValidationError } from "@/lib/env/errors";

const executionTransportSchema = z.enum(["direct", "vercel_workflows"]);

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  APP_URL: z.url(),
  DATABASE_URL: z.url().optional(),
  DATABASE_DIRECT_URL: z.url().optional(),
  BETTER_AUTH_SECRET: z.string().min(1).optional(),
  RAPIDAPI_HOST: z.string().min(1).optional(),
  RAPIDAPI_KEY: z.string().min(1).optional(),
  RAPIDAPI_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  EXECUTION_TRANSPORT: executionTransportSchema,
  EXECUTION_MAX_LISTING_COUNT: z.coerce.number().int().positive().optional(),
  EXECUTION_MAX_PROPERTIES_ENRICHED_PER_RUN: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
  EXECUTION_MAX_PROVIDER_CALLS_PER_STEP: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
  EXECUTION_MAX_PROVIDER_CALLS_PER_RUN: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
  EXECUTION_PER_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  EXECUTION_MAX_RUN_DURATION_MS: z.coerce.number().int().positive().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | undefined;

function parseServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    APP_URL: process.env.APP_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_DIRECT_URL: process.env.DATABASE_DIRECT_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    RAPIDAPI_HOST: process.env.RAPIDAPI_HOST,
    RAPIDAPI_KEY: process.env.RAPIDAPI_KEY,
    RAPIDAPI_TIMEOUT_MS: process.env.RAPIDAPI_TIMEOUT_MS,
    EXECUTION_TRANSPORT: process.env.EXECUTION_TRANSPORT ?? "direct",
    EXECUTION_MAX_LISTING_COUNT: process.env.EXECUTION_MAX_LISTING_COUNT,
    EXECUTION_MAX_PROPERTIES_ENRICHED_PER_RUN:
      process.env.EXECUTION_MAX_PROPERTIES_ENRICHED_PER_RUN,
    EXECUTION_MAX_PROVIDER_CALLS_PER_STEP:
      process.env.EXECUTION_MAX_PROVIDER_CALLS_PER_STEP,
    EXECUTION_MAX_PROVIDER_CALLS_PER_RUN:
      process.env.EXECUTION_MAX_PROVIDER_CALLS_PER_RUN,
    EXECUTION_PER_REQUEST_TIMEOUT_MS: process.env.EXECUTION_PER_REQUEST_TIMEOUT_MS,
    EXECUTION_MAX_RUN_DURATION_MS: process.env.EXECUTION_MAX_RUN_DURATION_MS,
  });

  if (!result.success) {
    throw new Error(formatEnvValidationError("server", result.error));
  }

  return result.data;
}

export function getServerEnv(): ServerEnv {
  if (!cachedServerEnv) {
    cachedServerEnv = parseServerEnv();
  }

  return cachedServerEnv;
}
