import Link from "next/link";
import { AlertCircleIcon } from "lucide-react";

import { RunStatusBadge } from "@/components/app/runs/run-status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ToolExecutorRuntimeInputValues } from "@/contracts/runs/executors";
import type { WorkflowRunStatus } from "@/contracts/runs/lifecycle";
import type {
  RunDetailCounts,
  RunDetailUserFacingError,
} from "@/contracts/runs/responses";
import type { WorkflowRuntimeInputs } from "@/contracts/workflows/runtime-inputs";
import { formatDateTime } from "@/lib/format/datetime";
import { buildRuntimeInputSummaryItems } from "@/lib/runs/format-runtime-input-display-value";
import { cn } from "@/lib/utils";

/**
 * @see Story 8.2.2 — Build run detail header
 */

export type RunDetailHeaderProps = {
  status: WorkflowRunStatus;
  workflowId: string;
  workflowName: string;
  workflowVersionNumber: number;
  startedAt: string | null;
  completedAt: string | null;
  runtimeInputs: WorkflowRuntimeInputs;
  inputValues: ToolExecutorRuntimeInputValues;
  error: RunDetailUserFacingError | null;
  counts: RunDetailCounts;
};

function formatNullableDateTime(value: string | null): string {
  return value ? formatDateTime(value) : "—";
}

type RunDetailCountProps = {
  label: string;
  value: number;
  emphasize?: boolean;
};

function RunDetailCount({ label, value, emphasize = false }: RunDetailCountProps) {
  return (
    <div className="rounded-lg border px-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-1 text-2xl font-semibold tracking-tight",
          emphasize &&
            "text-amber-700 dark:text-amber-400",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function RunDetailErrorAlert({
  status,
  error,
}: {
  status: WorkflowRunStatus;
  error: RunDetailUserFacingError;
}) {
  if (status === "failed") {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Run failed</AlertTitle>
        <AlertDescription>{error.userMessage}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-100">
      <AlertCircleIcon className="text-amber-700 dark:text-amber-400" />
      <AlertTitle className="text-amber-900 dark:text-amber-100">
        Run finished with issues
      </AlertTitle>
      <AlertDescription className="text-amber-800 dark:text-amber-200/90">
        {error.userMessage}
      </AlertDescription>
    </Alert>
  );
}

export function RunDetailHeader({
  status,
  workflowId,
  workflowName,
  workflowVersionNumber,
  startedAt,
  completedAt,
  runtimeInputs,
  inputValues,
  error,
  counts,
}: RunDetailHeaderProps) {
  const inputSummaryItems = buildRuntimeInputSummaryItems(
    runtimeInputs,
    inputValues,
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        <Link href="/runs" className="hover:text-foreground">
          Runs
        </Link>
        {" / "}
        <Link
          href={`/workflows/${workflowId}`}
          className="hover:text-foreground"
        >
          {workflowName}
        </Link>
      </p>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {workflowName}
          </h1>
          <RunStatusBadge status={status} />
        </div>
        <p className="text-sm text-muted-foreground">
          Published version v{workflowVersionNumber}
        </p>
      </div>

      {error ? <RunDetailErrorAlert status={status} error={error} /> : null}

      <dl className="grid gap-4 sm:grid-cols-3">
        <RunDetailCount label="Properties" value={counts.propertyCount} />
        <RunDetailCount
          label="Failed properties"
          value={counts.failedPropertyCount}
          emphasize={counts.failedPropertyCount > 0}
        />
        <RunDetailCount
          label="Warnings"
          value={counts.warningCount}
          emphasize={counts.warningCount > 0}
        />
      </dl>

      <dl className="grid gap-4 border-t pt-6 sm:grid-cols-2">
        <div>
          <dt className="text-sm font-medium">Started</dt>
          <dd className="mt-1 text-sm text-muted-foreground">
            {formatNullableDateTime(startedAt)}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium">Completed</dt>
          <dd className="mt-1 text-sm text-muted-foreground">
            {formatNullableDateTime(completedAt)}
          </dd>
        </div>
      </dl>

      <section className="space-y-3 border-t pt-6">
        <h2 className="text-sm font-medium">Inputs</h2>
        {inputSummaryItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This workflow has no runtime inputs. The run executed the published
            version as-is.
          </p>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            {inputSummaryItems.map((item) => (
              <div key={item.key}>
                <dt className="text-sm text-muted-foreground">{item.label}</dt>
                <dd className="mt-1 text-sm">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  );
}
