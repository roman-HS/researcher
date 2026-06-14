"use client";

import { useState, useTransition } from "react";
import {
  ArchiveIcon,
  CopyIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { EmptyState } from "@/components/app/empty-state";
import { ArchiveWorkflowDialog } from "@/components/app/workflows/archive-workflow-dialog";
import { CreateWorkflowDialog } from "@/components/app/workflows/create-workflow-dialog";
import { WorkflowVersionBadges } from "@/components/app/workflows/workflow-version-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { workflowStatusLabels } from "@/contracts/workflows/lifecycle";
import type { WorkflowListItem } from "@/contracts/workflows/responses";
import { useServerSyncedList } from "@/hooks/use-server-synced-list";
import { formatDateTime } from "@/lib/format/datetime";
import { duplicateWorkflowAction } from "@/modules/workflows/actions";

type WorkflowsListProps = {
  items: WorkflowListItem[];
};

type CreateWorkflowButtonProps = {
  onClick: () => void;
};

function CreateWorkflowButton({ onClick }: CreateWorkflowButtonProps) {
  return (
    <Button type="button" onClick={onClick}>
      <PlusIcon data-icon="inline-start" />
      Create workflow
    </Button>
  );
}

export function WorkflowsList({ items: serverItems }: WorkflowsListProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<WorkflowListItem | null>(
    null,
  );
  const [duplicatingWorkflowId, setDuplicatingWorkflowId] = useState<
    string | null
  >(null);
  const [isDuplicatePending, startDuplicateTransition] = useTransition();
  const { items, removeItem } = useServerSyncedList(
    serverItems,
    (workflow) => workflow.workflowId,
  );

  function handleDuplicate(workflow: WorkflowListItem) {
    setDuplicatingWorkflowId(workflow.workflowId);

    startDuplicateTransition(async () => {
      const result = await duplicateWorkflowAction(workflow.workflowId);

      setDuplicatingWorkflowId(null);

      if (!result.ok) {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <CreateWorkflowDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      <ArchiveWorkflowDialog
        workflow={archiveTarget}
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveTarget(null);
          }
        }}
        onArchived={removeItem}
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Build and manage your real-estate investment workflows.
            </p>
          </div>
          <CreateWorkflowButton onClick={() => setCreateDialogOpen(true)} />
        </div>

        {items.length === 0 ? (
          <EmptyState
            title="No workflows yet"
            description="Create your first workflow to start composing analyses from the tool catalog."
            action={
              <CreateWorkflowButton onClick={() => setCreateDialogOpen(true)} />
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Versions</TableHead>
                <TableHead className="hidden sm:table-cell">Updated</TableHead>
                <TableHead className="w-[1%]">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((workflow) => {
                const isDuplicating =
                  duplicatingWorkflowId === workflow.workflowId &&
                  isDuplicatePending;

                return (
                <TableRow
                  key={workflow.workflowId}
                  aria-busy={isDuplicating}
                >
                  <TableCell className="max-w-48 font-medium">
                    <span className="line-clamp-2">{workflow.name}</span>
                  </TableCell>
                  <TableCell className="hidden max-w-xs whitespace-normal text-muted-foreground md:table-cell">
                    {workflow.description ? (
                      <span className="line-clamp-2">{workflow.description}</span>
                    ) : (
                      <span className="text-muted-foreground/70">No description</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="whitespace-nowrap">
                      {workflowStatusLabels[workflow.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <WorkflowVersionBadges
                      draftVersion={workflow.draftVersion}
                      publishedVersion={workflow.publishedVersion}
                    />
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {formatDateTime(workflow.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        disabled={isDuplicating}
                      >
                        <Link href={`/workflows/${workflow.workflowId}`}>
                          <PencilIcon data-icon="inline-start" />
                          Edit
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={isDuplicating}
                            aria-label={`More actions for ${workflow.name}`}
                          >
                            <MoreHorizontalIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            disabled={isDuplicating}
                            onSelect={() => handleDuplicate(workflow)}
                          >
                            <CopyIcon />
                            {isDuplicating ? "Duplicating…" : "Duplicate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={isDuplicating}
                            onSelect={() => setArchiveTarget(workflow)}
                          >
                            <ArchiveIcon />
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}
