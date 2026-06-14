"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  addEdge,
  applyEdgeChanges,
  Background,
  BackgroundVariant,
  type Connection,
  type EdgeChange,
  type OnNodeDrag,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { workflowToolNodeTypes } from "@/components/app/workflows/workflow-tool-node";
import type { WorkflowBuilderToolMetadata } from "@/lib/workflows/builder-tool-metadata";
import { isValidWorkflowConnection } from "@/lib/workflows/graph-connection";
import type { WorkflowNodeValidationStatus } from "@/lib/workflows/node-validation-status";
import {
  flowToWorkflowDefinition,
  workflowDefinitionToFlow,
  type WorkflowFlowEdge,
  type WorkflowFlowNode,
} from "@/lib/workflows/react-flow";
import { useWorkflowBuilderStore } from "@/stores/workflow-builder-store";

type WorkflowBuilderCanvasProps = {
  toolMetadataByKey: Record<string, WorkflowBuilderToolMetadata>;
  nodeValidationStatusByNodeId: Record<string, WorkflowNodeValidationStatus>;
};

export function WorkflowBuilderCanvas({
  toolMetadataByKey,
  nodeValidationStatusByNodeId,
}: WorkflowBuilderCanvasProps) {
  const definition = useWorkflowBuilderStore((state) => state.definition);
  const setDefinition = useWorkflowBuilderStore((state) => state.setDefinition);

  const flowOptions = useMemo(
    () => ({
      toolMetadataByKey,
      nodeValidationStatusByNodeId,
    }),
    [nodeValidationStatusByNodeId, toolMetadataByKey],
  );

  const derivedFlow = useMemo(
    () => workflowDefinitionToFlow(definition, flowOptions),
    [definition, flowOptions],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowFlowNode>(
    derivedFlow.nodes,
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowFlowEdge>(
    derivedFlow.edges,
  );

  useEffect(() => {
    setNodes(derivedFlow.nodes);
    setEdges(derivedFlow.edges);
  }, [derivedFlow.edges, derivedFlow.nodes, setEdges, setNodes]);

  const commitGraph = useCallback(
    (
      nextNodes: WorkflowFlowNode[],
      nextEdges: WorkflowFlowEdge[],
      baseDefinition: typeof definition,
    ) => {
      setDefinition(
        flowToWorkflowDefinition(nextNodes, nextEdges, baseDefinition),
      );
    },
    [setDefinition],
  );

  const handleNodeDragStop = useCallback<OnNodeDrag<WorkflowFlowNode>>(
    (_event, node) => {
      const nextNodes = nodes.map((currentNode) =>
        currentNode.id === node.id
          ? { ...currentNode, position: node.position }
          : currentNode,
      );

      commitGraph(nextNodes, edges, definition);
    },
    [commitGraph, definition, edges, nodes],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<WorkflowFlowEdge>[]) => {
      onEdgesChange(changes);

      if (!changes.some((change) => change.type === "remove")) {
        return;
      }

      const nextEdges = applyEdgeChanges(changes, edges);
      commitGraph(nodes, nextEdges, definition);
    },
    [commitGraph, definition, edges, nodes, onEdgesChange],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!isValidWorkflowConnection(connection, definition)) {
        return;
      }

      const nextEdges = addEdge(
        {
          ...connection,
          id: `${connection.source}->${connection.target}`,
        },
        edges,
      );

      commitGraph(nodes, nextEdges, definition);
    },
    [commitGraph, definition, edges, nodes],
  );

  const handleIsValidConnection = useCallback(
    (connection: Connection | WorkflowFlowEdge) =>
      isValidWorkflowConnection(connection, definition),
    [definition],
  );

  const handleBeforeDelete = useCallback(
    async ({
      nodes: nodesToDelete,
      edges: edgesToDelete,
    }: {
      nodes: WorkflowFlowNode[];
      edges: WorkflowFlowEdge[];
    }) => {
      if (nodesToDelete.length > 0) {
        return false;
      }

      if (edgesToDelete.length === 0) {
        return false;
      }

      const removedEdgeIds = new Set(
        edgesToDelete.map((edge) => edge.id).filter(Boolean),
      );
      const nextEdges = edges.filter(
        (edge) => edge.id && !removedEdgeIds.has(edge.id),
      );

      commitGraph(nodes, nextEdges, definition);
      return false;
    },
    [commitGraph, definition, edges, nodes],
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={workflowToolNodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={handleNodeDragStop}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        isValidConnection={handleIsValidConnection}
        onBeforeDelete={handleBeforeDelete}
        nodesDraggable
        nodesConnectable
        edgesReconnectable={false}
        elementsSelectable
        nodesFocusable
        edgesFocusable
        selectNodesOnDrag={false}
        multiSelectionKeyCode={null}
        deleteKeyCode={["Backspace", "Delete"]}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} />
      </ReactFlow>
    </div>
  );
}
