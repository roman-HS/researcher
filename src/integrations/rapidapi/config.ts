import "server-only";

import { getServerEnv } from "@/lib/env/server";

import { RapidApiConfigurationError } from "@/integrations/rapidapi/errors";
import {
  DEFAULT_RAPIDAPI_TIMEOUT_MS,
  type CreateRapidApiClientOptions,
  type RapidApiClientConfig,
} from "@/integrations/rapidapi/types";

export function resolveRapidApiClientConfig(
  options: CreateRapidApiClientOptions = {},
): RapidApiClientConfig {
  const env = getServerEnv();
  const host = options.host ?? env.RAPIDAPI_HOST;
  const apiKey = options.apiKey ?? env.RAPIDAPI_KEY;
  const defaultTimeoutMs =
    options.defaultTimeoutMs ?? env.RAPIDAPI_TIMEOUT_MS ?? DEFAULT_RAPIDAPI_TIMEOUT_MS;

  if (!host) {
    throw new RapidApiConfigurationError(
      "RapidAPI host is not configured. Set RAPIDAPI_HOST in the environment.",
    );
  }

  if (!apiKey) {
    throw new RapidApiConfigurationError(
      "RapidAPI key is not configured. Set RAPIDAPI_KEY in the environment.",
    );
  }

  return {
    host,
    apiKey,
    defaultTimeoutMs,
    fetch: options.fetch ?? fetch,
  };
}
