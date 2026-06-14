"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { WorkflowDefinition } from "@/contracts/workflows/internal";
import type { WorkflowDefinitionValidationIssue } from "@/contracts/workflows/validation";
import { validateWorkflowDefinition } from "@/lib/workflows/validate-definition";
import { updateWorkflowDraftAction } from "@/modules/workflows/actions";
import { useWorkflowBuilderStore } from "@/stores/workflow-builder-store";

const SAVED_FEEDBACK_MS = 2000;

/**
 * Explicit save control for the workflow builder header.
 *
 * @see Story 5.4.2 — Implement save draft button
 */

type WorkflowBuilderSaveDraftButtonProps = {
  workflowId: string;
  onSaveValidationErrors: (
    errors: readonly WorkflowDefinitionValidationIssue[],
    definitionAtFailure: WorkflowDefinition,
  ) => void;
};

export function WorkflowBuilderSaveDraftButton({
  workflowId,
  onSaveValidationErrors,
}: WorkflowBuilderSaveDraftButtonProps) {
  const definition = useWorkflowBuilderStore((state) => state.definition);
  const isDirty = useWorkflowBuilderStore((state) => state.isDirty);
  const commitDefinition = useWorkflowBuilderStore(
    (state) => state.commitDefinition,
  );
  const [isPending, startTransition] = useTransition();
  const [showSaved, setShowSaved] = useState(false);
  const savedTimeoutRef = useRef<number | null>(null);

  const isDraftSaveable = useMemo(
    () => validateWorkflowDefinition(definition, "draft").valid,
    [definition],
  );

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current !== null) {
        window.clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  function handleSave() {
    if (!isDirty || isPending || !isDraftSaveable) {
      return;
    }

    const definitionToSave = definition;

    startTransition(async () => {
      const result = await updateWorkflowDraftAction(
        workflowId,
        definitionToSave,
      );

      if (!result.ok) {
        if (result.validationErrors && result.validationErrors.length > 0) {
          onSaveValidationErrors(result.validationErrors, definitionToSave);
        }

        toast.error(result.error);
        return;
      }

      commitDefinition(definitionToSave);
      onSaveValidationErrors([], definitionToSave);
      setShowSaved(true);

      if (savedTimeoutRef.current !== null) {
        window.clearTimeout(savedTimeoutRef.current);
      }

      savedTimeoutRef.current = window.setTimeout(() => {
        setShowSaved(false);
        savedTimeoutRef.current = null;
      }, SAVED_FEEDBACK_MS);
    });
  }

  const label = isPending ? "Saving…" : showSaved ? "Saved" : "Save draft";
  const disabled = !isDirty || isPending || !isDraftSaveable;

  return (
    <Button type="button" disabled={disabled} onClick={handleSave}>
      {label}
    </Button>
  );
}
