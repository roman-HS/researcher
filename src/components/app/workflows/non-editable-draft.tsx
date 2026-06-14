import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";
import { EmptyState } from "../empty-state";

interface Props {
  workflowName: string;
}

function NonEditableDraft({ workflowName }: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-3 md:px-6">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">
            {workflowName}
          </h1>
          <p className="text-sm text-muted-foreground">
            This workflow has no editable draft.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/workflows">Back to workflows</Link>
        </Button>
      </div>
      <EmptyState
        className="flex-1"
        title="No editable draft"
        description="Archived workflows cannot be edited in the builder."
        action={
          <Button asChild variant="outline">
            <Link href="/workflows">Back to workflows</Link>
          </Button>
        }
      />
    </div>
  );
}

export default NonEditableDraft;
