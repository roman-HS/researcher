import Link from "next/link";
import { AlertCircleIcon, AlertTriangleIcon, Loader2Icon } from "lucide-react";

import { RunRerunButton } from "@/components/app/runs/run-rerun-button";
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
import {
  buildPartialRunBannerDescription,
  formatSuccessfulPropertyCountLabel,
  getSuccessfulPropertyCount,
  shouldShowPartialRunBanner,
} from "@/lib/runs/partial-run-visibility";
import { cn } from "@/lib/utils";

/**
 * @see Story 8.2.2 — Build run detail header
 * @see Story 8.2.4 — Add run status polling
 * @see Story 8.3.5 — Add partial and failed item visibility
 * @see Story 8.4.1 — Add rerun with same inputs
 */

export type RunDetailPollState = "refreshing" | "error" | null;

export type RunDetailHeaderProps = {
  runId: string;
  status: WorkflowRunStatus;
  workflowId: string;
  workflowName: string;
  workflowVersionNumber: number;
  sourceRunId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  runtimeInputs: WorkflowRuntimeInputs;
  inputValues: ToolExecutorRuntimeInputValues;
  error: RunDetailUserFacingError | null;
  counts: RunDetailCounts;
  pollState?: RunDetailPollState;
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

function RunDetailPollIndicator({
  pollState,
}: {
  pollState: RunDetailPollState;
}) {
  if (pollState === "refreshing") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2Icon className="size-3.5 animate-spin" />
        Updating…
      </span>
    );
  }

  if (pollState === "error") {
    return (
      <span className="text-xs text-amber-700 dark:text-amber-400">
        Update failed — retrying
      </span>
    );
  }

  return null;
}

export function RunDetailHeader({
  runId,
  status,
  workflowId,
  workflowName,
  workflowVersionNumber,
  sourceRunId,
  startedAt,
  completedAt,
  runtimeInputs,
  inputValues,
  error,
  counts,
  pollState = null,
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
          <RunDetailPollIndicator pollState={pollState} />
        </div>
        <p className="text-sm text-muted-foreground">
          Published version v{workflowVersionNumber}
        </p>
        {sourceRunId ? (
          <p className="text-sm text-muted-foreground">
            Rerun of{" "}
            <Link href={`/runs/${sourceRunId}`} className="hover:text-foreground">
              previous run
            </Link>
          </p>
        ) : null}
      </div>

      <RunRerunButton
        runId={runId}
        workflowId={workflowId}
        status={status}
        inputValues={inputValues}
      />

      {shouldShowPartialRunBanner(status) ? (
        <Alert className="border-amber-500/40 bg-amber-500/5">
          <AlertTriangleIcon className="text-amber-800 dark:text-amber-300" />
          <AlertTitle className="text-amber-900 dark:text-amber-200">
            Partial run
          </AlertTitle>
          <AlertDescription className="text-amber-950 dark:text-amber-100">
            {buildPartialRunBannerDescription(counts)}
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? <RunDetailErrorAlert status={status} error={error} /> : null}

      <dl className="grid gap-4 sm:grid-cols-3">
        <RunDetailCount
          label={formatSuccessfulPropertyCountLabel(counts)}
          value={getSuccessfulPropertyCount(counts)}
        />
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
