import "server-only";

import { z } from "zod";

import { formatEnvValidationError } from "@/lib/env/errors";

const executionTransportSchema = z.enum(["direct", "vercel_workflows"]);

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  APP_URL: z.url(),
  DATABASE_URL: z.url().optional(),
  BETTER_AUTH_SECRET: z.string().min(1).optional(),
  RAPIDAPI_HOST: z.string().min(1).optional(),
  RAPIDAPI_KEY: z.string().min(1).optional(),
  EXECUTION_TRANSPORT: executionTransportSchema,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | undefined;

function parseServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    APP_URL: process.env.APP_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    RAPIDAPI_HOST: process.env.RAPIDAPI_HOST,
    RAPIDAPI_KEY: process.env.RAPIDAPI_KEY,
    EXECUTION_TRANSPORT: process.env.EXECUTION_TRANSPORT ?? "direct",
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
