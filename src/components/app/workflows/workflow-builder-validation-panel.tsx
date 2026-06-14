"use client";

import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WorkflowDefinitionValidationIssue } from "@/contracts/workflows/validation";
import type { WorkflowBuilderValidationState } from "@/lib/workflows/use-workflow-builder-validation";
import {
  getValidationIssueImpactLabel,
  validationIssueKey,
} from "@/lib/workflows/validation-display";
import { useWorkflowBuilderStore } from "@/stores/workflow-builder-store";
import { cn } from "@/lib/utils";

/**
 * Collapsible validation panel docked below the workflow builder canvas.
 *
 * @see Story 5.4.1 — Add builder validation panel
 */

type WorkflowBuilderValidationPanelProps = {
  validation: WorkflowBuilderValidationState["validation"];
};

function ValidationIssueRow({
  issue,
  highlighted,
  onNavigate,
}: {
  issue: WorkflowDefinitionValidationIssue;
  highlighted: boolean;
  onNavigate: (issue: WorkflowDefinitionValidationIssue) => void;
}) {
  const isError = issue.severity === "error";
  const isNavigable = issue.nodeId !== undefined;

  return (
    <li>
      <button
        type="button"
        disabled={!isNavigable}
        onClick={() => onNavigate(issue)}
        className={cn(
          "flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
          isNavigable && "hover:bg-muted/60",
          !isNavigable && "cursor-default",
          highlighted && "bg-muted/80 ring-1 ring-border/80",
        )}
      >
        {isError ? (
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
        ) : (
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        )}
        <span className="min-w-0 flex-1 space-y-1">
          <span className="block leading-snug">{issue.message}</span>
          <span className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-normal",
                isError
                  ? "border-destructive/30 text-destructive"
                  : "border-amber-500/40 text-amber-700 dark:text-amber-300",
              )}
            >
              {getValidationIssueImpactLabel(issue)}
            </Badge>
            {issue.nodeId ? (
              <span className="text-xs text-muted-foreground">
                Step {issue.nodeId}
              </span>
            ) : null}
          </span>
        </span>
      </button>
    </li>
  );
}

function ValidationIssueGroup({
  title,
  issues,
  highlightedIssueKey,
  onNavigate,
}: {
  title: string;
  issues: readonly WorkflowDefinitionValidationIssue[];
  highlightedIssueKey: string | null;
  onNavigate: (issue: WorkflowDefinitionValidationIssue) => void;
}) {
  if (issues.length === 0) {
    return null;
  }

  return (
    <section className="space-y-1">
      <h3 className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <ul className="space-y-0.5">
        {issues.map((issue) => (
          <ValidationIssueRow
            key={validationIssueKey(issue)}
            issue={issue}
            highlighted={highlightedIssueKey === validationIssueKey(issue)}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </section>
  );
}

export function WorkflowBuilderValidationPanel({
  validation,
}: WorkflowBuilderValidationPanelProps) {
  const focusNodeFromValidation = useWorkflowBuilderStore(
    (state) => state.focusNodeFromValidation,
  );
  const issueCount = validation.errors.length + validation.warnings.length;
  const [expanded, setExpanded] = useState(issueCount > 0);
  const [highlightedIssueKey, setHighlightedIssueKey] = useState<string | null>(
    null,
  );

  function handleNavigate(issue: WorkflowDefinitionValidationIssue) {
    setHighlightedIssueKey(validationIssueKey(issue));

    if (issue.nodeId) {
      focusNodeFromValidation(issue.nodeId);
    }
  }

  const summaryLabel =
    issueCount === 0
      ? "No validation issues"
      : [
          validation.errors.length > 0
            ? `${validation.errors.length} error${validation.errors.length === 1 ? "" : "s"}`
            : null,
          validation.warnings.length > 0
            ? `${validation.warnings.length} warning${validation.warnings.length === 1 ? "" : "s"}`
            : null,
        ]
          .filter(Boolean)
          .join(", ");

  return (
    <div className="shrink-0 border-t bg-background/95">
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          {issueCount === 0 ? (
            <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : validation.errors.length > 0 ? (
            <AlertCircleIcon className="size-4 shrink-0 text-destructive" />
          ) : (
            <AlertTriangleIcon className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <span className="truncate font-medium">{summaryLabel}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 gap-1"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          {expanded ? "Hide details" : "Show details"}
          {expanded ? (
            <ChevronDownIcon className="size-4" />
          ) : (
            <ChevronUpIcon className="size-4" />
          )}
        </Button>
      </div>
      {expanded ? (
        <div className="max-h-48 overflow-y-auto border-t pb-2 pt-1">
          {issueCount === 0 ? (
            <p className="px-4 py-2 text-sm text-muted-foreground">
              This workflow passes publish validation. You can publish when you
              are ready to save your latest changes.
            </p>
          ) : (
            <div className="space-y-3">
              <ValidationIssueGroup
                title="Errors"
                issues={validation.errors}
                highlightedIssueKey={highlightedIssueKey}
                onNavigate={handleNavigate}
              />
              <ValidationIssueGroup
                title="Warnings"
                issues={validation.warnings}
                highlightedIssueKey={highlightedIssueKey}
                onNavigate={handleNavigate}
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
