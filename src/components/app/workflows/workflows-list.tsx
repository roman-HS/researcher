"use client";

import {
  ArchiveIcon,
  CopyIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/app/empty-state";
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
import { formatDateTime } from "@/lib/format/datetime";

type WorkflowsListProps = {
  items: WorkflowListItem[];
};

function CreateWorkflowButton() {
  return (
    <Button type="button">
      <PlusIcon data-icon="inline-start" />
      Create workflow
    </Button>
  );
}

export function WorkflowsList({ items }: WorkflowsListProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build and manage your real-estate investment workflows.
          </p>
        </div>
        <CreateWorkflowButton />
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No workflows yet"
          description="Create your first workflow to start composing analyses from the tool catalog."
          action={<CreateWorkflowButton />}
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
            {items.map((workflow) => (
              <TableRow key={workflow.workflowId}>
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
                    <Button asChild variant="outline" size="sm">
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
                          aria-label={`More actions for ${workflow.name}`}
                        >
                          <MoreHorizontalIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled>
                          <CopyIcon />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled variant="destructive">
                          <ArchiveIcon />
                          Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
