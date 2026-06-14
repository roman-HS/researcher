import "server-only";

import { and, eq } from "drizzle-orm";

import type { ExecutionTransport } from "@/contracts/runs/execution-transport";
import type { RunErrorJson } from "@/contracts/runs/run-error";
import type { WorkflowRunStatus } from "@/contracts/runs/lifecycle";
import type { CreateRunRequest } from "@/contracts/runs/requests";
import { getDb, type DatabaseClient } from "@/db";
import { runIdempotencyKeys, workflowRuns } from "@/db/schema/run";
import { workflowVersions, workflows } from "@/db/schema/workflow";
import { AppError } from "@/lib/api/errors";
import {
  ExecutionTransportStartError,
  isExecutionTransportStartError,
} from "@/modules/runs/errors";
import { getExecutionTransport } from "@/modules/runs/execution-transport";
import { hashCreateRunRequest } from "@/modules/runs/hash-create-run-request";
import {
  createRunStatusPatch,
  parseWorkflowRunStatus,
} from "@/modules/runs/lifecycle";
import { parseRuntimeInputValues } from "@/modules/runs/validate-runtime-inputs";
import type { WorkspaceAuthorizationContext } from "@/modules/workspace";
import {
  assertWorkflowAllowsRun,
  loadCompiledPlanForPublishedVersion,
  parseWorkflowStatus,
} from "@/modules/workflows";

/**
 * @see Story 7.3.2 — Implement idempotent run creation service
 */

export type CreateRunContext = Pick<
  WorkspaceAuthorizationContext,
  "user" | "workspace"
>;

export type CreateRunOptions = {
  transport?: ExecutionTransport;
};

export type CreateRunResult = {
  runId: string;
  status: WorkflowRunStatus;
  workflowVersionId: string;
  replayed: boolean;
};

type PersistedRunRow = typeof workflowRuns.$inferSelect;

type IdempotencyRow = typeof runIdempotencyKeys.$inferSelect;

type PublishedVersionRow = typeof workflowVersions.$inferSelect;

type DatabaseExecutor = DatabaseClient;

function isPostgresUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function requireWorkspaceId(
  workspace: CreateRunContext["workspace"],
): string {
  if (!workspace.id) {
    throw new Error("Workspace is missing an id.");
  }

  return workspace.id;
}

function requireUserId(user: CreateRunContext["user"]): string {
  if (!user.id) {
    throw new Error("User is missing an id.");
  }

  return user.id;
}

function workflowNotFoundError(): AppError {
  return new AppError("not_found", "Workflow not found.");
}

function noPublishedVersionError(): AppError {
  return new AppError(
    "conflict",
    "Workflow has no published version to run.",
  );
}

function idempotencyConflictError(): AppError {
  return new AppError(
    "conflict",
    "Idempotency key was reused with a different request body.",
  );
}

function selectLatestPublishedVersion(
  versions: PublishedVersionRow[],
): PublishedVersionRow | null {
  let latest: PublishedVersionRow | null = null;

  for (const version of versions) {
    if (version.state !== "published") {
      continue;
    }

    if (latest === null || version.versionNumber > latest.versionNumber) {
      latest = version;
    }
  }

  return latest;
}

async function findIdempotencyRecord(
  db: DatabaseExecutor,
  workspaceId: string,
  userId: string,
  idempotencyKey: string,
): Promise<IdempotencyRow | undefined> {
  return db.query.runIdempotencyKeys.findFirst({
    where: and(
      eq(runIdempotencyKeys.workspaceId, workspaceId),
      eq(runIdempotencyKeys.userId, userId),
      eq(runIdempotencyKeys.idempotencyKey, idempotencyKey),
    ),
  });
}

async function loadRunById(
  db: DatabaseExecutor,
  runId: string,
): Promise<PersistedRunRow | undefined> {
  return db.query.workflowRuns.findFirst({
    where: eq(workflowRuns.id, runId),
  });
}

