import { describe, expect, it, vi } from "vitest";

import {
  computeProviderRetryDelayMs,
  DEFAULT_PROVIDER_RETRY_CONFIG,
  isRetryableProviderErrorCategory,
  withProviderRetries,
} from "@/integrations/rapidapi/retry";
import type {
  RapidApiClient,
  RapidApiResult,
} from "@/integrations/rapidapi/types";

function createMockClient(results: RapidApiResult<unknown>[]): {
  client: RapidApiClient;
  request: ReturnType<typeof vi.fn>;
} {
  const request = vi.fn(async () => {
    const next = results.shift();

    if (!next) {
      throw new Error("Mock client ran out of queued responses.");
    }

    return next;
  });

  return {
    client: {
      name: "rapidapi",
      request: request as RapidApiClient["request"],
    },
    request,
  };
}

describe("provider retry policy", () => {
  it("identifies retryable provider error categories", () => {
    expect(isRetryableProviderErrorCategory("timeout")).toBe(true);
    expect(isRetryableProviderErrorCategory("provider_unavailable")).toBe(true);
    expect(isRetryableProviderErrorCategory("rate_limited")).toBe(false);
    expect(isRetryableProviderErrorCategory("bad_request")).toBe(false);
    expect(isRetryableProviderErrorCategory("unauthorized")).toBe(false);
  });

  it("caps exponential retry delay at two seconds", () => {
    expect(
      computeProviderRetryDelayMs(0, DEFAULT_PROVIDER_RETRY_CONFIG),
    ).toBe(500);
    expect(
      computeProviderRetryDelayMs(1, DEFAULT_PROVIDER_RETRY_CONFIG),
    ).toBe(1_000);
    expect(
      computeProviderRetryDelayMs(2, DEFAULT_PROVIDER_RETRY_CONFIG),
    ).toBe(2_000);
    expect(
      computeProviderRetryDelayMs(3, DEFAULT_PROVIDER_RETRY_CONFIG),
    ).toBe(2_000);
  });

  it("retries transient failures up to the configured retry count", async () => {
    const sleep = vi.fn(async () => undefined);
    const { client, request } = createMockClient([
      {
        ok: false,
        kind: "timeout",
        message: "timed out",
        endpointName: "search",
        latencyMs: 10,
      },
      {
        ok: false,
        kind: "network",
        message: "network failed",
        endpointName: "search",
        latencyMs: 12,
      },
      {
        ok: true,
        status: 200,
        headers: {},
        data: { ok: true },
        endpointName: "search",
        latencyMs: 8,
      },
    ]);

    const retriedClient = withProviderRetries(
      client,
      { maxRetries: 2, baseDelayMs: 500 },
      { sleep },
    );

    const result = await retriedClient.request({
      path: "search",
      endpointName: "search",
    });

    expect(result.ok).toBe(true);
    expect(request).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(result.retryMeta).toEqual({
      attemptCount: 3,
      retryCount: 2,
      delayMs: [500, 1_000],
    });
  });

  it("does not retry non-retryable provider failures", async () => {
    const sleep = vi.fn(async () => undefined);
    const { client, request } = createMockClient([
      {
        ok: false,
        kind: "http",
        message: "bad request",
        endpointName: "search",
        latencyMs: 10,
        status: 400,
      },
    ]);

    const retriedClient = withProviderRetries(
      client,
      DEFAULT_PROVIDER_RETRY_CONFIG,
      { sleep },
    );

    const result = await retriedClient.request({
      path: "search",
      endpointName: "search",
    });

    expect(result.ok).toBe(false);
    expect(request).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(result.retryMeta).toEqual({
      attemptCount: 1,
      retryCount: 0,
      delayMs: [],
    });
  });

  it("does not retry rate-limited responses", async () => {
    const sleep = vi.fn(async () => undefined);
    const { client, request } = createMockClient([
      {
        ok: false,
        kind: "http",
        message: "rate limited",
        endpointName: "search",
        latencyMs: 10,
        status: 429,
        headers: { "retry-after": "2" },
      },
    ]);

    const retriedClient = withProviderRetries(
      client,
      DEFAULT_PROVIDER_RETRY_CONFIG,
      { sleep },
    );

    const result = await retriedClient.request({
      path: "search",
      endpointName: "search",
    });

    expect(result.ok).toBe(false);
    expect(request).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("records retry metadata on the final failure", async () => {
    const sleep = vi.fn(async () => undefined);
    const { client } = createMockClient([
      {
        ok: false,
        kind: "timeout",
        message: "timed out",
        endpointName: "search",
        latencyMs: 10,
      },
      {
        ok: false,
        kind: "timeout",
        message: "timed out again",
        endpointName: "search",
        latencyMs: 11,
      },
      {
        ok: false,
        kind: "timeout",
        message: "timed out again",
        endpointName: "search",
        latencyMs: 12,
      },
    ]);

    const retriedClient = withProviderRetries(
      client,
      { maxRetries: 2, baseDelayMs: 500 },
      { sleep },
    );

    const result = await retriedClient.request({
      path: "search",
      endpointName: "search",
    });

    expect(result.ok).toBe(false);
    expect(result.retryMeta).toEqual({
      attemptCount: 3,
      retryCount: 2,
      delayMs: [500, 1_000],
    });
  });

  it("invokes beforeAttempt for each retry attempt", async () => {
    const beforeAttempt = vi.fn();
    const sleep = vi.fn(async () => undefined);
    const { client } = createMockClient([
      {
        ok: false,
        kind: "network",
        message: "network failed",
        endpointName: "search",
        latencyMs: 10,
      },
      {
        ok: true,
        status: 200,
        headers: {},
        data: {},
        endpointName: "search",
        latencyMs: 8,
      },
    ]);

    const retriedClient = withProviderRetries(
      client,
      { maxRetries: 2, baseDelayMs: 500 },
      { beforeAttempt, sleep },
    );

    await retriedClient.request({
      path: "search",
      endpointName: "search",
    });

    expect(beforeAttempt).toHaveBeenCalledTimes(2);
  });
});
