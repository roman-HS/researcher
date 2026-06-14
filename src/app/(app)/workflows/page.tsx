import { WorkflowsList } from "@/components/app/workflows/workflows-list";
import { WorkflowsListError } from "@/components/app/workflows/workflows-list-error";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "@/contracts/api/pagination";
import type { WorkflowListItem } from "@/contracts/workflows/responses";
import { listWorkflows } from "@/modules/workflows";
import { requireCurrentWorkspace } from "@/modules/workspace";

async function loadWorkflows(): Promise<WorkflowListItem[]> {
  const workspace = await requireCurrentWorkspace();

  const result = await listWorkflows(
    { status: "active" },
    { page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE },
    { workspace },
  );

  return result.items;
}

export default async function WorkflowsPage() {
  let items: WorkflowListItem[] | null = null;

  try {
    items = await loadWorkflows();
  } catch {
    return (
      <div className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build and manage your real-estate investment workflows.
          </p>
        </div>
        <WorkflowsListError />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto p-4 md:p-6">
      <WorkflowsList items={items} />
    </div>
  );
}
