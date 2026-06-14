"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  applyEdgeChanges,
  Background,
  BackgroundVariant,
  type Connection,
  type EdgeChange,
  type OnNodeDrag,
  type OnSelectionChangeFunc,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { WorkflowBuilderCanvasControls } from "@/components/app/workflows/workflow-builder-canvas-controls";
import { WorkflowBuilderInsertFocus } from "@/components/app/workflows/workflow-builder-insert-focus";
import { workflowToolNodeTypes } from "@/components/app/workflows/workflow-tool-node";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { WorkflowBuilderToolMetadata } from "@/lib/workflows/builder-tool-metadata";
import { isValidWorkflowConnection } from "@/lib/workflows/graph-connection";
import type { WorkflowNodeValidationStatus } from "@/lib/workflows/node-validation-status";
import {
  flowToWorkflowDefinition,
  removeNodesFromWorkflowDefinition,
  workflowDefinitionToFlow,
  workflowNodeHasIncidentEdges,
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
  const pendingSelectNodeId = useWorkflowBuilderStore(
    (state) => state.pendingSelectNodeId
  );
  const clearPendingSelectNodeId = useWorkflowBuilderStore(
    (state) => state.clearPendingSelectNodeId
  );
  const selectedNodeId = useWorkflowBuilderStore(
    (state) => state.selectedNodeId
  );
  const setSelectedNodeId = useWorkflowBuilderStore(
    (state) => state.setSelectedNodeId
  );

  const [hasSelectedNode, setHasSelectedNode] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<WorkflowFlowNode[] | null>(
    null
  );
  const deleteConfirmationResolverRef = useRef<
    ((confirmed: boolean) => void) | null
  >(null);

  const flowOptions = useMemo(
    () => ({
      toolMetadataByKey,
      nodeValidationStatusByNodeId,
    }),
    [nodeValidationStatusByNodeId, toolMetadataByKey]
  );

  const derivedFlow = useMemo(
    () => workflowDefinitionToFlow(definition, flowOptions),
    [definition, flowOptions]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowFlowNode>(
    derivedFlow.nodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowFlowEdge>(
    derivedFlow.edges
  );

  useEffect(() => {
    if (pendingSelectNodeId) {
      setNodes(
        derivedFlow.nodes.map((node) => ({
          ...node,
          selected: node.id === pendingSelectNodeId,
        }))
      );
      clearPendingSelectNodeId();
    } else {
      setNodes(
        derivedFlow.nodes.map((node) => ({
          ...node,
          selected: selectedNodeId ? node.id === selectedNodeId : false,
        }))
      );
    }

    setEdges(derivedFlow.edges);
  }, [
    clearPendingSelectNodeId,
    derivedFlow.edges,
    derivedFlow.nodes,
    pendingSelectNodeId,
    selectedNodeId,
    setEdges,
    setNodes,
  ]);

  const commitGraph = useCallback(
    (
      nextNodes: WorkflowFlowNode[],
      nextEdges: WorkflowFlowEdge[],
      baseDefinition: typeof definition
    ) => {
      setDefinition(
        flowToWorkflowDefinition(nextNodes, nextEdges, baseDefinition)
      );
    },
    [setDefinition]
  );

  const requestDeleteConfirmation = useCallback(
    (nodesToDelete: WorkflowFlowNode[]) =>
      new Promise<boolean>((resolve) => {
        deleteConfirmationResolverRef.current = resolve;
        setPendingDelete(nodesToDelete);
      }),
    []
  );

  const resolveDeleteConfirmation = useCallback((confirmed: boolean) => {
    deleteConfirmationResolverRef.current?.(confirmed);
    deleteConfirmationResolverRef.current = null;
    setPendingDelete(null);
  }, []);

  const deleteNodes = useCallback(
    async (nodesToDelete: WorkflowFlowNode[]) => {
      if (nodesToDelete.length === 0) {
        return;
      }

      const needsConfirmation = nodesToDelete.some((node) =>
        workflowNodeHasIncidentEdges(node.id, definition)
      );

      if (needsConfirmation) {
        const confirmed = await requestDeleteConfirmation(nodesToDelete);

        if (!confirmed) {
          return;
        }
      }

      const nodeIds = nodesToDelete.map((node) => node.id);

      if (selectedNodeId && nodeIds.includes(selectedNodeId)) {
        setSelectedNodeId(null);
      }

      setDefinition(removeNodesFromWorkflowDefinition(definition, nodeIds));
    },
    [
      definition,
      requestDeleteConfirmation,
      selectedNodeId,
      setDefinition,
      setSelectedNodeId,
    ]
  );

  const handleNodeDragStop = useCallback<OnNodeDrag<WorkflowFlowNode>>(
    (_event, node) => {
      const nextNodes = nodes.map((currentNode) =>
        currentNode.id === node.id
          ? { ...currentNode, position: node.position }
          : currentNode
      );

      commitGraph(nextNodes, edges, definition);
    },
    [commitGraph, definition, edges, nodes]
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
    [commitGraph, definition, edges, nodes, onEdgesChange]
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
        edges
      );

      commitGraph(nodes, nextEdges, definition);
    },
    [commitGraph, definition, edges, nodes]
  );

  const handleIsValidConnection = useCallback(
    (connection: Connection | WorkflowFlowEdge) =>
      isValidWorkflowConnection(connection, definition),
    [definition]
  );

  const handleSelectionChange = useCallback<OnSelectionChangeFunc>(
    ({ nodes: selectedNodes }) => {
      setHasSelectedNode(selectedNodes.length > 0);
      setSelectedNodeId(selectedNodes[0]?.id ?? null);
    },
    [setSelectedNodeId]
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  const handleDeleteSelected = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    void deleteNodes(selectedNodes);
  }, [deleteNodes, nodes]);

  const handleBeforeDelete = useCallback(
    async ({
      nodes: nodesToDelete,
      edges: edgesToDelete,
    }: {
      nodes: WorkflowFlowNode[];
      edges: WorkflowFlowEdge[];
    }) => {
      if (nodesToDelete.length > 0) {
        await deleteNodes(nodesToDelete);
        return false;
      }

      if (edgesToDelete.length === 0) {
        return false;
      }

      const removedEdgeIds = new Set(
        edgesToDelete.map((edge) => edge.id).filter(Boolean)
      );
      const nextEdges = edges.filter(
        (edge) => edge.id && !removedEdgeIds.has(edge.id)
      );

      commitGraph(nodes, nextEdges, definition);
      return false;
    },
    [commitGraph, definition, deleteNodes, edges, nodes]
  );

  const pendingDeleteTitles =
    pendingDelete?.map((node) => node.data.workflowNode.title).join(", ") ?? "";
  const pendingDeleteIsConnected =
    pendingDelete?.some((node) =>
      workflowNodeHasIncidentEdges(node.id, definition)
    ) ?? false;

  const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 0.8 };

  return (
    <div className="h-full w-full overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={workflowToolNodeTypes}
        defaultViewport={DEFAULT_VIEWPORT}
        minZoom={0.35}
        maxZoom={1.5}
        onNodesChange={onNodesChange}
        onNodeDragStop={handleNodeDragStop}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onPaneClick={handlePaneClick}
        onSelectionChange={handleSelectionChange}
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
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={2}
          color="var(--border)"
        />
        <WorkflowBuilderCanvasControls
          hasSelectedNode={hasSelectedNode}
          onDeleteSelected={handleDeleteSelected}
        />
        <WorkflowBuilderInsertFocus />
      </ReactFlow>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            resolveDeleteConfirmation(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workflow step?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteIsConnected ? (
                <>
                  <span className="font-medium text-foreground">
                    {pendingDeleteTitles}
                  </span>{" "}
                  is connected to other steps. Deleting it will remove its
                  connections, and downstream steps may become disconnected
                  until you reconnect the workflow.
                </>
              ) : (
                <>
                  Delete{" "}
                  <span className="font-medium text-foreground">
                    {pendingDeleteTitles}
                  </span>
                  ? This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => resolveDeleteConfirmation(true)}
            >
              Delete step
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
