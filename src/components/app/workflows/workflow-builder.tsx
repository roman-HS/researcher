"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { WorkflowBuilderCanvas } from "@/components/app/workflows/workflow-builder-canvas";
import { WorkflowBuilderActionsMenu } from "@/components/app/workflows/workflow-builder-actions-menu";
import { WorkflowBuilderPublishButton } from "@/components/app/workflows/workflow-builder-publish-button";
import { WorkflowRunButton } from "@/components/app/workflows/workflow-run-button";
import { WorkflowBuilderSaveDraftButton } from "@/components/app/workflows/workflow-builder-save-draft-button";
import { WorkflowBuilderSidebar } from "@/components/app/workflows/workflow-builder-sidebar";
import { WorkflowBuilderValidationPanel } from "@/components/app/workflows/workflow-builder-validation-panel";
import { WorkflowBuilderValidationStatus } from "@/components/app/workflows/workflow-builder-validation-status";
import { WorkflowVersionBadges } from "@/components/app/workflows/workflow-version-badges";
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
import type {
  WorkflowDraftVersionSummary,
  WorkflowPublishedVersionSummary,
} from "@/contracts/workflows/responses";
import type { WorkflowDefinitionValidationIssue } from "@/contracts/workflows/validation";
import { buildToolMetadataByKey } from "@/lib/workflows/builder-tool-metadata";
import { definitionsEqual } from "@/lib/workflows/definition-equality";
import { useWorkflowBuilderValidation } from "@/lib/workflows/use-workflow-builder-validation";
import type { PublishWorkflowActionResult } from "@/modules/workflows/actions";
import {
  WorkflowBuilderStoreProvider,
  useWorkflowBuilderStore,
} from "@/stores/workflow-builder-store";

type WorkflowBuilderProps = {
  workflowId: string;
  workflowName: string;
  workflowDescription: string | null;
  initialDefinition: WorkflowDefinition;
  initialDraftVersion: WorkflowDraftVersionSummary;
  initialPublishedVersion: WorkflowPublishedVersionSummary | null;
  initialToolCatalog: ListToolsResponse;
};

type BuilderVersionState = {
  draftVersionId: string;
  draftVersion: WorkflowDraftVersionSummary;
  publishedVersion: WorkflowPublishedVersionSummary | null;
  definition: WorkflowDefinition;
};