function toCreateRunResult(
  run: PersistedRunRow,
  replayed: boolean,
): CreateRunResult {
  if (!run.id || !run.workflowVersionId) {
    throw new Error("Run record is missing required fields.");
  }

  return {
    runId: run.id,
    status: parseWorkflowRunStatus(run.status),
    workflowVersionId: run.workflowVersionId,
    replayed,
  };
}

function resolveReplayFromIdempotencyRecord(
  record: IdempotencyRow,
  requestHash: string,
  run: PersistedRunRow | undefined,
): CreateRunResult {
  if (record.requestHash !== requestHash) {
    throw idempotencyConflictError();
  }

  if (!run) {
    throw new Error("Idempotency record references a missing run.");
  }

  return toCreateRunResult(run, true);
}

async function resolveExistingIdempotency(
  db: DatabaseExecutor,
  record: IdempotencyRow,
  requestHash: string,
): Promise<CreateRunResult> {
  const run = await loadRunById(db, record.runId);
  return resolveReplayFromIdempotencyRecord(record, requestHash, run);
}

async function loadWorkflowForRun(
  db: DatabaseExecutor,
  workflowId: string,
  workspaceId: string,
) {
  const workflow = await db.query.workflows.findFirst({
    where: and(
      eq(workflows.id, workflowId),
      eq(workflows.workspaceId, workspaceId),
    ),
  });

  if (!workflow) {
    throw workflowNotFoundError();
  }

  assertWorkflowAllowsRun(parseWorkflowStatus(workflow.status));

  return workflow;
}

async function loadLatestPublishedVersionForWorkflow(
  db: DatabaseExecutor,
  workflowId: string,
): Promise<PublishedVersionRow> {
  const versions = await db
    .select()
    .from(workflowVersions)
    .where(
      and(
        eq(workflowVersions.workflowId, workflowId),
        eq(workflowVersions.state, "published"),
      ),
    );

  const publishedVersion = selectLatestPublishedVersion(versions);

  if (!publishedVersion?.id) {
    throw noPublishedVersionError();
  }

  return publishedVersion;
}

function toRunErrorJson(error: ExecutionTransportStartError): RunErrorJson {
  return {
    code: error.code,
    userMessage: error.userMessage,
    ...(error.debug ? { debug: error.debug } : {}),
  };
}

async function markRunFailedAfterTransportStart(
  db: DatabaseExecutor,
  runId: string,
  error: ExecutionTransportStartError,
): Promise<PersistedRunRow> {
  const run = await loadRunById(db, runId);

  if (!run?.id) {
    throw new Error("Run record is missing after transport start failure.");
  }

  const status = parseWorkflowRunStatus(run.status);
  const patch = createRunStatusPatch(status, "failed", {
    error: toRunErrorJson(error),
  });

  if (!patch) {
    return run;
  }

  const [updatedRun] = await db
    .update(workflowRuns)
    .set({
      status: patch.status,
      completedAt: patch.completedAt,
      errorJson: patch.errorJson,
      updatedAt: new Date(),
    })
    .where(eq(workflowRuns.id, runId))
    .returning();

  if (!updatedRun) {
    throw new Error("Failed to mark run as failed after transport start error.");
  }

  return updatedRun;
}

async function startRunExecution(
  db: DatabaseExecutor,
  run: PersistedRunRow,
  transport: ExecutionTransport,
): Promise<PersistedRunRow> {
  if (!run.id) {
    throw new Error("Run record is missing an id.");
  }

  try {
    await transport.startRun({ runId: run.id });
    return run;
  } catch (error) {
    if (!isExecutionTransportStartError(error)) {
      throw error;
    }

    return markRunFailedAfterTransportStart(db, run.id, error);
  }
}

