import type { WorkflowRunStatus } from "@/contracts/runs/lifecycle";
import type {
  RunDetailCounts,
  RunDetailPropertyResult,
} from "@/contracts/runs/responses";
import type { ToolExecutorItemError } from "@/contracts/runs/executors";

import { formatPropertyAddressDisplay } from "@/lib/runs/property-results-table";

/**
 * Partial-run and failed-item visibility helpers for the run detail UI.
 *
 * @see Story 8.3.5 — Add partial and failed item visibility
 */

export type FailedPropertyDisplayItem = {
  propertyResultId: string;
  propertyKey: string;
  label: string;
  secondaryLabel: string | null;
  errors: readonly ToolExecutorItemError[];
};

export function getSuccessfulPropertyCount(counts: RunDetailCounts): number {
  return Math.max(counts.propertyCount - counts.failedPropertyCount, 0);
}

export function shouldShowPartialRunBanner(status: WorkflowRunStatus): boolean {
  return status === "partial";
}

export function shouldShowFailedItemsSection(counts: RunDetailCounts): boolean {
  return counts.failedPropertyCount > 0;
}

export function buildPartialRunBannerDescription(counts: RunDetailCounts): string {
  const successfulCount = getSuccessfulPropertyCount(counts);
  const failedCount = counts.failedPropertyCount;
  const totalCount = counts.propertyCount;

  if (totalCount === 0) {
    return "This run finished with partial data. Review the step timeline and summary for details.";
  }

  const propertyLabel = totalCount === 1 ? "property" : "properties";
  const failedLabel = failedCount === 1 ? "property" : "properties";
  const successfulLabel = successfulCount === 1 ? "property" : "properties";

  return `${successfulCount} ${successfulLabel} analyzed successfully and ${failedCount} ${failedLabel} failed out of ${totalCount} ${propertyLabel}. Useful results remain available below.`;
}

export function getFailedPropertyResults(
  propertyResults: readonly RunDetailPropertyResult[],
): RunDetailPropertyResult[] {
  return propertyResults.filter(
    (propertyResult) => propertyResult.errors.length > 0,
  );
}

export function buildFailedPropertyDisplayItems(
  propertyResults: readonly RunDetailPropertyResult[],
): FailedPropertyDisplayItem[] {
  return getFailedPropertyResults(propertyResults).map((propertyResult) => {
    const address = formatPropertyAddressDisplay(
      propertyResult.addressSummary,
      propertyResult.propertyKey,
    );

    return {
      propertyResultId: propertyResult.propertyResultId,
      propertyKey: propertyResult.propertyKey,
      label: address.primary,
      secondaryLabel: address.secondary,
      errors: propertyResult.errors,
    };
  });
}

export function formatFailedPropertyPrimaryError(
  errors: readonly ToolExecutorItemError[],
): string | null {
  return errors[0]?.userMessage ?? null;
}

export function formatSuccessfulPropertyCountLabel(counts: RunDetailCounts): string {
  if (counts.failedPropertyCount > 0) {
    return "Successful";
  }

  return "Properties";
}

export function buildPropertyResultsCompletenessDescription(
  status: WorkflowRunStatus,
  counts: RunDetailCounts,
): string | null {
  if (status === "partial") {
    return `${getSuccessfulPropertyCount(counts)} of ${counts.propertyCount} properties completed successfully. Failed properties are listed separately and can be filtered in the table below.`;
  }

  if (counts.failedPropertyCount > 0) {
    return `${counts.failedPropertyCount} of ${counts.propertyCount} properties failed during analysis. Successful results remain visible in the table below.`;
  }

  return null;
}
