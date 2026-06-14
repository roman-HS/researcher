"use client";

import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { workflowToolNodeTypes } from "@/components/app/workflows/workflow-tool-node";
import type { WorkflowBuilderToolMetadata } from "@/lib/workflows/builder-tool-metadata";
import type { WorkflowNodeValidationStatus } from "@/lib/workflows/node-validation-status";
import type { WorkflowDefinition } from "@/contracts/workflows/internal";
import { workflowDefinitionToFlow } from "@/lib/workflows/react-flow";

type WorkflowBuilderCanvasProps = {
  definition: WorkflowDefinition;
  toolMetadataByKey: Record<string, WorkflowBuilderToolMetadata>;
  nodeValidationStatusByNodeId: Record<string, WorkflowNodeValidationStatus>;
};

export function WorkflowBuilderCanvas({
  definition,
  toolMetadataByKey,
  nodeValidationStatusByNodeId,
}: WorkflowBuilderCanvasProps) {
  const { nodes, edges } = useMemo(
    () =>
      workflowDefinitionToFlow(definition, {
        toolMetadataByKey,
        nodeValidationStatusByNodeId,
      }),
    [definition, nodeValidationStatusByNodeId, toolMetadataByKey],
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={workflowToolNodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesReconnectable={false}
        elementsSelectable
        nodesFocusable
        edgesFocusable={false}
        selectNodesOnDrag={false}
        multiSelectionKeyCode={null}
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
