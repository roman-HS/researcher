import type {
  ToolExecutorItemError,
  ToolExecutorWarning,
} from "@/contracts/runs/executors";
import type { ExecutionWorkingSetPatch } from "@/contracts/runs/working-set";

/**
 * Compact persisted step output for debugging and run detail views.
 *
 * @see Story 7.4.1 — Implement sequential step dispatcher
 */

export type RunStepOutputSnapshot = {
  workingSetPatch?: ExecutionWorkingSetPatch;
  itemErrors?: ToolExecutorItemError[];
  summary?: {
    propertyCount: number;
  };
};

export type RunStepCompletionSnapshot = {
  outputJson: RunStepOutputSnapshot;
  warningsJson: ToolExecutorWarning[] | null;
};

export function buildRunStepOutputSnapshot(options: {
  workingSetPatch?: ExecutionWorkingSetPatch;
  itemErrors?: ToolExecutorItemError[];
  propertyCount: number;
}): RunStepOutputSnapshot {
  const snapshot: RunStepOutputSnapshot = {
    summary: {
      propertyCount: options.propertyCount,
    },
  };

  if (options.workingSetPatch) {
    snapshot.workingSetPatch = options.workingSetPatch;
  }

  if (options.itemErrors && options.itemErrors.length > 0) {
    snapshot.itemErrors = options.itemErrors;
  }

  return snapshot;
}

export function buildRunStepCompletionSnapshot(options: {
  workingSetPatch?: ExecutionWorkingSetPatch;
  itemErrors?: ToolExecutorItemError[];
  warnings?: ToolExecutorWarning[];
  propertyCount: number;
}): RunStepCompletionSnapshot {
  const warnings =
    options.warnings && options.warnings.length > 0 ? options.warnings : null;

  return {
    outputJson: buildRunStepOutputSnapshot(options),
    warningsJson: warnings,
  };
}
