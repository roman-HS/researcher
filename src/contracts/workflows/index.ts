/**
 * Workflow contracts: `/api/v1/workflows` I/O and workflow-internal shapes.
 *
 * @see Naming and import rules in `src/contracts/index.ts`
 */

export {
  workflowStatusLabels,
  workflowStatusSchema,
  workflowStatuses,
  workflowVersionStateLabels,
  workflowVersionStateSchema,
  workflowVersionStates,
  type WorkflowStatus,
  type WorkflowVersionState,
} from "./lifecycle";
export {
  WORKFLOW_DEFINITION_VERSION,
  createEmptyWorkflowDefinition,
  parseWorkflowDefinition,
  workflowBooleanRuntimeInputSchema,
  workflowConstBindingSchema,
  workflowDefinitionSchema,
  workflowEdgeSchema,
  workflowInputBindingSchema,
  workflowNodeIdSchema,
  workflowNodePositionSchema,
  workflowNumberRuntimeInputSchema,
  workflowParameterBindingSchema,
  workflowRuntimeInputKeySchema,
  workflowRuntimeInputSchema,
  workflowSelectOptionSchema,
  workflowSelectRuntimeInputSchema,
  workflowStepConfigSchema,
  workflowStepConfigValueSchema,
  workflowTextRuntimeInputSchema,
  workflowToolNodeSchema,
  workflowTriggerSchema,
  type WorkflowDefinition,
  type WorkflowEdge,
  type WorkflowNodeId,
  type WorkflowNodePosition,
  type WorkflowParameterBinding,
  type WorkflowRuntimeInput,
  type WorkflowRuntimeInputKey,
  type WorkflowStepConfig,
  type WorkflowToolNode,
  type WorkflowTrigger,
} from "./internal";
export type { WorkflowId, WorkflowVersionId } from "@/contracts/domain";
