import { notFound } from "next/navigation";

import { WorkflowBuilder } from "@/components/app/workflows/workflow-builder";
import NonEditableDraft from "@/components/app/workflows/non-editable-draft";
import { domainEntityIdSchema } from "@/contracts/domain/primitives";
import { isAppError } from "@/lib/api/errors";
import { listToolsForDiscovery } from "@/modules/tools";
import { getWorkflow } from "@/modules/workflows";
import { requireCurrentWorkspace } from "@/modules/workspace";

type WorkflowBuilderPageProps = {
  params: Promise<{ workflowId: string }>;
};

export default async function WorkflowBuilderPage({
  params,
}: WorkflowBuilderPageProps) {
  const { workflowId } = await params;
  const parsedWorkflowId = domainEntityIdSchema.safeParse(workflowId);

  if (!parsedWorkflowId.success) {
    notFound();
  }

  let workflow;

  try {
    const workspace = await requireCurrentWorkspace();
    workflow = await getWorkflow(parsedWorkflowId.data, { workspace });
  } catch (error) {
    if (isAppError(error) && error.code === "not_found") {
      notFound();
    }

    throw error;
  }

  if (!workflow.draftVersion) {
    return <NonEditableDraft workflowName={workflow.name} />;
  }

  const draftDefinition = workflow.draftVersion.definition;
  const initialToolCatalog = listToolsForDiscovery();

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <WorkflowBuilder
        key={`${workflow.workflowId}:${workflow.draftVersion.versionId}`}
        workflowId={workflow.workflowId}
        workflowName={workflow.name}
        workflowDescription={workflow.description}
        initialDefinition={draftDefinition}
        initialDraftVersion={{
          versionId: workflow.draftVersion.versionId,
          versionNumber: workflow.draftVersion.versionNumber,
          updatedAt: workflow.draftVersion.updatedAt,
        }}
        initialPublishedVersion={workflow.publishedVersion}
        initialToolCatalog={initialToolCatalog}
      />
    </div>
  );
}
