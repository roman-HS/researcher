export const WORKFLOWS_MODULE_ROOT = "workflows" as const;

export {
  WorkflowLifecycleError,
  isWorkflowLifecycleError,
  type WorkflowLifecycleErrorCode,
} from "./errors";
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
