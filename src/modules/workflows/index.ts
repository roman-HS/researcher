export const WORKFLOWS_MODULE_ROOT = "workflows" as const;

export {
  compileValidatedWorkflowDefinition,
  compileWorkflowDefinition,
} from "./compile-definition";
export {
  loadCompiledPlanForPublishedVersion,
  type PublishedWorkflowVersionSource,
} from "./load-compiled-plan";
export {
  createWorkflow,
  type CreateWorkflowContext,
} from "./create-workflow";
export {
  getWorkflow,
  type GetWorkflowContext,
} from "./get-workflow";
export {
  listWorkflows,
  type ListWorkflowsContext,
  type ListWorkflowsResult,
} from "./list-workflows";
export {
  updateWorkflowDraft,
  type UpdateWorkflowDraftContext,
} from "./update-draft-workflow";
export {
  archiveWorkflow,
  type ArchiveWorkflowContext,
} from "./archive-workflow";
export {
  duplicateWorkflow,
  type DuplicateWorkflowContext,
} from "./duplicate-workflow";
export {
  publishWorkflow,
  type PublishWorkflowContext,
} from "./publish-workflow";
export {
  WorkflowDefinitionValidationError,
  WorkflowLifecycleError,
  invalidWorkflowDefinitionError,
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
