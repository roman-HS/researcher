"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { WorkflowDefinition } from "@/contracts/workflows/internal";
import type { WorkflowDefinitionValidationIssue } from "@/contracts/workflows/validation";
import type { WorkflowPublishEligibility } from "@/lib/workflows/validation-display";
import type { PublishWorkflowActionResult } from "@/modules/workflows/actions";
import { publishWorkflowAction } from "@/modules/workflows/actions";
import { useWorkflowBuilderStore } from "@/stores/workflow-builder-store";

/**
 * Publish control for the workflow builder header.
 *
 * @see Story 5.4.3 — Implement publish workflow UI
 */

type WorkflowBuilderPublishButtonProps = {
  workflowId: string;
  eligibility: WorkflowPublishEligibility;
  warnings: readonly WorkflowDefinitionValidationIssue[];
  isDirty: boolean;
  isSaving: boolean;
  onPublishValidationErrors: (
    errors: readonly WorkflowDefinitionValidationIssue[],
    definitionAtFailure: WorkflowDefinition,
  ) => void;
  onPublishSuccess: (result: Extract<PublishWorkflowActionResult, { ok: true }>) => void;
};

function formatPublishedAt(isoDateTime: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoDateTime));
}

export function WorkflowBuilderPublishButton({
  workflowId,
  eligibility,
  warnings,
  isDirty,
  isSaving,
  onPublishValidationErrors,
  onPublishSuccess,
}: WorkflowBuilderPublishButtonProps) {
  const definition = useWorkflowBuilderStore((state) => state.definition);
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isPublishing = isPending;
  const isBlocked = eligibility === "blocked";
  const disabled =
    isDirty || isSaving || isPublishing || isBlocked;

  const disabledReason = isDirty
    ? "Save draft before publishing."
    : isSaving
      ? "Wait for the draft save to finish."
      : isPublishing
        ? "Publishing in progress."
        : isBlocked
          ? "Fix publish-blocking validation errors first."
          : null;

  function runPublish() {
    const definitionAtAttempt = definition;

    startTransition(async () => {
      const result = await publishWorkflowAction(workflowId);

      if (!result.ok) {
        if (result.validationErrors && result.validationErrors.length > 0) {
          onPublishValidationErrors(result.validationErrors, definitionAtAttempt);
        }

        toast.error(result.error);
        return;
      }

      onPublishValidationErrors([], definitionAtAttempt);
      onPublishSuccess(result);
      toast.success(
        `Published v${result.publishedVersionNumber} · ${formatPublishedAt(result.publishedAt)}`,
      );
    });
  }

  function handleClick() {
    if (disabled) {
      return;
    }

    if (eligibility === "warnings") {
      setConfirmOpen(true);
      return;
    }

    runPublish();
  }

  function handleConfirmPublish() {
    setConfirmOpen(false);
    runPublish();
  }

  const button = (
    <Button
      type="button"
      variant="default"
      disabled={disabled}
      onClick={handleClick}
    >
      {isPublishing ? "Publishing…" : "Publish"}
    </Button>
  );

  return (
    <>
      {disabledReason ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">{button}</span>
          </TooltipTrigger>
          <TooltipContent>{disabledReason}</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish with warnings?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  This workflow can be published, but the following warnings
                  should be reviewed:
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  {warnings.map((warning) => (
                    <li key={`${warning.code}-${warning.message}`}>
                      {warning.message}
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPublishing}>Cancel</AlertDialogCancel>
            <Button
              disabled={isPublishing}
              onClick={handleConfirmPublish}
            >
              {isPublishing ? "Publishing…" : "Publish anyway"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
