import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  areaAggregateSchema,
  areaGroupingLevelSchema,
  metricBundleSchema,
  propertyScoreSchema,
  workflowSummarySchema,
} from "@/contracts/domain/analysis";
import { propertyDetailSchema, propertyListingSchema } from "@/contracts/domain/property";
import type { WorkflowCompiledPlan, WorkflowCompiledPlanStep } from "@/contracts/workflows/compiled-plan";
import type { GetRunDetailQuery } from "@/contracts/runs/requests";
import type {
  GetRunDetailResponse,
  RunDetailAreaResult,
  RunDetailCounts,
  RunDetailPropertyResult,
  RunDetailStepTimelineItem,
  RunDetailUserFacingError,
} from "@/contracts/runs/responses";
import type { RunErrorJson } from "@/contracts/runs/run-error";
import {
  parseRunErrorJson,
  parseRunStepErrorJson,
} from "@/contracts/runs/run-error";
import {
  toolExecutorItemErrorSchema,
  toolExecutorRuntimeInputValuesSchema,
  toolExecutorWarningSchema,
  type ToolExecutorItemError,
  type ToolExecutorWarning,
} from "@/contracts/runs/executors";
import { getDb } from "@/db";
import {
  runAreaResults,
  runPropertyResults,
  workflowRunSteps,
  workflowRuns,
} from "@/db/schema/run";
import { workflowVersions, workflows } from "@/db/schema/workflow";
import { AppError } from "@/lib/api/errors";
import type { WorkspaceAuthorizationContext } from "@/modules/workspace";
import { loadCompiledPlanForPublishedVersion } from "@/modules/workflows/load-compiled-plan";

import { parseWorkflowRunStatus, parseWorkflowRunStepStatus } from "./lifecycle";
import type { RunStepOutputSnapshot } from "./step-output-snapshot";

/**
 * @see Story 7.5.2 — Implement get run detail service and API
 */

export type GetRunContext = Pick<WorkspaceAuthorizationContext, "workspace">;

type PersistedRunRow = typeof workflowRuns.$inferSelect;
type PersistedRunStepRow = typeof workflowRunSteps.$inferSelect;
type PersistedPropertyResultRow = typeof runPropertyResults.$inferSelect;
type PersistedAreaResultRow = typeof runAreaResults.$inferSelect;

type RunDetailRow = {
  run: PersistedRunRow;
  workflowName: string;
  workflowVersionNumber: number;
  workflowVersionState: string;
  workflowVersionDefinitionJson: unknown;
  workflowVersionCompiledPlanJson: unknown | null;
};

function requireWorkspaceId(workspace: GetRunContext["workspace"]): string {
  if (!workspace.id) {
    throw new Error("Workspace is missing an id.");
  }

  return workspace.id;
}

function runNotFoundError(): AppError {
  return new AppError("not_found", "Run not found.");
}

function toIsoDateTime(value: Date): string {
  return value.toISOString();
}

function toNullableIsoDateTime(value: Date | null): string | null {
  return value ? toIsoDateTime(value) : null;
}

function parseNullableNumericColumn(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseStringArray(value: unknown): string[] {
  const result = z.array(z.string()).safeParse(value);
  return result.success ? result.data : [];
}

function parseStepWarnings(value: unknown): ToolExecutorWarning[] {
  const result = z.array(toolExecutorWarningSchema).safeParse(value);
  return result.success ? result.data : [];
}

function parsePropertyErrors(
  value: unknown,
  includeDebug: boolean,
): ToolExecutorItemError[] {
  const parsed = z
    .object({
      items: z.array(toolExecutorItemErrorSchema),
    })
    .safeParse(value);

  if (!parsed.success) {
    return [];
  }

  return parsed.data.items.map((itemError) =>
    toUserFacingItemError(itemError, includeDebug),
  );
}

function toUserFacingItemError(
  itemError: ToolExecutorItemError,
  includeDebug: boolean,
): ToolExecutorItemError {
  return {
    code: itemError.code,
    userMessage: itemError.userMessage,
    ...(itemError.propertyKey ? { propertyKey: itemError.propertyKey } : {}),
    ...(includeDebug && itemError.debug ? { debug: itemError.debug } : {}),
  };
}

function toUserFacingError(
  error: RunErrorJson,
  includeDebug: boolean,
): RunDetailUserFacingError {
  return {
    code: error.code,
    userMessage: error.userMessage,
    ...(error.stepNodeId ? { stepNodeId: error.stepNodeId } : {}),
    ...(error.toolKey ? { toolKey: error.toolKey } : {}),
    ...(includeDebug && error.debug ? { debug: error.debug } : {}),
  };
}

function parseStepOutputSnapshot(value: unknown): RunStepOutputSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as RunStepOutputSnapshot;
}

function computeDurationMs(
  startedAt: Date | null,
  completedAt: Date | null,
): number | null {
  if (!startedAt || !completedAt) {
    return null;
  }

  return completedAt.getTime() - startedAt.getTime();
}

