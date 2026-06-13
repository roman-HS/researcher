export const RAPIDAPI_CLIENT_NAME = "rapidapi" as const;

export const DEFAULT_RAPIDAPI_TIMEOUT_MS = 30_000;

export const MAX_RAPIDAPI_ERROR_BODY_CHARS = 512;

export type RapidApiHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RapidApiSafeHeaders = Record<string, string>;

export type RapidApiRequestOptions = {
  path: string;
  method?: RapidApiHttpMethod;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
  host?: string;
  timeoutMs?: number;
  endpointName: string;
};

export type RapidApiSuccessResult<T = unknown> = {
  ok: true;
  status: number;
  headers: RapidApiSafeHeaders;
  data: T;
  endpointName: string;
  latencyMs: number;
};

export type RapidApiFailureKind = "timeout" | "network" | "http";

export type RapidApiFailureResult = {
  ok: false;
  kind: RapidApiFailureKind;
  message: string;
  endpointName: string;
  latencyMs: number;
  status?: number;
  headers?: RapidApiSafeHeaders;
  body?: unknown;
  bodyText?: string;
};

export type RapidApiResult<T = unknown> =
  | RapidApiSuccessResult<T>
  | RapidApiFailureResult;

export type RapidApiClientConfig = {
  host: string;
  apiKey: string;
  defaultTimeoutMs: number;
  fetch: typeof fetch;
};

export type CreateRapidApiClientOptions = {
  host?: string;
  apiKey?: string;
  defaultTimeoutMs?: number;
  fetch?: typeof fetch;
};

export type RapidApiClient = {
  name: typeof RAPIDAPI_CLIENT_NAME;
  request<T = unknown>(options: RapidApiRequestOptions): Promise<RapidApiResult<T>>;
};
