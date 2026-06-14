import type {
  WorkflowStepConfig,
  WorkflowStepConfigValue,
} from "@/contracts/workflows/bindings";

/**
 * Merge or remove keys in a workflow step config object.
 *
 * @see Story 5.3.4 — Build Listing Search inspector form
 */

export function patchWorkflowStepConfig(
  current: WorkflowStepConfig,
  patch: Record<string, WorkflowStepConfigValue | undefined>,
): WorkflowStepConfig {
  const next: WorkflowStepConfig = { ...current };

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      delete next[key];
    } else {
      next[key] = value;
    }
  }

  return next;
}