function findPlanStep(
  plan: WorkflowCompiledPlan,
  nodeId: string,
): WorkflowCompiledPlanStep | undefined {
  return plan.steps.find((step) => step.nodeId === nodeId);
}

function getStepTitle(planStep: WorkflowCompiledPlanStep | undefined, toolKey: string): string {
  return planStep?.title ?? toolKey;
}

function buildStepTimeline(
  plan: WorkflowCompiledPlan,
  persistedSteps: readonly PersistedRunStepRow[],
  includeStepDetails: boolean,
): RunDetailStepTimelineItem[] {
  const stepsByNodeId = new Map(
    persistedSteps
      .filter((step) => step.stepNodeId)
      .map((step) => [step.stepNodeId, step]),
  );

  return plan.executionOrder.flatMap((nodeId) => {
    const planStep = findPlanStep(plan, nodeId);

    if (!planStep) {
      return [];
    }

    const persisted = stepsByNodeId.get(nodeId);

    if (!persisted) {
      return [
        {
          stepId: null,
          stepNodeId: nodeId,
          stepTitle: getStepTitle(planStep, planStep.toolKey),
          toolKey: planStep.toolKey,
          status: "pending" as const,
          startedAt: null,
          completedAt: null,
          durationMs: null,
          error: null,
          warnings: [],
          outputSummary: null,
        },
      ];
    }

    const outputSnapshot = parseStepOutputSnapshot(persisted.outputJson);
    const stepError = persisted.errorJson
      ? toUserFacingError(
          parseRunStepErrorJson(persisted.errorJson),
          includeStepDetails,
        )
      : null;

    return [
      {
        stepId: persisted.id ?? null,
        stepNodeId: nodeId,
        stepTitle: getStepTitle(planStep, persisted.toolKey),
        toolKey: persisted.toolKey,
        status: parseWorkflowRunStepStatus(persisted.status),
        startedAt: toNullableIsoDateTime(persisted.startedAt),
        completedAt: toNullableIsoDateTime(persisted.completedAt),
        durationMs: computeDurationMs(persisted.startedAt, persisted.completedAt),
        error: stepError,
        warnings: parseStepWarnings(persisted.warningsJson),
        outputSummary: outputSnapshot?.summary ?? null,
        ...(includeStepDetails
          ? {
              inputJson:
                persisted.inputJson &&
                typeof persisted.inputJson === "object" &&
                !Array.isArray(persisted.inputJson)
                  ? (persisted.inputJson as Record<string, unknown>)
                  : null,
              outputJson: outputSnapshot,
            }
          : {}),
      },
    ];
  });
}

function parseOptionalWorkflowSummary(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const result = workflowSummarySchema.safeParse(value);
  return result.success ? result.data : null;
}

function parseOptionalPropertyListing(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const result = propertyListingSchema.safeParse(value);
  return result.success ? result.data : null;
}

function parseOptionalPropertyDetail(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const result = propertyDetailSchema.safeParse(value);
  return result.success ? result.data : null;
}

function parseOptionalMetricBundle(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const result = metricBundleSchema.safeParse(value);
  return result.success ? result.data : null;
}

function parseOptionalPropertyScore(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const result = propertyScoreSchema.safeParse(value);
  return result.success ? result.data : null;
}

function parseOptionalAddressSummary(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "object") {
    return null;
  }

  return value as RunDetailPropertyResult["addressSummary"];
}

function toPropertyResult(
  row: PersistedPropertyResultRow,
  includeStepDetails: boolean,
): RunDetailPropertyResult | null {
  if (!row.id || !row.propertyKey) {
    return null;
  }

  return {
    propertyResultId: row.id,
    propertyKey: row.propertyKey,
    displayOrder: row.displayOrder,
    totalScore: parseNullableNumericColumn(row.totalScore),
    listPriceCents: row.listPriceCents,
    capRate: parseNullableNumericColumn(row.capRate),
    monthlyCashFlow: parseNullableNumericColumn(row.monthlyCashFlow),
    addressSummary: parseOptionalAddressSummary(row.addressSummaryJson),
    listing: parseOptionalPropertyListing(row.listingJson),
    detail: parseOptionalPropertyDetail(row.detailJson),
    metrics: parseOptionalMetricBundle(row.metricsJson),
    score: parseOptionalPropertyScore(row.scoreJson),
    warnings: parseStringArray(row.warningsJson),
    errors: parsePropertyErrors(row.errorsJson, includeStepDetails),
  };
}

function toAreaResult(row: PersistedAreaResultRow): RunDetailAreaResult | null {
  if (!row.id) {
    return null;
  }

  const aggregates = areaAggregateSchema.safeParse(row.aggregatesJson);
  const groupingLevel = areaGroupingLevelSchema.safeParse(row.groupingLevel);

  if (!aggregates.success || !groupingLevel.success) {
    return null;
  }

  return {
    areaResultId: row.id,
    areaKey: row.areaKey,
    groupingLevel: groupingLevel.data,
    propertyCount: row.propertyCount,
    rank: row.rank,
    meetsMinimumSample: row.meetsMinimumSample,
    aggregates: aggregates.data,
    warnings: parseStringArray(row.warningsJson),
  };
}

