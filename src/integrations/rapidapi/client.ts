import "server-only";

import { resolveRapidApiClientConfig } from "@/integrations/rapidapi/config";
import {
  extractSafeResponseHeaders,
  parseResponseBody,
} from "@/integrations/rapidapi/response";
import {
  RAPIDAPI_CLIENT_NAME,
  type CreateRapidApiClientOptions,
  type RapidApiClient,
  type RapidApiClientConfig,
  type RapidApiFailureResult,
  type RapidApiRequestOptions,
  type RapidApiResult,
} from "@/integrations/rapidapi/types";

function buildRequestUrl(
  host: string,
  path: string,
  query: RapidApiRequestOptions["query"],
): URL {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`https://${host}${normalizedPath}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

function buildRequestHeaders(
  config: RapidApiClientConfig,
  host: string,
  options: RapidApiRequestOptions,
): Headers {
  const headers = new Headers(options.headers);
  headers.set("X-RapidAPI-Host", host);
  headers.set("X-RapidAPI-Key", config.apiKey);

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

function createHttpFailure(
  options: RapidApiRequestOptions,
  latencyMs: number,
  status: number,
  message: string,
  parsedBody: Awaited<ReturnType<typeof parseResponseBody>>,
  headers: ReturnType<typeof extractSafeResponseHeaders>,
): RapidApiFailureResult {
  return {
    ok: false,
    kind: "http",
    message,
    endpointName: options.endpointName,
    latencyMs,
    status,
    headers,
    ...parsedBody,
  };
}

function createRapidApiClientFromConfig(config: RapidApiClientConfig): RapidApiClient {
  return {
    name: RAPIDAPI_CLIENT_NAME,

    async request<T = unknown>(
      options: RapidApiRequestOptions,
    ): Promise<RapidApiResult<T>> {
      const startedAt = performance.now();
      const host = options.host ?? config.host;
      const timeoutMs = options.timeoutMs ?? config.defaultTimeoutMs;
      const method = options.method ?? "GET";
      const url = buildRequestUrl(host, options.path, options.query);
      const headers = buildRequestHeaders(config, host, options);

      let response: Response;

      try {
        response = await config.fetch(url, {
          method,
          headers,
          body:
            options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        const latencyMs = Math.round(performance.now() - startedAt);

        if (error instanceof DOMException && error.name === "TimeoutError") {
          return {
            ok: false,
            kind: "timeout",
            message: `RapidAPI request timed out after ${timeoutMs}ms`,
            endpointName: options.endpointName,
            latencyMs,
          };
        }

        if (error instanceof DOMException && error.name === "AbortError") {
          return {
            ok: false,
            kind: "timeout",
            message: `RapidAPI request aborted after ${timeoutMs}ms`,
            endpointName: options.endpointName,
            latencyMs,
          };
        }

        const message =
          error instanceof Error ? error.message : "RapidAPI network request failed";

        return {
          ok: false,
          kind: "network",
          message,
          endpointName: options.endpointName,
          latencyMs,
        };
      }

      const latencyMs = Math.round(performance.now() - startedAt);
      const safeHeaders = extractSafeResponseHeaders(response.headers);
      const parsedBody = await parseResponseBody(response);

      if (!response.ok) {
        return createHttpFailure(
          options,
          latencyMs,
          response.status,
          `RapidAPI request failed with status ${response.status}`,
          parsedBody,
          safeHeaders,
        );
      }

      if (parsedBody.body === undefined && parsedBody.bodyText !== undefined) {
        return createHttpFailure(
          options,
          latencyMs,
          response.status,
          "RapidAPI returned a non-JSON success response",
          parsedBody,
          safeHeaders,
        );
      }

      return {
        ok: true,
        status: response.status,
        headers: safeHeaders,
        data: parsedBody.body as T,
        endpointName: options.endpointName,
        latencyMs,
      };
    },
  };
}

export function createRapidApiClient(
  options: CreateRapidApiClientOptions = {},
): RapidApiClient {
  return createRapidApiClientFromConfig(resolveRapidApiClientConfig(options));
}

let cachedRapidApiClient: RapidApiClient | undefined;

export function getRapidApiClient(): RapidApiClient {
  if (!cachedRapidApiClient) {
    cachedRapidApiClient = createRapidApiClient();
  }

  return cachedRapidApiClient;
}