type ServerValidationErrorState = {
  definitionAtFailure: WorkflowDefinition;
  errors: WorkflowDefinitionValidationIssue[];
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

function useServerValidationErrors(
  definition: WorkflowDefinition,
  validationState: ServerValidationErrorState | null,
) {
  return useMemo(() => {
    if (
      !validationState ||
      !definitionsEqual(definition, validationState.definitionAtFailure)
    ) {
      return [];
    }

    return validationState.errors;
  }, [definition, validationState]);
}

function WorkflowBuilderShell({
  workflowId,
  workflowName,
  workflowDescription,
  initialToolCatalog,
  versionState,
  onPublishSuccess,
}: Omit<WorkflowBuilderProps, "initialDefinition" | "initialDraftVersion" | "initialPublishedVersion"> & {
  versionState: BuilderVersionState;
  onPublishSuccess: (
    result: Extract<PublishWorkflowActionResult, { ok: true }>,
  ) => void;
}) {
  const definition = useWorkflowBuilderStore((state) => state.definition);
  const isDirty = useWorkflowBuilderStore((state) => state.isDirty);
  const { validation, nodeValidationStatusByNodeId, eligibility } =
    useWorkflowBuilderValidation();
  const [isSaving, setIsSaving] = useState(false);
  const [saveValidationState, setSaveValidationState] =
    useState<ServerValidationErrorState | null>(null);
  const [publishValidationState, setPublishValidationState] =
    useState<ServerValidationErrorState | null>(null);
  const toolMetadataByKey = useMemo(
    () => buildToolMetadataByKey(initialToolCatalog),
    [initialToolCatalog],
  );

  const saveValidationErrors = useServerValidationErrors(
    definition,
    saveValidationState,
  );
  const publishValidationErrors = useServerValidationErrors(
    definition,
    publishValidationState,
  );

  function handleSaveValidationErrors(
    errors: readonly WorkflowDefinitionValidationIssue[],
    definitionAtFailure: WorkflowDefinition,
  ) {
    if (errors.length === 0) {
      setSaveValidationState(null);
      return;
    }

    setSaveValidationState({
      definitionAtFailure,
      errors: [...errors],
    });
  }

  function handlePublishValidationErrors(
    errors: readonly WorkflowDefinitionValidationIssue[],
    definitionAtFailure: WorkflowDefinition,
  ) {
    if (errors.length === 0) {
      setPublishValidationState(null);
      return;
    }

    setPublishValidationState({
      definitionAtFailure,
      errors: [...errors],
    });
  }

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
            <WorkflowVersionBadges
              draftVersion={versionState.draftVersion}
              publishedVersion={versionState.publishedVersion}
            />
            {isDirty ? (
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Unsaved changes
              </span>
            ) : null}
            <WorkflowBuilderValidationStatus
              eligibility={eligibility}
              errorCount={validation.errors.length}
              warningCount={validation.warnings.length}
            />
          </div>
          {workflowDescription ? (
            <p className="truncate text-sm text-muted-foreground">
              {workflowDescription}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <WorkflowBuilderSaveDraftButton
            workflowId={workflowId}
            onPendingChange={setIsSaving}
            onSaveValidationErrors={handleSaveValidationErrors}
          />
          <WorkflowBuilderPublishButton
            workflowId={workflowId}
            eligibility={eligibility}
            warnings={validation.warnings}
            isDirty={isDirty}
            isSaving={isSaving}
            onPublishValidationErrors={handlePublishValidationErrors}
            onPublishSuccess={onPublishSuccess}
          />
          <WorkflowRunButton
            workflowId={workflowId}
            publishedVersionNumber={
              versionState.publishedVersion?.versionNumber ?? null
            }
            hasUnsavedDraftChanges={isDirty}
          />
          <WorkflowBuilderActionsMenu
            workflowId={workflowId}
            workflowName={workflowName}
            isSaving={isSaving}
          />
          <WorkflowBuilderBackButton />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <WorkflowBuilderCanvas
              toolMetadataByKey={toolMetadataByKey}
              nodeValidationStatusByNodeId={nodeValidationStatusByNodeId}
            />
          </div>
          <WorkflowBuilderValidationPanel
            validation={validation}
            saveErrors={saveValidationErrors}
            publishErrors={publishValidationErrors}
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
  workflowId,
  workflowName,
  workflowDescription,
  initialDefinition,
  initialDraftVersion,
  initialPublishedVersion,
  initialToolCatalog,
}: WorkflowBuilderProps) {
  const [versionState, setVersionState] = useState<BuilderVersionState>({
    draftVersionId: initialDraftVersion.versionId,
    draftVersion: initialDraftVersion,
    publishedVersion: initialPublishedVersion,
    definition: initialDefinition,
  });

  function handlePublishSuccess(
    result: Extract<PublishWorkflowActionResult, { ok: true }>,
  ) {
    setVersionState({
      draftVersionId: result.draftVersionId,
      draftVersion: result.draftVersion,
      publishedVersion: result.publishedVersion,
      definition: result.draftDefinition,
    });
  }

  return (
    <WorkflowBuilderStoreProvider
      key={`${workflowId}:${versionState.draftVersionId}`}
      initialDefinition={versionState.definition}
    >
      <WorkflowBuilderShell
        workflowId={workflowId}
        workflowName={workflowName}
        workflowDescription={workflowDescription}
        initialToolCatalog={initialToolCatalog}
        versionState={versionState}
        onPublishSuccess={handlePublishSuccess}
      />
    </WorkflowBuilderStoreProvider>
  );
}
