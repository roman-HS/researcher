import { AsyncLocalStorage } from "node:async_hooks";

import type { ExecutionLimits } from "@/contracts/runs/execution-limits";
import type { ToolExecutorFatalError } from "@/contracts/runs/executors";
import type { WorkflowExecutionUsage } from "@/contracts/runs/execution-context";
import type { WorkflowExecutionContext } from "@/contracts/runs/execution-context";
import { createToolExecutorFatalError } from "@/contracts/runs/executors";
import { createRapidApiClient, getRapidApiClient } from "@/integrations/rapidapi/client";
import type { RapidApiClient } from "@/integrations/rapidapi/types";

import {
  EXECUTION_LIMIT_EXCEEDED_CODE,
  ExecutionLimitExceededError,
  type ExecutionLimitName,
} from "./errors";

/**
 * Run-scoped execution session for limit enforcement during workflow runs.
 *
 * @see Story 7.4.2 — Add execution limits
 */

type ExecutionSessionState = {
  limits: ExecutionLimits;
  usage: WorkflowExecutionUsage;
  enrichmentTargetsUsed: number;
  runStartedAt: Date;
};

const executionSessionStorage = new AsyncLocalStorage<ExecutionSessionState>();

function requireExecutionSession(): ExecutionSessionState {
  const session = executionSessionStorage.getStore();

  if (!session) {
    throw new Error("Workflow execution session is not active.");
  }

  return session;
}

export function tryGetExecutionSession(): ExecutionSessionState | undefined {
  return executionSessionStorage.getStore();
}

function createLimitExceededError(
  limit: ExecutionLimitName,
  userMessage: string,
  debug?: Record<string, unknown>,
): ExecutionLimitExceededError {
  return new ExecutionLimitExceededError({ limit, userMessage, debug });
}

export function toExecutionLimitFatalError(
  error: ExecutionLimitExceededError,
): ToolExecutorFatalError {
  return createToolExecutorFatalError(
    EXECUTION_LIMIT_EXCEEDED_CODE,
    error.userMessage,
    {
      debug: {
        limit: error.limit,
        ...error.debug,
      },
    },
  );
}

export function assertRunDurationNotExceeded(): void {
  const session = requireExecutionSession();
  const elapsedMs = Date.now() - session.runStartedAt.getTime();

  if (elapsedMs <= session.limits.maxRunDurationMs) {
    return;
  }

  throw createLimitExceededError(
    "maxRunDurationMs",
    `This run exceeded the maximum duration of ${session.limits.maxRunDurationMs} ms.`,
    {
      elapsedMs,
      maxRunDurationMs: session.limits.maxRunDurationMs,
    },
  );
}

export function assertWorkingSetListingCount(propertyCount: number): void {
  const session = requireExecutionSession();

  if (propertyCount <= session.limits.maxListingCount) {
    return;
  }

  throw createLimitExceededError(
    "maxListingCount",
    `This run exceeded the maximum listing count of ${session.limits.maxListingCount} properties.`,
    {
      propertyCount,
      maxListingCount: session.limits.maxListingCount,
    },
  );
}

export function getEffectiveListingResultCap(fallbackMaxResults: number): number {
  const session = tryGetExecutionSession();

  if (!session) {
    return fallbackMaxResults;
  }

  return Math.min(fallbackMaxResults, session.limits.maxListingCount);
}

export function limitEnrichmentTargets<T>(
  targets: readonly T[],
  options: { stepMaxProperties?: number } = {},
): T[] {
  if (targets.length === 0) {
    return [];
  }

  const session = tryGetExecutionSession();

  if (!session) {
    if (options.stepMaxProperties === undefined) {
      return [...targets];
    }

    return targets.slice(0, options.stepMaxProperties);
  }

  const remainingBudget =
    session.limits.maxPropertiesEnrichedPerRun - session.enrichmentTargetsUsed;

  if (remainingBudget <= 0) {
    throw createLimitExceededError(
      "maxPropertiesEnrichedPerRun",
      `This run exceeded the maximum enrichment count of ${session.limits.maxPropertiesEnrichedPerRun} properties.`,
      {
        enrichmentTargetsUsed: session.enrichmentTargetsUsed,
        maxPropertiesEnrichedPerRun: session.limits.maxPropertiesEnrichedPerRun,
        requestedTargets: targets.length,
      },
    );
  }

  let allowedCount = Math.min(remainingBudget, targets.length);

  if (options.stepMaxProperties !== undefined) {
    allowedCount = Math.min(allowedCount, options.stepMaxProperties);
  }

  session.enrichmentTargetsUsed += allowedCount;

  return targets.slice(0, allowedCount);
}

function assertAndRecordProviderCall(): void {
  const session = requireExecutionSession();

  if (session.usage.providerCallsStep >= session.limits.maxProviderCallsPerStep) {
    throw createLimitExceededError(
      "maxProviderCallsPerStep",
      `This step exceeded the maximum provider call count of ${session.limits.maxProviderCallsPerStep}.`,
      {
        providerCallsStep: session.usage.providerCallsStep,
        maxProviderCallsPerStep: session.limits.maxProviderCallsPerStep,
      },
    );
  }

  if (session.usage.providerCallsRun >= session.limits.maxProviderCallsPerRun) {
    throw createLimitExceededError(
      "maxProviderCallsPerRun",
      `This run exceeded the maximum provider call count of ${session.limits.maxProviderCallsPerRun}.`,
      {
        providerCallsRun: session.usage.providerCallsRun,
        maxProviderCallsPerRun: session.limits.maxProviderCallsPerRun,
      },
    );
  }

  session.usage.providerCallsStep += 1;
  session.usage.providerCallsRun += 1;
}

export function getWorkflowRunProviderClient(): RapidApiClient {
  const session = tryGetExecutionSession();

  if (!session) {
    return getRapidApiClient();
  }

  const baseClient = createRapidApiClient({
    defaultTimeoutMs: session.limits.perRequestTimeoutMs,
  });

  return {
    name: baseClient.name,
    async request(options) {
      assertAndRecordProviderCall();

      return baseClient.request({
        ...options,
        timeoutMs: options.timeoutMs ?? session.limits.perRequestTimeoutMs,
      });
    },
  };
}

export function syncExecutionContextUsage(
  context: WorkflowExecutionContext,
): WorkflowExecutionContext {
  const session = tryGetExecutionSession();

  if (!session) {
    return context;
  }

  return {
    ...context,
    state: {
      ...context.state,
      usage: {
        providerCallsRun: session.usage.providerCallsRun,
        providerCallsStep: session.usage.providerCallsStep,
      },
    },
  };
}

export async function runWithExecutionSession<T>(
  context: WorkflowExecutionContext,
  fn: () => Promise<T>,
): Promise<T> {
  const runStartedAt = context.run.startedAt
    ? new Date(context.run.startedAt)
    : new Date();

  const session: ExecutionSessionState = {
    limits: context.limits,
    usage: {
      providerCallsRun: context.state.usage.providerCallsRun,
      providerCallsStep: context.state.usage.providerCallsStep,
    },
    enrichmentTargetsUsed: 0,
    runStartedAt,
  };

  return executionSessionStorage.run(session, fn);
}
