import type { WorkflowSummary } from "@/contracts/domain/analysis";
import { listingSearchToolKey } from "@/contracts/providers/zillow/listing-search";
import type { ToolExecutorItemError } from "@/contracts/runs/executors";
import type {
  ExecutionWorkingSet,
  ExecutionWorkingSetPatch,
} from "@/contracts/runs/working-set";
import type { WorkflowCompiledPlanStep } from "@/contracts/workflows/compiled-plan";

import type { RunStepOutputSnapshot } from "./step-output-snapshot";

/**
 * Run-level partial-result criteria and summary annotation.
 *
 * @see Story 7.4.4 — Add partial-result handling
 */

export type RunPartialResultStats = {
  itemErrorCount: number;
  stepsWithItemErrors: number;
};

export class RunPartialResultTracker {
  private itemErrorCount = 0;
  private stepsWithItemErrors = 0;

  recordSucceededStep(
    step: WorkflowCompiledPlanStep,
    itemErrors: readonly ToolExecutorItemError[],
  ): void {
    if (isRootAcquisitionStep(step) || itemErrors.length === 0) {
      return;
    }

    this.itemErrorCount += itemErrors.length;
    this.stepsWithItemErrors += 1;
  }

  shouldMarkRunPartial(): boolean {
    return this.itemErrorCount > 0;
  }

  getStats(): RunPartialResultStats {
    return {
      itemErrorCount: this.itemErrorCount,
      stepsWithItemErrors: this.stepsWithItemErrors,
    };
  }
}

export function isRootAcquisitionStep(step: WorkflowCompiledPlanStep): boolean {
  return step.toolKey === listingSearchToolKey;
}

export function buildPartialDataQualitySummaryNote(
  stats: RunPartialResultStats,
): string {
  const errorLabel =
    stats.itemErrorCount === 1 ? "property-level error" : "property-level errors";
  const stepLabel =
    stats.stepsWithItemErrors === 1 ? "step" : "steps";

  return `This run finished with partial data: ${stats.itemErrorCount} ${errorLabel} across ${stats.stepsWithItemErrors} ${stepLabel}.`;
}

const PARTIAL_RESULT_WARNING_NOTE =
  "Some property enrichments failed; results may be incomplete." as const;

export function annotateSummaryForPartialResult(
  summary: WorkflowSummary,
  stats: RunPartialResultStats,
): WorkflowSummary {
  const note = buildPartialDataQualitySummaryNote(stats);

  return {
    ...summary,
    missingDataNotes: summary.missingDataNotes.includes(note)
      ? summary.missingDataNotes
      : [...summary.missingDataNotes, note],
    warnings: summary.warnings.includes(PARTIAL_RESULT_WARNING_NOTE)
      ? summary.warnings
      : [...summary.warnings, PARTIAL_RESULT_WARNING_NOTE],
  };
}

export function buildPartialSummaryWorkingSetPatch(
  workingSet: ExecutionWorkingSet,
  stats: RunPartialResultStats,
): ExecutionWorkingSetPatch | null {
  if (!workingSet.summary) {
    return null;
  }

  return {
    summary: annotateSummaryForPartialResult(workingSet.summary, stats),
  };
}

export function amendStepOutputSnapshotForPartialResult(
  outputJson: RunStepOutputSnapshot,
  stats: RunPartialResultStats,
): RunStepOutputSnapshot | null {
  const summary = outputJson.workingSetPatch?.summary;

  if (!summary) {
    return null;
  }

  return {
    ...outputJson,
    workingSetPatch: {
      ...outputJson.workingSetPatch,
      summary: annotateSummaryForPartialResult(summary, stats),
    },
  };
}
