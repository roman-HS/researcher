"use client";

import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { WorkflowDefinition } from "@/contracts/workflows/internal";
import { workflowDefinitionToFlow } from "@/lib/workflows/react-flow";

type WorkflowBuilderCanvasProps = {
  definition: WorkflowDefinition;
};

export function WorkflowBuilderCanvas({
  definition,
}: WorkflowBuilderCanvasProps) {
  const { nodes, edges } = useMemo(
    () => workflowDefinitionToFlow(definition),
    [definition],
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesReconnectable={false}
        elementsSelectable={false}
        connectOnClick={false}
        deleteKeyCode={null}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} />
      </ReactFlow>
    </div>
  );
}
