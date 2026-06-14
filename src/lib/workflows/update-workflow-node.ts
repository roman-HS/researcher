import type {
  WorkflowDefinition,
  WorkflowToolNode,
} from "@/contracts/workflows/internal";

/**
 * Patch common workflow node fields in a definition.
 *
 * @see Story 5.3.3 — Build selected-step inspector shell
 */

export type WorkflowNodeCommonPatch = Partial<
  Pick<WorkflowToolNode, "title" | "notes" | "config">
>;

export function updateWorkflowNodeInDefinition(
  definition: WorkflowDefinition,
  nodeId: string,
  patch: WorkflowNodeCommonPatch,
): WorkflowDefinition {
  let found = false;

  const nodes = definition.nodes.map((node) => {
    if (node.id !== nodeId) {
      return node;
    }

    found = true;

    const nextNode: WorkflowToolNode = {
      ...node,
      ...patch,
    };

    if (patch.notes !== undefined) {
      const trimmedNotes = patch.notes.trim();
      nextNode.notes = trimmedNotes.length > 0 ? trimmedNotes : undefined;
    }

    return nextNode;
  });

  if (!found) {
    return definition;
  }

  return {
    ...definition,
    nodes,
  };
}