async function persistNewRun(
  db: DatabaseExecutor,
  input: {
    workspaceId: string;
    workflowId: string;
    workflowVersionId: string;
    createdByUserId: string;
    inputJson: Record<string, unknown>;
    idempotencyKey: string;
    requestHash: string;
  },
): Promise<CreateRunResult> {
  return db.transaction(async (tx) => {
    const existing = await findIdempotencyRecord(
      tx,
      input.workspaceId,
      input.createdByUserId,
      input.idempotencyKey,
    );

    if (existing) {
      const run = await loadRunById(tx, existing.runId);
      return resolveReplayFromIdempotencyRecord(
        existing,
        input.requestHash,
        run,
      );
    }

    const [run] = await tx
      .insert(workflowRuns)
      .values({
        workspaceId: input.workspaceId,
        workflowId: input.workflowId,
        workflowVersionId: input.workflowVersionId,
        createdByUserId: input.createdByUserId,
        status: "pending",
        inputJson: input.inputJson,
      })
      .returning();

    if (!run?.id) {
      throw new Error("Failed to create workflow run.");
    }

    await tx.insert(runIdempotencyKeys).values({
      workspaceId: input.workspaceId,
      userId: input.createdByUserId,
      idempotencyKey: input.idempotencyKey,
      requestHash: input.requestHash,
      runId: run.id,
      expiresAt: null,
    });

    return toCreateRunResult(run, false);
  });
}

async function handleIdempotencyRace(
  db: DatabaseExecutor,
  workspaceId: string,
  userId: string,
  idempotencyKey: string,
  requestHash: string,
): Promise<CreateRunResult> {
  const existing = await findIdempotencyRecord(
    db,
    workspaceId,
    userId,
    idempotencyKey,
  );

  if (!existing) {
    throw new Error("Idempotency race could not be resolved.");
  }

  return resolveExistingIdempotency(db, existing, requestHash);
}

export async function createRun(
  request: CreateRunRequest,
  idempotencyKey: string,
  context: CreateRunContext,
  options: CreateRunOptions = {},
): Promise<CreateRunResult> {
  const db = getDb();
  const workspaceId = requireWorkspaceId(context.workspace);
  const userId = requireUserId(context.user);
  const transport = options.transport ?? getExecutionTransport();

  await loadWorkflowForRun(db, request.workflowId, workspaceId);

  const publishedVersion = await loadLatestPublishedVersionForWorkflow(
    db,
    request.workflowId,
  );

  if (!publishedVersion.id) {
    throw noPublishedVersionError();
  }

  const publishedVersionId = publishedVersion.id;

  const compiledPlan = loadCompiledPlanForPublishedVersion({
    state: "published",
    definitionJson: publishedVersion.definitionJson,
    compiledPlanJson: publishedVersion.compiledPlanJson,
  });

  const validatedInputs = parseRuntimeInputValues(
    compiledPlan.runtimeInputs,
    request.inputs,
  );

  const requestHash = hashCreateRunRequest(
    request.workflowId,
    validatedInputs,
  );

  const existing = await findIdempotencyRecord(
    db,
    workspaceId,
    userId,
    idempotencyKey,
  );

  if (existing) {
    return resolveExistingIdempotency(db, existing, requestHash);
  }

  let result: CreateRunResult;

  try {
    result = await persistNewRun(db, {
      workspaceId,
      workflowId: request.workflowId,
      workflowVersionId: publishedVersionId,
      createdByUserId: userId,
      inputJson: validatedInputs,
      idempotencyKey,
      requestHash,
    });
  } catch (error) {
    if (!isPostgresUniqueViolation(error)) {
      throw error;
    }

    result = await handleIdempotencyRace(
      db,
      workspaceId,
      userId,
      idempotencyKey,
      requestHash,
    );
  }

  if (result.replayed) {
    return result;
  }

  const run = await loadRunById(db, result.runId);

  if (!run) {
    throw new Error("Created run record could not be loaded.");
  }

  const updatedRun = await startRunExecution(db, run, transport);
  return toCreateRunResult(updatedRun, false);
}
