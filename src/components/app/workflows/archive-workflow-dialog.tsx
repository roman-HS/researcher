"use client";

import { useTransition } from "react";
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
import type { WorkflowListItem } from "@/contracts/workflows/responses";
import { archiveWorkflowAction } from "@/modules/workflows/actions";

type ArchiveWorkflowDialogProps = {
  workflow: WorkflowListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onArchived: (workflowId: string) => void;
};

export function ArchiveWorkflowDialog({
  workflow,
  open,
  onOpenChange,
  onArchived,
}: ArchiveWorkflowDialogProps) {
  const [isPending, startTransition] = useTransition();

  function handleArchive() {
    if (!workflow) {
      return;
    }

    const workflowId = workflow.workflowId;
    const workflowName = workflow.name;

    startTransition(async () => {
      const result = await archiveWorkflowAction(workflowId);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      onArchived(workflowId);
      onOpenChange(false);
      toast.success(`"${workflowName}" archived`);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive workflow?</AlertDialogTitle>
          <AlertDialogDescription>
            {workflow ? (
              <>
                <span className="font-medium text-foreground">{workflow.name}</span>{" "}
                will be removed from your active workflows. You will no longer be able
                to edit or run it. Published snapshots are kept, and this cannot be
                undone in V1.
              </>
            ) : (
              "This workflow will be removed from your active workflows."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={isPending || !workflow}
            onClick={handleArchive}
          >
            {isPending ? "Archiving…" : "Archive"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
