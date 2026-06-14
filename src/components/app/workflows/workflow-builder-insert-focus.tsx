"use client";

import { useEffect } from "react";
import { useReactFlow } from "@xyflow/react";

import { useWorkflowBuilderStore } from "@/stores/workflow-builder-store";

/** Matches `w-52` on workflow tool nodes. */
const WORKFLOW_TOOL_NODE_WIDTH = 208;
const WORKFLOW_TOOL_NODE_HEIGHT = 100;

/**
 * Pans the canvas to a newly inserted node without changing zoom.
 *
 * @see Story 5.3.2 — Implement step insertion behavior
 */
export function WorkflowBuilderInsertFocus() {
  const pendingFocusNodeId = useWorkflowBuilderStore(
    (state) => state.pendingFocusNodeId,
  );
  const clearPendingFocusNodeId = useWorkflowBuilderStore(
    (state) => state.clearPendingFocusNodeId,
  );
  const { getNode, getZoom, setCenter } = useReactFlow();

  useEffect(() => {
    if (!pendingFocusNodeId) {
      return;
    }

    const nodeId = pendingFocusNodeId;

    const frame = requestAnimationFrame(() => {
      const node = getNode(nodeId);

      if (!node) {
        clearPendingFocusNodeId();
        return;
      }

      const width = node.measured?.width ?? WORKFLOW_TOOL_NODE_WIDTH;
      const height = node.measured?.height ?? WORKFLOW_TOOL_NODE_HEIGHT;

      setCenter(node.position.x + width / 2, node.position.y + height / 2, {
        zoom: getZoom(),
        duration: 200,
      });
      clearPendingFocusNodeId();
    });

    return () => cancelAnimationFrame(frame);
  }, [
    clearPendingFocusNodeId,
    getNode,
    getZoom,
    pendingFocusNodeId,
    setCenter,
  ]);

  return null;
}
