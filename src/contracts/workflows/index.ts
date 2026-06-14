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
export type { WorkflowId, WorkflowVersionId } from "@/contracts/domain";
