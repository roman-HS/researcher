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
  workflowConstBindingSchema,
  workflowDefinitionSchema,
  workflowEdgeSchema,
  workflowInputBindingSchema,
  workflowNodeIdSchema,
  workflowNodePositionSchema,
  workflowParameterBindingSchema,
  workflowStepConfigSchema,
  workflowStepConfigValueSchema,
  workflowToolNodeSchema,
  workflowTriggerSchema,
  type WorkflowDefinition,
  type WorkflowEdge,
  type WorkflowNodeId,
  type WorkflowNodePosition,
  type WorkflowParameterBinding,
  type WorkflowStepConfig,
  type WorkflowToolNode,
  type WorkflowTrigger,
} from "./internal";
export {
  parseWorkflowRuntimeInputs,
  workflowBooleanRuntimeInputSchema,
  workflowNumberRuntimeInputSchema,
  workflowRuntimeInputKeySchema,
  workflowRuntimeInputSchema,
  workflowRuntimeInputsSchema,
  workflowSelectOptionSchema,
  workflowSelectRuntimeInputSchema,
  workflowTextRuntimeInputSchema,
  type WorkflowRuntimeInput,
  type WorkflowRuntimeInputKey,
  type WorkflowRuntimeInputs,
} from "./runtime-inputs";
export type { WorkflowId, WorkflowVersionId } from "@/contracts/domain";
