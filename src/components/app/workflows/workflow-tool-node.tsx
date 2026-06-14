"use client";

import {
  AlertCircleIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
} from "lucide-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { ToolArtefactType } from "@/contracts/tools/internal";
import type { WorkflowFlowNode } from "@/lib/workflows/react-flow";
import type { WorkflowNodeValidationStatus } from "@/lib/workflows/node-validation-status";
import {
  formatArtefactList,
  getHandleRoleLabel,
  toolCategoryAccentClasses,
} from "@/lib/workflows/tool-display";
import { ToolIcon } from "@/lib/workflows/tool-icons";
import { cn } from "@/lib/utils";

const validationStatusLabels: Record<WorkflowNodeValidationStatus, string> = {
  ok: "Valid",
  warning: "Needs attention",
  error: "Configuration error",
};

function ValidationStatusBadge({
  status,
}: {
  status: WorkflowNodeValidationStatus;
}) {
  if (status === "ok") {
    return null;
  }

  const label = validationStatusLabels[status];
  const isError = status === "error";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium",
        isError
          ? "bg-destructive/10 text-destructive"
          : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      )}
      aria-label={label}
    >
      {isError ? (
        <AlertCircleIcon className="size-2.5 shrink-0" />
      ) : (
        <AlertTriangleIcon className="size-2.5 shrink-0" />
      )}
      {label}
    </span>
  );
}

function IoSummary({
  accepts,
  produces,
}: {
  accepts: readonly ToolArtefactType[];
  produces: readonly ToolArtefactType[];
}) {
  if (accepts.length === 0 && produces.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
      {accepts.length > 0 ? (
        <span className="rounded bg-muted/80 px-1 py-0.5 font-medium">
          In: {formatArtefactList(accepts)}
        </span>
      ) : (
        <span className="rounded bg-muted/80 px-1 py-0.5 font-medium">
          No input
        </span>
      )}
      {produces.length > 0 ? (
        <>
          <ArrowRightIcon className="size-2.5 shrink-0 text-muted-foreground/60" />
          <span className="rounded bg-muted/80 px-1 py-0.5 font-medium">
            Out: {formatArtefactList(produces)}
          </span>
        </>
      ) : null}
    </div>
  );
}

const handleClassName =
  "size-2! border-2! border-background! bg-foreground/70! transition-transform group-hover:scale-110";

function WorkflowToolNodeComponent({
  data,
  selected,
}: NodeProps<WorkflowFlowNode>) {
  const { workflowNode, toolMetadata, handleRole, validationStatus } = data;
  const toolName = toolMetadata?.name ?? workflowNode.toolKey;
  const roleLabel = getHandleRoleLabel(handleRole);
  const accentClass = toolMetadata
    ? toolCategoryAccentClasses[toolMetadata.categoryKey]
    : "bg-muted text-muted-foreground";

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
        "group w-52 rounded-xl border bg-card text-card-foreground shadow-sm ring-1 ring-foreground/5 transition-all duration-200",
        selected &&
          "border-foreground/20 shadow-md ring-2 ring-ring/30",
        validationStatus === "error" && !selected && "border-destructive/40",
        validationStatus === "warning" && !selected && "border-amber-500/40",
      )}
    >
      {showTargetHandle ? (
        <Handle
          type="target"
          position={Position.Left}
          className={handleClassName}
        />
      ) : null}
      {showSourceHandle ? (
        <Handle
          type="source"
          position={Position.Right}
          className={handleClassName}
        />
      ) : null}

      <div className="space-y-2 p-2.5">
        <div className="flex items-start gap-2">
          <div
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-lg",
              accentClass,
            )}
          >
            {toolMetadata ? (
              <ToolIcon iconKey={toolMetadata.iconKey} className="size-3.5" />
            ) : null}
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="truncate text-[13px] font-semibold leading-snug tracking-tight">
              {workflowNode.title}
            </p>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-muted-foreground">
              {toolMetadata ? (
                <span className="font-medium">{toolMetadata.categoryLabel}</span>
              ) : (
                <span className="font-medium">{toolName}</span>
              )}
              {roleLabel ? (
                <>
                  <span className="text-muted-foreground/40" aria-hidden>
                    ·
                  </span>
                  <span>{roleLabel}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {toolMetadata ? (
          <IoSummary
            accepts={toolMetadata.accepts}
            produces={toolMetadata.produces}
          />
        ) : null}

        <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-1.5">
          <span className="font-mono text-[9px] text-muted-foreground/70">
            {workflowNode.id}
          </span>
          <ValidationStatusBadge status={validationStatus} />
        </div>
      </div>
    </div>
  );
}

export const workflowToolNodeTypes = {
  workflowTool: WorkflowToolNodeComponent,
};
