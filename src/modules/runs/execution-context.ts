/**
 * Run execution context helpers for the runs module boundary.
 *
 * @see Story 7.2.5 — Implement execution context service
 */

export {
  applyWorkingSetPatch,
  buildToolExecutorRunContext,
  createWorkflowExecutionContext,
  deserializeWorkflowExecutionContext,
  getCurrentExecutionStep,
  parseWorkflowExecutionContext,
  recordProviderCalls,
  resetStepUsageCounters,
  serializeWorkflowExecutionContext,
  withCurrentStepIndex,
  withExecutionRunStatus,
  workflowExecutionContextSchema,
  workflowExecutionRunFrameSchema,
  workflowExecutionStateSchema,
  workflowExecutionUsageSchema,
  type CreateWorkflowExecutionContextInput,
  type WorkflowExecutionContext,
  type WorkflowExecutionRunFrame,
  type WorkflowExecutionState,
  type WorkflowExecutionUsage,
} from "@/contracts/runs/execution-context";

export {
  createDefaultExecutionLimits,
  DEFAULT_EXECUTION_LIMITS,
  executionLimitsSchema,
  parseExecutionLimits,
  type ExecutionLimits,
} from "@/contracts/runs/execution-limits";
