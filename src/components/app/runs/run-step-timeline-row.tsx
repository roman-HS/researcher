"use client";

import {
  AlertCircleIcon,
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { useState } from "react";

import { RunStepStatusBadge } from "@/components/app/runs/run-step-status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ToolExecutorWarning } from "@/contracts/runs/executors";
import type { RunDetailStepTimelineItem } from "@/contracts/runs/responses";
import { formatDateTime } from "@/lib/format/datetime";
import { formatDurationMs } from "@/lib/format/duration";
import { cn } from "@/lib/utils";

/**
 * @see Story 8.2.3 — Build run step timeline
 */

type RunStepTimelineRowProps = {
  step: RunDetailStepTimelineItem;
  stepNumber: number;
};

function formatNullableDateTime(value: string | null): string {
  return value ? formatDateTime(value) : "—";
}

function formatJsonValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "No data";
  }

  return JSON.stringify(value, null, 2);
}

function StepWarningItem({ warning }: { warning: ToolExecutorWarning }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block leading-snug">{warning.message}</span>
        <span className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-amber-500/40 text-[10px] font-normal text-amber-700 dark:text-amber-300"
          >
            {warning.code}
          </Badge>
          {warning.propertyKey ? (
            <span className="text-xs text-muted-foreground">
              Property {warning.propertyKey}
            </span>
          ) : null}
        </span>
      </span>
    </li>
  );
}

function JsonDetailSection({
  title,
  value,
}: {
  title: string;
  value: unknown;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <pre className="max-h-80 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap wrap-break-word">
        {formatJsonValue(value)}
      </pre>
    </div>
  );
}

export function RunStepTimelineRow({
  step,
  stepNumber,
}: RunStepTimelineRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <article
      className={cn(
        "rounded-lg border px-4 py-4",
        step.status === "skipped" && "opacity-70",
        step.status === "failed" && "border-destructive/30",
        step.warnings.length > 0 &&
          step.status !== "failed" &&
          "border-amber-500/30",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Step {stepNumber}
            </span>
            <RunStepStatusBadge status={step.status} />
          </div>
          <h3 className="text-base font-medium leading-snug">{step.stepTitle}</h3>
          <p className="font-mono text-xs text-muted-foreground">{step.toolKey}</p>
          {step.outputSummary?.propertyCount !== undefined ? (
            <p className="text-sm text-muted-foreground">
              {step.outputSummary.propertyCount}{" "}
              {step.outputSummary.propertyCount === 1 ? "property" : "properties"}
            </p>
          ) : null}
        </div>

        <dl className="grid shrink-0 gap-2 text-right text-sm sm:grid-cols-3 sm:gap-4">
          <div>
            <dt className="text-xs text-muted-foreground">Started</dt>
            <dd className="mt-0.5">{formatNullableDateTime(step.startedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Completed</dt>
            <dd className="mt-0.5">{formatNullableDateTime(step.completedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Duration</dt>
            <dd className="mt-0.5">{formatDurationMs(step.durationMs)}</dd>
          </div>
        </dl>
      </div>

      {step.error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertCircleIcon />
          <AlertDescription>{step.error.userMessage}</AlertDescription>
        </Alert>
      ) : null}

      {step.warnings.length > 0 ? (
        <ul className="mt-4 space-y-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
          {step.warnings.map((warning, index) => (
            <StepWarningItem
              key={`${warning.code}-${warning.propertyKey ?? "global"}-${index}`}
              warning={warning}
            />
          ))}
        </ul>
      ) : null}

      <div className="mt-4 border-t pt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-muted-foreground"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <ChevronUpIcon className="size-4" />
          ) : (
            <ChevronDownIcon className="size-4" />
          )}
          {isExpanded ? "Hide step details" : "Show step details"}
        </Button>

        {isExpanded ? (
          <div className="mt-3 space-y-4">
            <JsonDetailSection title="Input" value={step.inputJson ?? null} />
            <JsonDetailSection title="Output" value={step.outputJson ?? null} />
            <JsonDetailSection
              title="Error debug"
              value={step.error?.debug ?? null}
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}
