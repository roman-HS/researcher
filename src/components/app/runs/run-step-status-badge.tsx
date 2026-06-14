import { Badge } from "@/components/ui/badge";
import {
  workflowRunStepStatusLabels,
  type WorkflowRunStepStatus,
} from "@/contracts/runs/lifecycle";
import { cn } from "@/lib/utils";

/**
 * @see Story 8.2.3 — Build run step timeline
 */

type RunStepStatusBadgeProps = {
  status: WorkflowRunStepStatus;
  className?: string;
};

function getStatusVariant(
  status: WorkflowRunStepStatus,
): "destructive" | "outline" | "secondary" {
  switch (status) {
    case "failed":
      return "destructive";
    case "skipped":
      return "secondary";
    default:
      return "outline";
  }
}

export function RunStepStatusBadge({
  status,
  className,
}: RunStepStatusBadgeProps) {
  return (
    <Badge
      variant={getStatusVariant(status)}
      className={cn(
        "whitespace-nowrap",
        status === "running" &&
          "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400",
        status === "pending" && "text-muted-foreground",
        status === "skipped" && "text-muted-foreground",
        className,
      )}
    >
      {workflowRunStepStatusLabels[status]}
    </Badge>
  );
}
