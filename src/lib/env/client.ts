import { z } from "zod";

import { formatEnvValidationError } from "@/lib/env/errors";

const clientEnvSchema = z.object({});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

let cachedClientEnv: ClientEnv | undefined;

function parseClientEnv(): ClientEnv {
  const result = clientEnvSchema.safeParse({});

  if (!result.success) {
    throw new Error(formatEnvValidationError("client", result.error));
  }

  return result.data;
}

export function getClientEnv(): ClientEnv {
  if (!cachedClientEnv) {
    cachedClientEnv = parseClientEnv();
  }

  return cachedClientEnv;
}
