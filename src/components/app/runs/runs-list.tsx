"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/app/empty-state";
import { RunStatusBadge } from "@/components/app/runs/run-status-badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RunListItem } from "@/contracts/runs/responses";
import { formatDateTime } from "@/lib/format/datetime";

/**
 * @see Story 8.2.1 — Build runs list page
 */

const ALL_WORKFLOWS_VALUE = "all";

type WorkflowFilterOption = {
  workflowId: string;
  name: string;
};

type RunsListProps = {
  items: RunListItem[];
  workflows: WorkflowFilterOption[];
  selectedWorkflowId: string | null;
};

function formatNullableDateTime(value: string | null): string {
  return value ? formatDateTime(value) : "—";
}

function formatNullableCount(value: number | null): string {
  return value === null ? "—" : String(value);
}

export function RunsList({
  items,
  workflows,
  selectedWorkflowId,
}: RunsListProps) {
  const router = useRouter();
  const [isFilterPending, startFilterTransition] = useTransition();

  function handleWorkflowFilterChange(value: string) {
    startFilterTransition(() => {
      if (value === ALL_WORKFLOWS_VALUE) {
        router.push("/runs");
        return;
      }

      router.push(`/runs?workflowId=${encodeURIComponent(value)}`);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Runs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review recent workflow executions and open run details.
          </p>
        </div>

        {workflows.length > 0 ? (
          <div className="flex w-full flex-col gap-1.5 sm:w-64">
            <label
              htmlFor="runs-workflow-filter"
              className="text-sm font-medium"
            >
              Workflow
            </label>
            <Select
              value={selectedWorkflowId ?? ALL_WORKFLOWS_VALUE}
              onValueChange={handleWorkflowFilterChange}
              disabled={isFilterPending}
            >
              <SelectTrigger id="runs-workflow-filter" className="w-full">
                <SelectValue placeholder="All workflows" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_WORKFLOWS_VALUE}>
                  All workflows
                </SelectItem>
                {workflows.map((workflow) => (
                  <SelectItem
                    key={workflow.workflowId}
                    value={workflow.workflowId}
                  >
                    {workflow.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No runs yet"
          description="Publish a workflow from the Workflows page, then start a run to see execution history here."
          action={
            <Button asChild>
              <Link href="/workflows">Go to workflows</Link>
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workflow</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Started</TableHead>
              <TableHead className="hidden md:table-cell">Completed</TableHead>
              <TableHead className="hidden lg:table-cell text-right">
                Results
              </TableHead>
              <TableHead className="w-[1%]">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((run) => (
              <TableRow key={run.runId}>
                <TableCell className="max-w-48 font-medium">
                  <Link
                    href={`/runs/${run.runId}`}
                    className="line-clamp-2 hover:underline"
                  >
                    {run.workflowName}
                  </Link>
                </TableCell>
                <TableCell>
                  <RunStatusBadge status={run.status} />
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {formatNullableDateTime(run.startedAt)}
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {formatNullableDateTime(run.completedAt)}
                </TableCell>
                <TableCell className="hidden text-right text-muted-foreground lg:table-cell">
                  {formatNullableCount(run.propertyResultCount)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/runs/${run.runId}`}>View</Link>
                    </Button>
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
