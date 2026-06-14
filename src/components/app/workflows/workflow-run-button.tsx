"use client";

import { PlayIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Links to the workflow run form when a published version exists.
 *
 * @see Story 8.1.2 — Add run button to workflow screens
 */

const PUBLISH_BEFORE_RUNNING_REASON = "Publish before running.";

type WorkflowRunButtonProps = {
  workflowId: string;
  publishedVersionNumber: number | null;
  hasUnsavedDraftChanges?: boolean;
  size?: "default" | "sm";
  disabled?: boolean;
};

function getTooltipContent(
  publishedVersionNumber: number | null,
  hasUnsavedDraftChanges: boolean,
): string | null {
  if (publishedVersionNumber === null) {
    return PUBLISH_BEFORE_RUNNING_REASON;
  }

  if (hasUnsavedDraftChanges) {
    return `Runs published v${publishedVersionNumber}. Unsaved draft changes are not included.`;
  }

  return null;
}

export function WorkflowRunButton({
  workflowId,
  publishedVersionNumber,
  hasUnsavedDraftChanges = false,
  size = "default",
  disabled = false,
}: WorkflowRunButtonProps) {
  const canRun = publishedVersionNumber !== null;
  const isDisabled = disabled || !canRun;
  const tooltipContent = getTooltipContent(
    publishedVersionNumber,
    hasUnsavedDraftChanges,
  );

  const button = (
    <Button
      asChild={canRun && !disabled}
      type="button"
      variant="outline"
      size={size}
      disabled={isDisabled}
    >
      {canRun && !disabled ? (
        <Link href={`/workflows/${workflowId}/run`}>
          <PlayIcon data-icon="inline-start" />
          Run
        </Link>
      ) : (
        <>
          <PlayIcon data-icon="inline-start" />
          Run
        </>
      )}
    </Button>
  );

  if (!tooltipContent) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{button}</span>
      </TooltipTrigger>
      <TooltipContent>{tooltipContent}</TooltipContent>
    </Tooltip>
  );
}
