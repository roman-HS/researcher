import { Badge } from "@/components/ui/badge";
import {
  workflowRunStatusLabels,
  type WorkflowRunStatus,
} from "@/contracts/runs/lifecycle";
import { cn } from "@/lib/utils";

/**
 * @see Story 8.2.1 — Build runs list page
 */

type RunStatusBadgeProps = {
  status: WorkflowRunStatus;
  className?: string;
};

function getStatusVariant(
  status: WorkflowRunStatus,
): "destructive" | "outline" | "secondary" {
  switch (status) {
    case "failed":
      return "destructive";
    case "partial":
      return "secondary";
    default:
      return "outline";
  }
}

export function RunStatusBadge({ status, className }: RunStatusBadgeProps) {
  return (
    <Badge
      variant={getStatusVariant(status)}
      className={cn(
        "whitespace-nowrap",
        status === "partial" &&
          "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        className,
      )}
    >
      {workflowRunStatusLabels[status]}
    </Badge>
  );
}
