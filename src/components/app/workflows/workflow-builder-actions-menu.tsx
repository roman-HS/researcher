"use client";

import { useState, useTransition } from "react";
import { ArchiveIcon, CopyIcon, MoreHorizontalIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ArchiveWorkflowDialog } from "@/components/app/workflows/archive-workflow-dialog";
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
 * Lifecycle actions for the workflow builder header overflow menu.
 *
 * @see Story 5.4.4 — Add builder duplicate action
 * @see Story 5.4.5 — Add builder archive action
 */

type WorkflowBuilderActionsMenuProps = {
  workflowId: string;
  workflowName: string;
  isSaving: boolean;
};

export function WorkflowBuilderActionsMenu({
  workflowId,
  workflowName,
  isSaving,
}: WorkflowBuilderActionsMenuProps) {
  const router = useRouter();
  const isDirty = useWorkflowBuilderStore((state) => state.isDirty);
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDuplicatePending, startDuplicateTransition] = useTransition();

  const isDuplicating = isDuplicatePending;
  const disabled = isSaving || isDuplicating || isArchiving;

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
      setDuplicateConfirmOpen(true);
      return;
    }

    runDuplicate();
  }

  function handleDuplicateAnyway() {
    setDuplicateConfirmOpen(false);
    runDuplicate();
  }

  function handleArchiveSelect() {
    if (disabled) {
      return;
    }

    setArchiveDialogOpen(true);
  }

  function handleArchived() {
    router.push("/workflows");
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
          <DropdownMenuItem
            variant="destructive"
            disabled={disabled}
            onSelect={handleArchiveSelect}
          >
            <ArchiveIcon />
            {isArchiving ? "Archiving…" : "Archive"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={duplicateConfirmOpen} onOpenChange={setDuplicateConfirmOpen}>
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

      <ArchiveWorkflowDialog
        workflow={{ workflowId, name: workflowName }}
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        hasUnsavedChanges={isDirty}
        onPendingChange={setIsArchiving}
        onArchived={handleArchived}
      />
    </>
  );
}
