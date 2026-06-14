import "server-only";

/**
 * In-process workflow run execution entry point.
 *
 * Wired to the sequential step dispatcher in Story 7.4.1.
 *
 * @see Story 7.3.1 — Define ExecutionTransport interface
 */
export async function enqueueWorkflowRunExecution(_runId: string): Promise<void> {
  // Stub until Story 7.4.1 — Implement sequential step dispatcher.
}
