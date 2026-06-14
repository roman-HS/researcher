import "server-only";

import { and, count, desc, eq, inArray, type SQL } from "drizzle-orm";

import type { ApiPaginationMeta, PaginationQuery } from "@/contracts/api/pagination";
import type { WorkflowRunStatus } from "@/contracts/runs/lifecycle";
import type { ListRunsQuery } from "@/contracts/runs/requests";
import type { RunListItem } from "@/contracts/runs/responses";
import { getDb } from "@/db";
import { runPropertyResults, workflowRuns } from "@/db/schema/run";
import { workflowVersions, workflows } from "@/db/schema/workflow";
import { buildPaginationMeta, toOffsetLimit } from "@/lib/api/pagination";
import type { WorkspaceAuthorizationContext } from "@/modules/workspace";

import { parseWorkflowRunStatus } from "./lifecycle";

/**
 * @see Story 7.5.1 — Implement list runs service and API
 */

export type ListRunsContext = Pick<
  WorkspaceAuthorizationContext,
  "workspace"
>;

export type ListRunsResult = {
  items: RunListItem[];
  pagination: ApiPaginationMeta;
};

type RunListRow = {
  id: string;
  status: string;
  workflowId: string;
  workflowVersionId: string;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  workflowName: string;
  workflowVersionNumber: number;
};

function requireWorkspaceId(workspace: ListRunsContext["workspace"]): string {
  if (!workspace.id) {
    throw new Error("Workspace is missing an id.");
  }

  return workspace.id;
}

function toIsoDateTime(value: Date): string {
  return value.toISOString();
}

function toNullableIsoDateTime(value: Date | null): string | null {
  return value ? toIsoDateTime(value) : null;
}

function buildListRunsWhereClause(
  workspaceId: string,
  query: ListRunsQuery,
): SQL {
  const filters = [eq(workflowRuns.workspaceId, workspaceId)];

  if (query.workflowId) {
    filters.push(eq(workflowRuns.workflowId, query.workflowId));
  }

  return and(...filters)!;
}

function toPropertyResultCount(
  status: WorkflowRunStatus,
  countValue: number | undefined,
): number | null {
  if (status === "pending" || status === "running") {
    return null;
  }

  return countValue ?? 0;
}

function toRunListItem(
  row: RunListRow,
  propertyResultCount: number | undefined,
): RunListItem {
  const status = parseWorkflowRunStatus(row.status);

  return {
    runId: row.id,
    status,
    workflowId: row.workflowId,
    workflowName: row.workflowName,
    workflowVersionId: row.workflowVersionId,
    workflowVersionNumber: row.workflowVersionNumber,
    createdAt: toIsoDateTime(row.createdAt),
    startedAt: toNullableIsoDateTime(row.startedAt),
    completedAt: toNullableIsoDateTime(row.completedAt),
    propertyResultCount: toPropertyResultCount(status, propertyResultCount),
  };
}

async function loadPropertyResultCountsByRunId(
  runIds: readonly string[],
): Promise<Map<string, number>> {
  if (runIds.length === 0) {
    return new Map();
  }

  const db = getDb();
  const countRows = await db
    .select({
      runId: runPropertyResults.runId,
      propertyResultCount: count(),
    })
    .from(runPropertyResults)
    .where(inArray(runPropertyResults.runId, [...runIds]))
    .groupBy(runPropertyResults.runId);

  return new Map(
    countRows
      .filter((row): row is { runId: string; propertyResultCount: number } =>
        Boolean(row.runId),
      )
      .map((row) => [row.runId, row.propertyResultCount]),
  );
}

export async function listRuns(
  query: ListRunsQuery,
  pagination: PaginationQuery,
  context: ListRunsContext,
): Promise<ListRunsResult> {
  const db = getDb();
  const workspaceId = requireWorkspaceId(context.workspace);
  const whereClause = buildListRunsWhereClause(workspaceId, query);
  const { offset, limit } = toOffsetLimit(pagination);

  const [countRow] = await db
    .select({ totalCount: count() })
    .from(workflowRuns)
    .where(whereClause);

  const totalCount = countRow?.totalCount ?? 0;
  const paginationMeta = buildPaginationMeta(pagination, totalCount);

  if (totalCount === 0) {
    return {
      items: [],
      pagination: paginationMeta,
    };
  }

  const runRows = await db
    .select({
      id: workflowRuns.id,
      status: workflowRuns.status,
      workflowId: workflowRuns.workflowId,
      workflowVersionId: workflowRuns.workflowVersionId,
      startedAt: workflowRuns.startedAt,
      completedAt: workflowRuns.completedAt,
      createdAt: workflowRuns.createdAt,
      workflowName: workflows.name,
      workflowVersionNumber: workflowVersions.versionNumber,
    })
    .from(workflowRuns)
    .innerJoin(workflows, eq(workflowRuns.workflowId, workflows.id))
    .innerJoin(
      workflowVersions,
      eq(workflowRuns.workflowVersionId, workflowVersions.id),
    )
    .where(whereClause)
    .orderBy(desc(workflowRuns.createdAt))
    .limit(limit)
    .offset(offset);

  const rows = runRows.filter(
    (row): row is RunListRow =>
      Boolean(
        row.id &&
          row.workflowId &&
          row.workflowVersionId &&
          row.createdAt &&
          row.workflowName,
      ),
  );

  const propertyResultCountsByRunId = await loadPropertyResultCountsByRunId(
    rows.map((row) => row.id),
  );

  return {
    items: rows.map((row) =>
      toRunListItem(row, propertyResultCountsByRunId.get(row.id)),
    ),
    pagination: paginationMeta,
  };
}
