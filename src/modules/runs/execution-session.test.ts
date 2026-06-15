import { describe, expect, it, vi } from "vitest";

import type { ExecutionLimits } from "@/contracts/runs/execution-limits";
import type { RapidApiResult } from "@/integrations/rapidapi/types";
import {
  createWorkflowExecutionContext,
  DEFAULT_EXECUTION_LIMITS,
} from "@/modules/runs/execution-context";
import {
  EXECUTION_LIMIT_EXCEEDED_CODE,
  ExecutionLimitExceededError,
} from "@/modules/runs/errors";

const request = vi.fn(async (): Promise<RapidApiResult<unknown>> => ({
  ok: true,
  status: 200,
  headers: {},
  data: {},
  endpointName: "test",
  latencyMs: 1,
}));

let mockRetryConfig = {
  maxRetries: 0,
  baseDelayMs: 500,
};

vi.mock("@/integrations/rapidapi/client", () => ({
  createRapidApiTransportClient: () => ({
    name: "rapidapi",
    request,
  }),
  createRapidApiClient: () => ({
    name: "rapidapi",
    request,
  }),
}));

vi.mock("@/integrations/rapidapi/load-retry-config", () => ({
  loadProviderRetryConfigFromEnv: () => mockRetryConfig,
}));

import {
  assertRunDurationNotExceeded,
  assertWorkingSetListingCount,
  getWorkflowRunProviderClient,
  limitEnrichmentTargets,
  resetExecutionSessionStepProviderCalls,
  runWithExecutionSession,
  toExecutionLimitFatalError,
} from "@/modules/runs/execution-session";

const runId = "11111111-1111-4111-8111-111111111111";

function createTestContext(
  overrides: {
    limits?: Partial<ExecutionLimits>;
    startedAt?: string;
  } = {},
) {
  return createWorkflowExecutionContext({
    run: {
      runId,
      workspaceId: "22222222-2222-4222-8222-222222222222",
      workflowId: "33333333-3333-4333-8333-333333333333",
      workflowVersionId: "44444444-4444-4444-8444-444444444444",
      userId: "55555555-5555-4555-8555-555555555555",
      startedAt: overrides.startedAt,
    },
    compiledPlan: {
      planVersion: 2,
      trigger: { type: "manual" },
      runtimeInputs: [],
      executionOrder: [],
      steps: [],
    },
    runtimeInputValues: {},
    limits: {
      ...DEFAULT_EXECUTION_LIMITS,
      ...overrides.limits,
    },
    status: "running",
  });
}

describe("execution session limits", () => {
  it("clamps enrichment targets against run and step caps", async () => {
    const context = createTestContext({
      limits: {
        maxPropertiesEnrichedPerRun: 2,
      },
    });

    await runWithExecutionSession(context, async () => {
      expect(
        limitEnrichmentTargets(["a", "b", "c"], { stepMaxProperties: 3 }),
      ).toEqual(["a", "b"]);
      expect(limitEnrichmentTargets([])).toEqual([]);
      expect(() => limitEnrichmentTargets(["d"])).toThrow(
        ExecutionLimitExceededError,
      );
    });
  });

  it("throws when enrichment budget is exhausted", async () => {
    const context = createTestContext({
      limits: {
        maxPropertiesEnrichedPerRun: 1,
      },
    });

    await expect(
      runWithExecutionSession(context, async () => {
        limitEnrichmentTargets(["a"]);
        limitEnrichmentTargets(["b"]);
      }),
    ).rejects.toBeInstanceOf(ExecutionLimitExceededError);
  });

  it("skips run enrichment budget for downstream enrichment steps", async () => {
    const context = createTestContext({
      limits: {
        maxPropertiesEnrichedPerRun: 1,
      },
    });

    await runWithExecutionSession(context, async () => {
      expect(limitEnrichmentTargets(["a"])).toEqual(["a"]);
      expect(
        limitEnrichmentTargets(["b", "c"], {
          applyRunEnrichmentBudget: false,
        }),
      ).toEqual(["b", "c"]);
    });
  });

  it("resets per-step provider call counters between steps", async () => {
    request.mockClear();

    const context = createTestContext({
      limits: {
        maxProviderCallsPerStep: 2,
        maxProviderCallsPerRun: 10,
      },
    });

    await runWithExecutionSession(context, async () => {
      const client = getWorkflowRunProviderClient();

      await client.request({ path: "test", endpointName: "test" });
      await client.request({ path: "test", endpointName: "test" });

      await expect(
        client.request({ path: "test", endpointName: "test" }),
      ).rejects.toMatchObject({
        limit: "maxProviderCallsPerStep",
      });

      resetExecutionSessionStepProviderCalls();

      await expect(
        client.request({ path: "test", endpointName: "test" }),
      ).resolves.toMatchObject({ ok: true });
    });
  });

  it("records provider calls through the wrapped client", async () => {
    request.mockClear();

    const context = createTestContext({
      limits: {
        maxProviderCallsPerStep: 1,
        maxProviderCallsPerRun: 1,
      },
    });

    await runWithExecutionSession(context, async () => {
      const client = getWorkflowRunProviderClient();
      await client.request({
        path: "test",
        endpointName: "test",
      });

      await expect(
        client.request({
          path: "test",
          endpointName: "test",
        }),
      ).rejects.toMatchObject({
        limit: "maxProviderCallsPerStep",
      });

      expect(request).toHaveBeenCalledTimes(1);
    });
  });

  it("counts each retry attempt against provider call limits", async () => {
    mockRetryConfig = {
      maxRetries: 1,
      baseDelayMs: 1,
    };
    request.mockClear();
    request
      .mockResolvedValueOnce({
        ok: false,
        kind: "timeout",
        message: "timed out",
        endpointName: "test",
        latencyMs: 1,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {},
        data: {},
        endpointName: "test",
        latencyMs: 1,
      });

    const context = createTestContext({
      limits: {
        maxProviderCallsPerStep: 2,
        maxProviderCallsPerRun: 2,
      },
    });

    await runWithExecutionSession(context, async () => {
      const client = getWorkflowRunProviderClient();
      const result = await client.request({
        path: "test",
        endpointName: "test",
      });

      expect(result.ok).toBe(true);
      expect(request).toHaveBeenCalledTimes(2);
    });

    mockRetryConfig = {
      maxRetries: 0,
      baseDelayMs: 500,
    };
  });

  it("maps limit errors to fatal executor errors", () => {
    const error = new ExecutionLimitExceededError({
      limit: "maxListingCount",
      userMessage: "Too many listings.",
      debug: { propertyCount: 201 },
    });

    expect(toExecutionLimitFatalError(error)).toEqual({
      code: EXECUTION_LIMIT_EXCEEDED_CODE,
      userMessage: "Too many listings.",
      debug: {
        limit: "maxListingCount",
        propertyCount: 201,
      },
    });
  });

  it("asserts listing count and run duration limits", async () => {
    const listingContext = createTestContext({
      limits: { maxListingCount: 2 },
    });

    await runWithExecutionSession(listingContext, async () => {
      expect(() => assertWorkingSetListingCount(2)).not.toThrow();
      expect(() => assertWorkingSetListingCount(3)).toThrow(
        ExecutionLimitExceededError,
      );
    });

    const durationContext = createTestContext({
      limits: { maxRunDurationMs: 1 },
      startedAt: new Date(Date.now() - 10).toISOString(),
    });

    await runWithExecutionSession(durationContext, async () => {
      expect(() => assertRunDurationNotExceeded()).toThrow(
        ExecutionLimitExceededError,
      );
    });
  });
});
