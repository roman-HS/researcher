import type { MetricValue } from "@/contracts/domain/analysis";
import type { RunDetailPropertyResult } from "@/contracts/runs/responses";

/**
 * Sorting, filtering, and display helpers for the run property results table.
 *
 * @see Story 8.3.1 — Build property results table
 */

export type PropertyResultSortKey =
  | "score"
  | "listPrice"
  | "estimatedRent"
  | "capRate"
  | "monthlyCashFlow";

export type PropertyResultSortDirection = "asc" | "desc";

export type PropertyResultFilter = "all" | "warnings" | "failed";

export const DEFAULT_PROPERTY_RESULT_SORT = {
  key: "score",
  direction: "desc",
} as const satisfies {
  key: PropertyResultSortKey;
  direction: PropertyResultSortDirection;
};

export type PropertyAddressDisplay = {
  primary: string;
  secondary: string | null;
};

export function formatPropertyAddressDisplay(
  addressSummary: RunDetailPropertyResult["addressSummary"],
  propertyKey: string,
): PropertyAddressDisplay {
  if (!addressSummary?.line1) {
    return {
      primary: propertyKey,
      secondary: null,
    };
  }

  const localityParts = [
    addressSummary.city,
    [addressSummary.state, addressSummary.postalCode]
      .filter(Boolean)
      .join(" ")
      .trim() || null,
  ].filter((part): part is string => Boolean(part));

  return {
    primary: addressSummary.line1,
    secondary:
      localityParts.length > 0 ? localityParts.join(", ") : null,
  };
}

export function getAvailableMetricValue(
  metric: MetricValue | undefined,
): number | null {
  if (!metric || metric.status !== "available") {
    return null;
  }

  return metric.value;
}

export function getEstimatedMonthlyRent(
  propertyResult: RunDetailPropertyResult,
): number | null {
  return getAvailableMetricValue(
    propertyResult.metrics?.estimatedMonthlyIncome,
  );
}

export type PropertyResultFilterCounts = Record<PropertyResultFilter, number>;

export function getPropertyResultFilterCounts(
  propertyResults: readonly RunDetailPropertyResult[],
): PropertyResultFilterCounts {
  return {
    all: propertyResults.length,
    warnings: propertyResults.filter(
      (propertyResult) => propertyResult.warnings.length > 0,
    ).length,
    failed: propertyResults.filter(
      (propertyResult) => propertyResult.errors.length > 0,
    ).length,
  };
}

export function formatPropertyResultFilterLabel(
  filter: PropertyResultFilter,
  counts: PropertyResultFilterCounts,
): string {
  switch (filter) {
    case "all":
      return counts.all === 1
        ? "All properties (1)"
        : `All properties (${counts.all})`;
    case "warnings":
      return counts.warnings === 1
        ? "Has warnings (1)"
        : `Has warnings (${counts.warnings})`;
    case "failed":
      return counts.failed === 1 ? "Failed (1)" : `Failed (${counts.failed})`;
  }
}

export function filterPropertyResults(
  propertyResults: readonly RunDetailPropertyResult[],
  filter: PropertyResultFilter,
): RunDetailPropertyResult[] {
  switch (filter) {
    case "all":
      return [...propertyResults];
    case "warnings":
      return propertyResults.filter(
        (propertyResult) => propertyResult.warnings.length > 0,
      );
    case "failed":
      return propertyResults.filter(
        (propertyResult) => propertyResult.errors.length > 0,
      );
  }
}

export function sortPropertyResults(
  propertyResults: readonly RunDetailPropertyResult[],
  sortKey: PropertyResultSortKey,
  direction: PropertyResultSortDirection,
): RunDetailPropertyResult[] {
  return [...propertyResults].sort((left, right) => {
    const comparison = comparePropertyResults(left, right, sortKey, direction);

    if (comparison !== 0) {
      return comparison;
    }

    return left.displayOrder - right.displayOrder;
  });
}

function comparePropertyResults(
  left: RunDetailPropertyResult,
  right: RunDetailPropertyResult,
  sortKey: PropertyResultSortKey,
  direction: PropertyResultSortDirection,
): number {
  return compareNullableNumbers(
    getPropertyResultSortValue(left, sortKey),
    getPropertyResultSortValue(right, sortKey),
    direction,
  );
}

function getPropertyResultSortValue(
  propertyResult: RunDetailPropertyResult,
  sortKey: PropertyResultSortKey,
): number | null {
  switch (sortKey) {
    case "score":
      return propertyResult.totalScore;
    case "listPrice":
      return propertyResult.listPriceCents;
    case "estimatedRent":
      return getEstimatedMonthlyRent(propertyResult);
    case "capRate":
      return propertyResult.capRate;
    case "monthlyCashFlow":
      return propertyResult.monthlyCashFlow;
  }
}

function compareNullableNumbers(
  left: number | null,
  right: number | null,
  direction: PropertyResultSortDirection,
): number {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  const difference = left - right;
  return direction === "asc" ? difference : -difference;
}
