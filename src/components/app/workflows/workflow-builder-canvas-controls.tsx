"use client";

import {
  Maximize2Icon,
  Trash2Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import { Panel, useReactFlow } from "@xyflow/react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const FIT_VIEW_OPTIONS = { padding: 0.2 };

type WorkflowBuilderCanvasControlsProps = {
  hasSelectedNode: boolean;
  onDeleteSelected: () => void;
};

export function WorkflowBuilderCanvasControls({
  hasSelectedNode,
  onDeleteSelected,
}: WorkflowBuilderCanvasControlsProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <Panel
      position="bottom-left"
      className="flex items-center gap-1 rounded-lg border bg-background/90 p-1 shadow-sm backdrop-blur-sm"
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Zoom in"
              onClick={() => zoomIn()}
            >
              <ZoomInIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom in</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Zoom out"
              onClick={() => zoomOut()}
            >
              <ZoomOutIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom out</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Fit to view"
              onClick={() => fitView(FIT_VIEW_OPTIONS)}
            >
              <Maximize2Icon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit to view</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              aria-label="Delete selected step"
              disabled={!hasSelectedNode}
              onClick={onDeleteSelected}
            >
              <Trash2Icon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete selected step</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </Panel>
  );
}
