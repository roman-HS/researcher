import "server-only";

import { executeWorkflowRun } from "../execute-workflow-run";

/**
 * In-process workflow run execution entry point.
 *
 * @see Story 7.4.1 — Implement sequential step dispatcher
 * @see Story 7.3.1 — Define ExecutionTransport interface
 */
export async function enqueueWorkflowRunExecution(runId: string): Promise<void> {
  try {
    await executeWorkflowRun(runId);
  } catch (error) {
    console.error("Workflow run execution failed unexpectedly.", {
      runId,
      error,
    });
  }
}