function buildRunDetailCounts(
  propertyResults: readonly RunDetailPropertyResult[],
  steps: readonly RunDetailStepTimelineItem[],
): RunDetailCounts {
  const failedPropertyCount = propertyResults.filter(
    (propertyResult) => propertyResult.errors.length > 0,
  ).length;

  const warningMessages = new Set<string>();

  for (const propertyResult of propertyResults) {
    for (const warning of propertyResult.warnings) {
      warningMessages.add(warning);
    }
  }

  for (const step of steps) {
    for (const warning of step.warnings) {
      warningMessages.add(warning.message);
    }
  }

  return {
    propertyCount: propertyResults.length,
    failedPropertyCount,
    warningCount: warningMessages.size,
  };
}

function parseInputValues(value: unknown) {
  const result = toolExecutorRuntimeInputValuesSchema.safeParse(value);
  return result.success ? result.data : {};
}

async function loadRunDetailRow(
  runId: string,
  workspaceId: string,
): Promise<RunDetailRow | null> {
  const db = getDb();

  const [row] = await db
    .select({
      run: workflowRuns,
      workflowName: workflows.name,
      workflowVersionNumber: workflowVersions.versionNumber,
      workflowVersionState: workflowVersions.state,
      workflowVersionDefinitionJson: workflowVersions.definitionJson,
      workflowVersionCompiledPlanJson: workflowVersions.compiledPlanJson,
    })
    .from(workflowRuns)
    .innerJoin(workflows, eq(workflowRuns.workflowId, workflows.id))
    .innerJoin(
      workflowVersions,
      eq(workflowRuns.workflowVersionId, workflowVersions.id),
    )
    .where(
      and(eq(workflowRuns.id, runId), eq(workflowRuns.workspaceId, workspaceId)),
    )
    .limit(1);

  if (!row?.run?.id || !row.workflowName) {
    return null;
  }

  return {
    run: row.run,
    workflowName: row.workflowName,
    workflowVersionNumber: row.workflowVersionNumber,
    workflowVersionState: row.workflowVersionState,
    workflowVersionDefinitionJson: row.workflowVersionDefinitionJson,
    workflowVersionCompiledPlanJson: row.workflowVersionCompiledPlanJson,
  };
}

export async function getRun(
  runId: string,
  query: GetRunDetailQuery,
  context: GetRunContext,
): Promise<GetRunDetailResponse> {
  const db = getDb();
  const workspaceId = requireWorkspaceId(context.workspace);
  const detailRow = await loadRunDetailRow(runId, workspaceId);

  if (!detailRow) {
    throw runNotFoundError();
  }

  const { run, workflowName, workflowVersionNumber } = detailRow;

  if (!run.id || !run.workflowId || !run.workflowVersionId || !run.createdAt) {
    throw new Error("Run detail row is missing required fields.");
  }

  const compiledPlan = loadCompiledPlanForPublishedVersion({
    state: "published",
    definitionJson: detailRow.workflowVersionDefinitionJson,
    compiledPlanJson: detailRow.workflowVersionCompiledPlanJson,
  });

  const [persistedSteps, propertyRows, areaRows] = await Promise.all([
    db
      .select()
      .from(workflowRunSteps)
      .where(eq(workflowRunSteps.runId, run.id)),
    db
      .select()
      .from(runPropertyResults)
      .where(eq(runPropertyResults.runId, run.id))
      .orderBy(asc(runPropertyResults.displayOrder)),
    db
      .select()
      .from(runAreaResults)
      .where(eq(runAreaResults.runId, run.id))
      .orderBy(asc(runAreaResults.rank)),
  ]);

  const propertyResults = propertyRows
    .map((row) => toPropertyResult(row, query.includeStepDetails))
    .filter((row): row is RunDetailPropertyResult => row !== null);

  const areaResults = areaRows
    .map((row) => toAreaResult(row))
    .filter((row): row is RunDetailAreaResult => row !== null);

  const steps = buildStepTimeline(
    compiledPlan,
    persistedSteps,
    query.includeStepDetails,
  );

  const runError = run.errorJson
    ? toUserFacingError(
        parseRunErrorJson(run.errorJson),
        query.includeStepDetails,
      )
    : null;

  return {
    runId: run.id,
    status: parseWorkflowRunStatus(run.status),
    workflowId: run.workflowId,
    workflowName,
    workflowVersionId: run.workflowVersionId,
    workflowVersionNumber,
    createdAt: toIsoDateTime(run.createdAt),
    startedAt: toNullableIsoDateTime(run.startedAt),
    completedAt: toNullableIsoDateTime(run.completedAt),
    inputValues: parseInputValues(run.inputJson),
    runtimeInputs: compiledPlan.runtimeInputs,
    error: runError,
    summary: parseOptionalWorkflowSummary(run.outputSummaryJson),
    counts: buildRunDetailCounts(propertyResults, steps),
    steps,
    propertyResults,
    areaResults,
  };
}
