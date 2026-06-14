import { afterEach, describe, expect, it } from "vitest";

import { createToolExecutorFatalError } from "@/contracts/runs/executors";

import {
  sanitizePersistedRunError,
  sanitizePersistedStepError,
  sanitizePersistedStepOutputSnapshot,
} from "./sanitize-persisted-run-error";

describe("sanitizePersistedRunError", () => {
  const originalEnv = {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    RAPIDAPI_KEY: process.env.RAPIDAPI_KEY,
  };

  afterEach(() => {
    process.env.BETTER_AUTH_SECRET = originalEnv.BETTER_AUTH_SECRET;
    process.env.RAPIDAPI_KEY = originalEnv.RAPIDAPI_KEY;
  });

  it("redacts sensitive debug keys", () => {
    const sanitized = sanitizePersistedStepError(
      createToolExecutorFatalError("provider_error", "Provider request failed.", {
        debug: {
          authorization: "Bearer secret-token",
          apiKey: "abc123",
          statusCode: 401,
        },
      }),
    );

    expect(sanitized.debug).toEqual({
      authorization: "[REDACTED]",
      apiKey: "[REDACTED]",
      statusCode: 401,
    });
  });

  it("scrubs configured env secret values from debug strings", () => {
    process.env.RAPIDAPI_KEY = "rapidapi-secret-value";

    const sanitized = sanitizePersistedStepError(
      createToolExecutorFatalError("execution_error", "Workflow failed.", {
        debug: {
          message: "Request failed with key rapidapi-secret-value in payload",
        },
      }),
    );

    expect(sanitized.debug?.message).toBe(
      "Request failed with key [REDACTED] in payload",
    );
  });

  it("scrubs bearer tokens from user messages", () => {
    const sanitized = sanitizePersistedStepError(
      createToolExecutorFatalError(
        "execution_error",
        "Unauthorized: Bearer super-secret-token",
      ),
    );

    expect(sanitized.userMessage).toBe("Unauthorized: Bearer [REDACTED]");
  });

  it("preserves run attribution fields after sanitization", () => {
    const sanitized = sanitizePersistedRunError({
      code: "step_execution_failed",
      userMessage: "Step execution failed unexpectedly.",
      stepNodeId: "step-search",
      toolKey: "rapidapi.zillow.searchListings@1",
      debug: { api_key: "hidden" },
    });

    expect(sanitized).toMatchObject({
      code: "step_execution_failed",
      stepNodeId: "step-search",
      toolKey: "rapidapi.zillow.searchListings@1",
      debug: { api_key: "[REDACTED]" },
    });
  });

  it("sanitizes nested item error debug in step output snapshots", () => {
    const sanitized = sanitizePersistedStepOutputSnapshot({
      summary: { propertyCount: 1 },
      itemErrors: [
        {
          code: "provider_error",
          userMessage: "Provider failed.",
          debug: {
            "x-rapidapi-key": "should-not-persist",
          },
        },
      ],
    });

    expect(sanitized.itemErrors?.[0]?.debug).toEqual({
      "x-rapidapi-key": "[REDACTED]",
    });
  });
});
