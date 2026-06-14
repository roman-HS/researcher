"use client";

import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
} from "lucide-react";

import type { WorkflowPublishEligibility } from "@/lib/workflows/validation-display";
import { cn } from "@/lib/utils";

/**
 * Global publish eligibility status shown in the builder header.
 *
 * @see Story 5.4.1 — Add builder validation panel
 */

type WorkflowBuilderValidationStatusProps = {
  eligibility: WorkflowPublishEligibility;
  errorCount: number;
  warningCount: number;
};

export function WorkflowBuilderValidationStatus({
  eligibility,
  errorCount,
  warningCount,
}: WorkflowBuilderValidationStatusProps) {
  if (eligibility === "ready") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-sm font-medium",
          "text-emerald-700 dark:text-emerald-400",
        )}
      >
        <CheckCircle2Icon className="size-4 shrink-0" />
        Ready to publish
      </span>
    );
  }

  if (eligibility === "warnings") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-sm font-medium",
          "text-amber-700 dark:text-amber-400",
        )}
      >
        <AlertTriangleIcon className="size-4 shrink-0" />
        Publishable with {warningCount} warning
        {warningCount === 1 ? "" : "s"}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium",
        "text-destructive",
      )}
    >
      <AlertCircleIcon className="size-4 shrink-0" />
      Publish blocked ({errorCount} error{errorCount === 1 ? "" : "s"})
    </span>
  );
}
