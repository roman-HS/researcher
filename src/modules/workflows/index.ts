export const WORKFLOWS_MODULE_ROOT = "workflows" as const;

export {
  WorkflowDefinitionValidationError,
  WorkflowLifecycleError,
  isWorkflowDefinitionValidationError,
  isWorkflowLifecycleError,
  type WorkflowLifecycleErrorCode,
} from "./errors";
export {
  findWorkflowGraphValidationIssues,
  validateWorkflowGraph,
  type WorkflowToolGraphIssue,
  type WorkflowToolGraphIssueCode,
} from "./graph-validation";
export {
  assertWorkflowDefinitionValid,
  validateWorkflowDefinition,
} from "./validate-definition";
export {
  assertVersionCanPublish,
  assertVersionStateTransition,
  assertWorkflowAllowsMutation,
  assertWorkflowAllowsRun,
  assertWorkflowStatusTransition,
  buildNewDraftVersionAfterPublish,
  createArchiveDraftVersionPatch,
  createArchiveWorkflowPatch,
  createPublishVersionPatch,
  parseWorkflowStatus,
  parseWorkflowVersionState,
  planArchiveWorkflow,
  type ArchiveWorkflowPlan,
  type NewDraftAfterPublishInput,
} from "./lifecycle";
