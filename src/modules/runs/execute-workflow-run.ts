import "server-only";

import { and, eq } from "drizzle-orm";

import type { RunErrorJson } from "@/contracts/runs/run-error";
import {
  createToolExecutorFatalError,
  toolExecutorRuntimeInputValuesSchema,
} from "@/contracts/runs/executors";
import {
  createWorkflowExecutionContext,
} from "@/contracts/runs/execution-context";
import { getDb, type DatabaseClient } from "@/db";
import { workflowRunSteps, workflowRuns } from "@/db/schema/run";
import { workflowVersions } from "@/db/schema/workflow";
import { loadCompiledPlanForPublishedVersion } from "@/modules/workflows/load-compiled-plan";

import {
  dispatchWorkflowRunSteps,
  type WorkflowRunStepPersistence,
} from "./dispatch-workflow-run-steps";
import { loadExecutionLimitsFromEnv } from "./load-execution-limits";
import { createRunStatusPatch, createRunStepStatusPatch, parseWorkflowRunStatus, parseWorkflowRunStepStatus } from "./lifecycle";

/**
 * @see Story 7.4.1 — Implement sequential step dispatcher
 * @see Story 7.4.4 — Add partial-result handling
 */

const UNHANDLED_RUN_FAILURE_CODE = "execution_error" as const;

type PersistedRunRow = typeof workflowRuns.$inferSelect;

function toUnhandledRunErrorJson(error: unknown): RunErrorJson {
  const message =
    error instanceof Error ? error.message : "Workflow execution failed.";

  return createToolExecutorFatalError(
    UNHANDLED_RUN_FAILURE_CODE,
    "Workflow execution failed unexpectedly.",
    { debug: { message } },
  );
}

async function loadRunById(
  db: DatabaseClient,
  runId: string,
): Promise<PersistedRunRow | undefined> {
  return db.query.workflowRuns.findFirst({
    where: eq(workflowRuns.id, runId),
  });
}

async function claimRunForExecution(
  db: DatabaseClient,
  runId: string,
): Promise<PersistedRunRow | null> {
  const now = new Date();
  const patch = createRunStatusPatch("pending", "running", { now });

  if (!patch) {
    return null;
  }

  const [claimedRun] = await db
    .update(workflowRuns)
    .set({
      status: patch.status,
      startedAt: patch.startedAt,
      updatedAt: now,
    })
    .where(and(eq(workflowRuns.id, runId), eq(workflowRuns.status, "pending")))
    .returning();

  return claimedRun ?? null;
}

async function markRunFailedIfRunning(
  db: DatabaseClient,
  runId: string,
  error: RunErrorJson,
): Promise<void> {
  const run = await loadRunById(db, runId);

  if (!run) {
    throw new Error(`Run "${runId}" could not be loaded for failure handling.`);
  }

  const status = parseWorkflowRunStatus(run.status);

  if (status !== "running") {
    return;
  }

  const patch = createRunStatusPatch(status, "failed", { error });

  if (!patch) {
    return;
  }

  await db
    .update(workflowRuns)
    .set({
      status: patch.status,
      completedAt: patch.completedAt,
      errorJson: patch.errorJson,
      updatedAt: new Date(),
    })
    .where(eq(workflowRuns.id, runId));
}

