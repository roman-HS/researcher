import Link from "next/link";
import { notFound } from "next/navigation";

import { WorkflowBuilderCanvas } from "@/components/app/workflows/workflow-builder-canvas";
import NonEditableDraft from "@/components/app/workflows/non-editable-draft";
import { Button } from "@/components/ui/button";
import { domainEntityIdSchema } from "@/contracts/domain/primitives";
import { isAppError } from "@/lib/api/errors";
import { buildToolMetadataByKey } from "@/lib/workflows/builder-tool-metadata";
import { buildNodeValidationStatusByNodeId } from "@/lib/workflows/node-validation-status";
import { listToolsForDiscovery } from "@/modules/tools";
import {
  getWorkflow,
  validateWorkflowDefinition,
} from "@/modules/workflows";
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
  const draftValidation = validateWorkflowDefinition(draftDefinition, "draft");
  const toolMetadataByKey = buildToolMetadataByKey(listToolsForDiscovery());
  const nodeValidationStatusByNodeId = buildNodeValidationStatusByNodeId([
    ...draftValidation.errors,
    ...draftValidation.warnings,
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-3 md:px-6">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">
            {workflow.name}
          </h1>
          {workflow.description ? (
            <p className="truncate text-sm text-muted-foreground">
              {workflow.description}
            </p>
          ) : null}
        </div>
        <Button asChild variant="outline">
          <Link href="/workflows">Back to workflows</Link>
        </Button>
      </div>
      <div className="relative min-h-0 flex-1">
        <WorkflowBuilderCanvas
          definition={draftDefinition}
          toolMetadataByKey={toolMetadataByKey}
          nodeValidationStatusByNodeId={nodeValidationStatusByNodeId}
        />
      </div>
    </div>
  );
}
