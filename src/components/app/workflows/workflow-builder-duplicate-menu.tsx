"use client";

import { useState, useTransition } from "react";
import { CopyIcon, MoreHorizontalIcon } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { duplicateWorkflowAction } from "@/modules/workflows/actions";
import { useWorkflowBuilderStore } from "@/stores/workflow-builder-store";

/**
 * Duplicate control for the workflow builder header overflow menu.
 *
 * @see Story 5.4.4 — Add builder duplicate action
 */

type WorkflowBuilderDuplicateMenuProps = {
  workflowId: string;
  workflowName: string;
  isSaving: boolean;
};

export function WorkflowBuilderDuplicateMenu({
  workflowId,
  workflowName,
  isSaving,
}: WorkflowBuilderDuplicateMenuProps) {
  const isDirty = useWorkflowBuilderStore((state) => state.isDirty);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDuplicatePending, startDuplicateTransition] = useTransition();

  const isDuplicating = isDuplicatePending;
  const disabled = isSaving || isDuplicating;

  function runDuplicate() {
    startDuplicateTransition(async () => {
      const result = await duplicateWorkflowAction(workflowId);

      if (!result.ok) {
        toast.error(result.error);
      }
    });
  }

  function handleDuplicateSelect() {
    if (disabled) {
      return;
    }

    if (isDirty) {
      setConfirmOpen(true);
      return;
    }

    runDuplicate();
  }

  function handleDuplicateAnyway() {
    setConfirmOpen(false);
    runDuplicate();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            aria-label={`More actions for ${workflowName}`}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={disabled} onSelect={handleDuplicateSelect}>
            <CopyIcon />
            {isDuplicating ? "Duplicating…" : "Duplicate"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              The duplicate will use the last saved version of this workflow.
              Unsaved edits will not appear in the copy, and leaving this page
              will discard them on the original workflow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay on builder</AlertDialogCancel>
            <Button
              type="button"
              disabled={disabled}
              onClick={handleDuplicateAnyway}
            >
              {isDuplicating ? "Duplicating…" : "Duplicate anyway"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
