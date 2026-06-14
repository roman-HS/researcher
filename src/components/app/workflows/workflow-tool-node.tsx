"use client";

import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CircleCheckIcon,
} from "lucide-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import { Badge } from "@/components/ui/badge";
import type { WorkflowFlowNode } from "@/lib/workflows/react-flow";
import type { WorkflowNodeValidationStatus } from "@/lib/workflows/node-validation-status";
import { cn } from "@/lib/utils";

const validationStatusLabels: Record<WorkflowNodeValidationStatus, string> = {
  ok: "Valid",
  warning: "Warning",
  error: "Error",
};

function ValidationStatusIndicator({
  status,
}: {
  status: WorkflowNodeValidationStatus;
}) {
  const label = validationStatusLabels[status];

  if (status === "ok") {
    return (
      <CircleCheckIcon
        className="size-4 shrink-0 text-muted-foreground"
        aria-label={label}
      />
    );
  }

  if (status === "warning") {
    return (
      <AlertTriangleIcon
        className="size-4 shrink-0 text-amber-600 dark:text-amber-400"
        aria-label={label}
      />
    );
  }

  return (
    <AlertCircleIcon
      className="size-4 shrink-0 text-destructive"
      aria-label={label}
    />
  );
}

function WorkflowToolNodeComponent({
  data,
  selected,
}: NodeProps<WorkflowFlowNode>) {
  const { workflowNode, toolMetadata, handleRole, validationStatus } = data;
  const toolName = toolMetadata?.name ?? workflowNode.toolKey;
  const showSecondaryToolName = toolName !== workflowNode.title;

  const showTargetHandle =
    handleRole === "terminal" ||
    handleRole === "middle" ||
    handleRole === "disconnected";
  const showSourceHandle =
    handleRole === "root" ||
    handleRole === "middle" ||
    handleRole === "disconnected";

  return (
    <div
      className={cn(
        "min-w-44 max-w-56 rounded-lg border bg-card px-3 py-2 text-card-foreground shadow-sm ring-1 ring-foreground/10 transition-shadow",
        selected && "border-ring ring-2 ring-ring/50",
        validationStatus === "error" && "border-destructive/50",
        validationStatus === "warning" && "border-amber-500/50",
      )}
    >
      {showTargetHandle ? (
        <Handle
          type="target"
          position={Position.Left}
          className="size-2! border-2! border-background! bg-muted-foreground!"
        />
      ) : null}
      {showSourceHandle ? (
        <Handle
          type="source"
          position={Position.Right}
          className="size-2! border-2! border-background! bg-muted-foreground!"
        />
      ) : null}

      <div className="flex items-start gap-2">
        <ValidationStatusIndicator status={validationStatus} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-medium">{workflowNode.title}</p>
          {showSecondaryToolName ? (
            <p className="truncate text-xs text-muted-foreground">{toolName}</p>
          ) : null}
          {toolMetadata ? (
            <Badge variant="outline" className="max-w-full truncate">
              {toolMetadata.categoryLabel}
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const workflowToolNodeTypes = {
  workflowTool: WorkflowToolNodeComponent,
};
