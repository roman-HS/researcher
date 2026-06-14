import "server-only";

import { and, count, desc, eq, inArray, or } from "drizzle-orm";

import type { ApiPaginationMeta, PaginationQuery } from "@/contracts/api/pagination";
import type { ListWorkflowsQuery } from "@/contracts/workflows/requests";
import type {
  WorkflowDraftVersionSummary,
  WorkflowListItem,
  WorkflowPublishedVersionSummary,
} from "@/contracts/workflows/responses";
import { getDb } from "@/db";
import { workflowVersions, workflows } from "@/db/schema/workflow";
import { buildPaginationMeta, toOffsetLimit } from "@/lib/api/pagination";
import type { WorkspaceAuthorizationContext } from "@/modules/workspace";

import { parseWorkflowStatus } from "./lifecycle";

/**
 * @see Story 4.3.2 — Implement list workflows service
 */

export type ListWorkflowsContext = Pick<
  WorkspaceAuthorizationContext,
  "workspace"
>;

export type ListWorkflowsResult = {
  items: WorkflowListItem[];
  pagination: ApiPaginationMeta;
};

type WorkflowVersionRow = Pick<
  typeof workflowVersions.$inferSelect,
  | "id"
  | "workflowId"
  | "versionNumber"
  | "state"
  | "updatedAt"
  | "publishedAt"
>;

type VersionSummariesByWorkflowId = Map<
  string,
  {
    draftVersion: WorkflowDraftVersionSummary | null;
    publishedVersion: WorkflowPublishedVersionSummary | null;
  }
>;

function requireWorkspaceId(
  workspace: ListWorkflowsContext["workspace"],
): string {
  if (!workspace.id) {
    throw new Error("Workspace is missing an id.");
  }

  return workspace.id;
}

function buildWorkflowStatusFilter(query: ListWorkflowsQuery) {
  switch (query.status) {
    case "active":
      return eq(workflows.status, "active");
    case "archived":
      return eq(workflows.status, "archived");
    case "all":
      return undefined;
  }
}

function toIsoDateTime(value: Date): string {
  return value.toISOString();
}

function toDraftVersionSummary(
  version: WorkflowVersionRow,
): WorkflowDraftVersionSummary | null {
  if (!version.id || !version.updatedAt) {
    return null;
  }

  return {
    versionId: version.id,
    versionNumber: version.versionNumber,
    updatedAt: toIsoDateTime(version.updatedAt),
  };
}

function toPublishedVersionSummary(
  version: WorkflowVersionRow,
): WorkflowPublishedVersionSummary | null {
  if (!version.id || !version.updatedAt || !version.publishedAt) {
    return null;
  }

  return {
    versionId: version.id,
    versionNumber: version.versionNumber,
    publishedAt: toIsoDateTime(version.publishedAt),
    updatedAt: toIsoDateTime(version.updatedAt),
  };
}

function buildVersionSummariesByWorkflowId(
  versions: WorkflowVersionRow[],
): VersionSummariesByWorkflowId {
  const summaries = new Map<
    string,
    {
      draftVersion: WorkflowDraftVersionSummary | null;
      publishedVersion: WorkflowPublishedVersionSummary | null;
    }
  >();

  for (const version of versions) {
    if (!version.workflowId) {
      continue;
    }

    const existing = summaries.get(version.workflowId) ?? {
      draftVersion: null,
      publishedVersion: null,
    };

    if (version.state === "draft") {
      existing.draftVersion = toDraftVersionSummary(version);
    }

    if (version.state === "published") {
      const candidate = toPublishedVersionSummary(version);
      const current = existing.publishedVersion;

      if (
        candidate &&
        (current === null || candidate.versionNumber > current.versionNumber)
      ) {
        existing.publishedVersion = candidate;
      }
    }

    summaries.set(version.workflowId, existing);
  }

  return summaries;
}

function toWorkflowListItem(
  workflow: typeof workflows.$inferSelect,
  versionSummaries: VersionSummariesByWorkflowId,
): WorkflowListItem {
  if (!workflow.id || !workflow.createdAt || !workflow.updatedAt) {
    throw new Error("Workflow list row is missing required fields.");
  }

  const summaries = versionSummaries.get(workflow.id) ?? {
    draftVersion: null,
    publishedVersion: null,
  };

  return {
    workflowId: workflow.id,
    name: workflow.name,
    description: workflow.description,
    status: parseWorkflowStatus(workflow.status),
    createdAt: toIsoDateTime(workflow.createdAt),
    updatedAt: toIsoDateTime(workflow.updatedAt),
    archivedAt: workflow.archivedAt
      ? toIsoDateTime(workflow.archivedAt)
      : null,
    draftVersion: summaries.draftVersion,
    publishedVersion: summaries.publishedVersion,
  };
}

export async function listWorkflows(
  query: ListWorkflowsQuery,
  pagination: PaginationQuery,
  context: ListWorkflowsContext,
): Promise<ListWorkflowsResult> {
  const db = getDb();
  const workspaceId = requireWorkspaceId(context.workspace);
  const statusFilter = buildWorkflowStatusFilter(query);
  const whereClause = statusFilter
    ? and(eq(workflows.workspaceId, workspaceId), statusFilter)
    : eq(workflows.workspaceId, workspaceId);
  const { offset, limit } = toOffsetLimit(pagination);

  const [countRow] = await db
    .select({ totalCount: count() })
    .from(workflows)
    .where(whereClause);

  const totalCount = countRow?.totalCount ?? 0;
  const paginationMeta = buildPaginationMeta(pagination, totalCount);

  if (totalCount === 0) {
    return {
      items: [],
      pagination: paginationMeta,
    };
  }

  const workflowRows = await db
    .select()
    .from(workflows)
    .where(whereClause)
    .orderBy(desc(workflows.updatedAt))
    .limit(limit)
    .offset(offset);

  const workflowIds = workflowRows
    .map((workflow) => workflow.id)
    .filter((workflowId): workflowId is string => Boolean(workflowId));

  const versionRows =
    workflowIds.length === 0
      ? []
      : await db
          .select({
            id: workflowVersions.id,
            workflowId: workflowVersions.workflowId,
            versionNumber: workflowVersions.versionNumber,
            state: workflowVersions.state,
            updatedAt: workflowVersions.updatedAt,
            publishedAt: workflowVersions.publishedAt,
          })
          .from(workflowVersions)
          .where(
            and(
              inArray(workflowVersions.workflowId, workflowIds),
              or(
                eq(workflowVersions.state, "draft"),
                eq(workflowVersions.state, "published"),
              ),
            ),
          );

  const versionSummaries = buildVersionSummariesByWorkflowId(versionRows);

  return {
    items: workflowRows.map((workflow) =>
      toWorkflowListItem(workflow, versionSummaries),
    ),
    pagination: paginationMeta,
  };
}