function createWorkflowRunStepPersistence(
  db: DatabaseClient,
  runId: string,
): WorkflowRunStepPersistence {
  return {
    async createStep(step) {
      const [row] = await db
        .insert(workflowRunSteps)
        .values({
          runId,
          stepNodeId: step.nodeId,
          toolKey: step.toolKey,
          status: "pending",
        })
        .returning({ stepId: workflowRunSteps.id });

      if (!row?.stepId) {
        throw new Error("Failed to create workflow run step row.");
      }

      return { stepId: row.stepId };
    },

    async markStepRunning(stepId, inputJson) {
      const runStep = await db.query.workflowRunSteps.findFirst({
        where: eq(workflowRunSteps.id, stepId),
      });

      if (!runStep) {
        throw new Error(`Workflow run step "${stepId}" could not be loaded.`);
      }

      const patch = createRunStepStatusPatch(
        parseWorkflowRunStepStatus(runStep.status),
        "running",
      );

      if (!patch) {
        return;
      }

      await db
        .update(workflowRunSteps)
        .set({
          status: patch.status,
          startedAt: patch.startedAt,
          inputJson: inputJson ?? null,
          updatedAt: new Date(),
        })
        .where(eq(workflowRunSteps.id, stepId));
    },

    async markStepSucceeded(stepId, snapshot) {
      const runStep = await db.query.workflowRunSteps.findFirst({
        where: eq(workflowRunSteps.id, stepId),
      });

      if (!runStep) {
        throw new Error(`Workflow run step "${stepId}" could not be loaded.`);
      }

      const patch = createRunStepStatusPatch(
        parseWorkflowRunStepStatus(runStep.status),
        "succeeded",
      );

      if (!patch) {
        return;
      }

      await db
        .update(workflowRunSteps)
        .set({
          status: patch.status,
          completedAt: patch.completedAt,
          outputJson: snapshot.outputJson,
          warningsJson: snapshot.warningsJson as Record<string, unknown> | null,
          updatedAt: new Date(),
        })
        .where(eq(workflowRunSteps.id, stepId));
    },

    async markStepFailed(stepId, snapshot) {
      const runStep = await db.query.workflowRunSteps.findFirst({
        where: eq(workflowRunSteps.id, stepId),
      });

      if (!runStep) {
        throw new Error(`Workflow run step "${stepId}" could not be loaded.`);
      }

      const patch = createRunStepStatusPatch(
        parseWorkflowRunStepStatus(runStep.status),
        "failed",
        { error: snapshot.errorJson },
      );

      if (!patch) {
        return;
      }

      await db
        .update(workflowRunSteps)
        .set({
          status: patch.status,
          completedAt: patch.completedAt,
          outputJson: snapshot.outputJson,
          warningsJson: snapshot.warningsJson as Record<string, unknown> | null,
          errorJson: patch.errorJson,
          updatedAt: new Date(),
        })
        .where(eq(workflowRunSteps.id, stepId));
    },

    async markRunSucceeded() {
      const run = await loadRunById(db, runId);

      if (!run) {
        throw new Error(`Run "${runId}" could not be loaded.`);
      }

      const patch = createRunStatusPatch(
        parseWorkflowRunStatus(run.status),
        "succeeded",
      );

      if (!patch) {
        return;
      }

      await db
        .update(workflowRuns)
        .set({
          status: patch.status,
          completedAt: patch.completedAt,
          updatedAt: new Date(),
        })
        .where(eq(workflowRuns.id, runId));
    },

    async markRunPartial() {
      const run = await loadRunById(db, runId);

      if (!run) {
        throw new Error(`Run "${runId}" could not be loaded.`);
      }

      const patch = createRunStatusPatch(
        parseWorkflowRunStatus(run.status),
        "partial",
      );

      if (!patch) {
        return;
      }

      await db
        .update(workflowRuns)
        .set({
          status: patch.status,
          completedAt: patch.completedAt,
          updatedAt: new Date(),
        })
        .where(eq(workflowRuns.id, runId));
    },

    async amendSucceededStepOutput(stepId, outputJson) {
      const runStep = await db.query.workflowRunSteps.findFirst({
        where: eq(workflowRunSteps.id, stepId),
      });

      if (!runStep) {
        throw new Error(`Workflow run step "${stepId}" could not be loaded.`);
      }

      if (parseWorkflowRunStepStatus(runStep.status) !== "succeeded") {
        throw new Error(
          `Workflow run step "${stepId}" cannot be amended unless it succeeded.`,
        );
      }

      await db
        .update(workflowRunSteps)
        .set({
          outputJson,
          updatedAt: new Date(),
        })
        .where(eq(workflowRunSteps.id, stepId));
    },

    async markRunFailed(error) {
      await markRunFailedIfRunning(db, runId, error);
    },
  };
}

async function loadExecutionContextForRun(
  db: DatabaseClient,
  run: PersistedRunRow,
) {
  if (
    !run.id ||
    !run.workspaceId ||
    !run.workflowId ||
    !run.workflowVersionId ||
    !run.createdByUserId
  ) {
    throw new Error("Run record is missing required execution fields.");
  }

  const version = await db.query.workflowVersions.findFirst({
    where: eq(workflowVersions.id, run.workflowVersionId),
  });

  if (!version) {
    throw new Error(
      `Workflow version "${run.workflowVersionId}" could not be loaded for run execution.`,
    );
  }

  const compiledPlan = loadCompiledPlanForPublishedVersion({
    state: "published",
    definitionJson: version.definitionJson,
    compiledPlanJson: version.compiledPlanJson,
  });

  const runtimeInputValues = toolExecutorRuntimeInputValuesSchema.parse(
    run.inputJson,
  );

  return createWorkflowExecutionContext({
    run: {
      runId: run.id,
      workspaceId: run.workspaceId,
      workflowId: run.workflowId,
      workflowVersionId: run.workflowVersionId,
      userId: run.createdByUserId,
      createdAt: run.createdAt ?? undefined,
      startedAt: run.startedAt ?? undefined,
    },
    compiledPlan,
    runtimeInputValues,
    limits: loadExecutionLimitsFromEnv(),
    status: "running",
  });
}

export async function executeWorkflowRun(runId: string): Promise<void> {
  const db = getDb();
  const claimedRun = await claimRunForExecution(db, runId);

  if (!claimedRun) {
    return;
  }

  try {
    const context = await loadExecutionContextForRun(db, claimedRun);
    await dispatchWorkflowRunSteps(
      context,
      createWorkflowRunStepPersistence(db, runId),
    );
  } catch (error) {
    await markRunFailedIfRunning(db, runId, toUnhandledRunErrorJson(error));
  }
}
