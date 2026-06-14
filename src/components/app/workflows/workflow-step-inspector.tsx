"use client";

import { ArrowLeftIcon, MousePointerClickIcon } from "lucide-react";
import { useEffect, useMemo } from "react";

import { WorkflowToolConfigInspectorShell } from "@/components/app/workflows/workflow-tool-config-inspector-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { WorkflowBuilderToolMetadata } from "@/lib/workflows/builder-tool-metadata";
import {
  formatArtefactList,
  toolCategoryAccentClasses,
} from "@/lib/workflows/tool-display";
import { ToolIcon } from "@/lib/workflows/tool-icons";
import { useWorkflowBuilderStore } from "@/stores/workflow-builder-store";
import { cn } from "@/lib/utils";

/**
 * Inspector for the selected workflow step.
 *
 * @see Story 5.3.3 — Build selected-step inspector shell
 */

type WorkflowStepInspectorProps = {
  toolMetadataByKey: Record<string, WorkflowBuilderToolMetadata>;
};

export function WorkflowStepInspectorEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 ring-1 ring-foreground/5">
        <MousePointerClickIcon className="size-5 text-muted-foreground" />
      </div>
      <p className="mt-4 text-sm font-medium text-foreground">
        Select a step to inspect
      </p>
      <p className="mt-1.5 max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
        Click a step on the canvas to edit its label, notes, and tool settings.
      </p>
    </div>
  );
}

export function WorkflowStepInspector({
  toolMetadataByKey,
}: WorkflowStepInspectorProps) {
  const selectedNodeId = useWorkflowBuilderStore((state) => state.selectedNodeId);
  const definition = useWorkflowBuilderStore((state) => state.definition);
  const setSelectedNodeId = useWorkflowBuilderStore(
    (state) => state.setSelectedNodeId,
  );
  const updateWorkflowNode = useWorkflowBuilderStore(
    (state) => state.updateWorkflowNode,
  );

  const selectedNode = useMemo(
    () => definition.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [definition.nodes, selectedNodeId],
  );

  useEffect(() => {
    if (selectedNodeId && !selectedNode) {
      setSelectedNodeId(null);
    }
  }, [selectedNode, selectedNodeId, setSelectedNodeId]);

  if (!selectedNodeId || !selectedNode) {
    return <WorkflowStepInspectorEmptyState />;
  }

  const toolMetadata = toolMetadataByKey[selectedNode.toolKey] ?? null;
  const accentClass = toolMetadata
    ? toolCategoryAccentClasses[toolMetadata.categoryKey]
    : "bg-muted text-muted-foreground";
  const fallbackTitle = toolMetadata?.name ?? selectedNode.toolKey;

  const ioHint =
    toolMetadata && toolMetadata.accepts.length > 0
      ? `Requires ${formatArtefactList(toolMetadata.accepts)}`
      : toolMetadata && toolMetadata.produces.length > 0
        ? `Produces ${formatArtefactList(toolMetadata.produces)}`
        : null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/60 px-5 py-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 mb-3 h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          onClick={() => setSelectedNodeId(null)}
        >
          <ArrowLeftIcon className="size-3.5" />
          Add steps
        </Button>

        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              accentClass,
            )}
          >
            {toolMetadata ? (
              <ToolIcon iconKey={toolMetadata.iconKey} className="size-4" />
            ) : null}
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-sm font-semibold tracking-tight">
                {toolMetadata?.name ?? selectedNode.toolKey}
              </h2>
              {toolMetadata ? (
                <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px]">
                  {toolMetadata.categoryLabel}
                </Badge>
              ) : null}
            </div>
            {toolMetadata ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {toolMetadata.description}
              </p>
            ) : null}
            {ioHint ? (
              <p className="text-[11px] font-medium text-muted-foreground/80">
                {ioHint}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-5">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor={`step-title-${selectedNode.id}`}>Step label</Label>
            <Input
              id={`step-title-${selectedNode.id}`}
              value={selectedNode.title}
              onChange={(event) =>
                updateWorkflowNode(selectedNode.id, {
                  title: event.target.value,
                })
              }
              onBlur={(event) => {
                const trimmed = event.target.value.trim();

                if (trimmed.length === 0) {
                  updateWorkflowNode(selectedNode.id, { title: fallbackTitle });
                }
              }}
              placeholder={fallbackTitle}
            />
            <p className="text-[11px] text-muted-foreground">
              Shown on the canvas. Defaults to the tool name.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`step-notes-${selectedNode.id}`}>
              Notes{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id={`step-notes-${selectedNode.id}`}
              value={selectedNode.notes ?? ""}
              onChange={(event) =>
                updateWorkflowNode(selectedNode.id, {
                  notes: event.target.value,
                })
              }
              placeholder="Add context for yourself or collaborators…"
              rows={3}
            />
          </div>

          <Separator />

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">
                Configuration
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Tool-specific settings for this step.
              </p>
            </div>

            {toolMetadata ? (
              <WorkflowToolConfigInspectorShell
                nodeId={selectedNode.id}
                inspectorComponentKey={toolMetadata.inspectorComponentKey}
              />
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
