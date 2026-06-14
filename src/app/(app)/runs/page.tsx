import { RunsList } from "@/components/app/runs/runs-list";
import { RunsListError } from "@/components/app/runs/runs-list-error";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "@/contracts/api/pagination";
import { domainEntityIdSchema } from "@/contracts/domain/primitives";
import type { RunListItem } from "@/contracts/runs/responses";
import type { WorkflowListItem } from "@/contracts/workflows/responses";
import { listRuns } from "@/modules/runs";
import { listWorkflows } from "@/modules/workflows";
import { requireCurrentWorkspace } from "@/modules/workspace";

/**
 * @see Story 8.2.1 — Build runs list page
 */

type RunsPageProps = {
  searchParams: Promise<{ workflowId?: string | string[] }>;
};

type RunsPageData = {
  items: RunListItem[];
  workflows: Pick<WorkflowListItem, "workflowId" | "name">[];
  selectedWorkflowId: string | null;
};

function parseWorkflowIdFilter(
  rawWorkflowId: string | string[] | undefined,
): string | undefined {
  const value = Array.isArray(rawWorkflowId) ? rawWorkflowId[0] : rawWorkflowId;

  if (!value) {
    return undefined;
  }

  const parsed = domainEntityIdSchema.safeParse(value);

  return parsed.success ? parsed.data : undefined;
}

async function loadRunsPageData(
  workflowId: string | undefined,
): Promise<RunsPageData> {
  const workspace = await requireCurrentWorkspace();

  const [runsResult, workflowsResult] = await Promise.all([
    listRuns(
      workflowId ? { workflowId } : {},
      { page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE },
      { workspace },
    ),
    listWorkflows(
      { status: "active" },
      { page: DEFAULT_PAGE, pageSize: MAX_PAGE_SIZE },
      { workspace },
    ),
  ]);

  return {
    items: runsResult.items,
    workflows: workflowsResult.items.map((workflow) => ({
      workflowId: workflow.workflowId,
      name: workflow.name,
    })),
    selectedWorkflowId: workflowId ?? null,
  };
}

export default async function RunsPage({ searchParams }: RunsPageProps) {
  const { workflowId: rawWorkflowId } = await searchParams;
  const workflowId = parseWorkflowIdFilter(rawWorkflowId);

  let data: RunsPageData | null = null;

  try {
    data = await loadRunsPageData(workflowId);
  } catch {
    return (
      <div className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Runs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review recent workflow executions and open run details.
          </p>
        </div>
        <RunsListError />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto p-4 md:p-6">
      <RunsList
        items={data.items}
        workflows={data.workflows}
        selectedWorkflowId={data.selectedWorkflowId}
      />
    </div>
  );
}
