"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { WorkflowBuilderCanvas } from "@/components/app/workflows/workflow-builder-canvas";
import { WorkflowBuilderSidebar } from "@/components/app/workflows/workflow-builder-sidebar";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ListToolsResponse } from "@/contracts/tools/responses";
import type { WorkflowDefinition } from "@/contracts/workflows/internal";
import { buildToolMetadataByKey } from "@/lib/workflows/builder-tool-metadata";
import type { WorkflowNodeValidationStatus } from "@/lib/workflows/node-validation-status";
import {
  WorkflowBuilderStoreProvider,
  useWorkflowBuilderStore,
} from "@/stores/workflow-builder-store";

type WorkflowBuilderProps = {
  workflowName: string;
  workflowDescription: string | null;
  initialDefinition: WorkflowDefinition;
  initialToolCatalog: ListToolsResponse;
  nodeValidationStatusByNodeId: Record<string, WorkflowNodeValidationStatus>;
};

function WorkflowBuilderBackButton() {
  const isDirty = useWorkflowBuilderStore((state) => state.isDirty);
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();

  if (!isDirty) {
    return (
      <Button asChild variant="outline">
        <Link href="/workflows">Back to workflows</Link>
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setDialogOpen(true)}
      >
        Back to workflows
      </Button>
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this workflow. If you leave now, those
              edits will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay on builder</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => router.push("/workflows")}
            >
              Leave without saving
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function WorkflowBuilderShell({
  workflowName,
  workflowDescription,
  initialToolCatalog,
  nodeValidationStatusByNodeId,
}: Omit<WorkflowBuilderProps, "initialDefinition">) {
  const isDirty = useWorkflowBuilderStore((state) => state.isDirty);
  const toolMetadataByKey = useMemo(
    () => buildToolMetadataByKey(initialToolCatalog),
    [initialToolCatalog],
  );

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-3 md:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="truncate text-lg font-semibold tracking-tight">
              {workflowName}
            </h1>
            {isDirty ? (
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Unsaved changes
              </span>
            ) : null}
          </div>
          {workflowDescription ? (
            <p className="truncate text-sm text-muted-foreground">
              {workflowDescription}
            </p>
          ) : null}
        </div>
        <WorkflowBuilderBackButton />
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="relative h-full min-h-0 min-w-0 flex-1 overflow-hidden">
          <WorkflowBuilderCanvas
            toolMetadataByKey={toolMetadataByKey}
            nodeValidationStatusByNodeId={nodeValidationStatusByNodeId}
          />
        </div>
        <WorkflowBuilderSidebar
          toolCatalog={initialToolCatalog}
          toolMetadataByKey={toolMetadataByKey}
        />
      </div>
    </div>
  );
}

export function WorkflowBuilder({
  workflowName,
  workflowDescription,
  initialDefinition,
  initialToolCatalog,
  nodeValidationStatusByNodeId,
}: WorkflowBuilderProps) {
  return (
    <WorkflowBuilderStoreProvider initialDefinition={initialDefinition}>
      <WorkflowBuilderShell
        workflowName={workflowName}
        workflowDescription={workflowDescription}
        initialToolCatalog={initialToolCatalog}
        nodeValidationStatusByNodeId={nodeValidationStatusByNodeId}
      />
    </WorkflowBuilderStoreProvider>
  );
}
