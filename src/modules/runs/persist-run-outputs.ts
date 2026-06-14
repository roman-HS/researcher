import type { MetricValue, PropertyScore } from "@/contracts/domain/analysis";
import type { PropertyDetail, PropertyListing } from "@/contracts/domain/property";
import type {
  ToolExecutorItemError,
  ToolExecutorWarning,
} from "@/contracts/runs/executors";
import type { ExecutionWorkingSet } from "@/contracts/runs/working-set";
import type { RunAddressSummaryJson } from "@/db/schema/run";
import {
  runAreaResults,
  runPropertyResults,
} from "@/db/schema/run";
import type { JsonObject } from "@/db/schema/helpers/columns";

/**
 * Map the final execution working set into run result rows.
 *
 * @see Story 7.4.5 — Persist final run outputs
 */

export type RunPropertyResultErrorsJson = {
  items: ToolExecutorItemError[];
};

export type RunPropertyResultInsert = typeof runPropertyResults.$inferInsert;
export type RunAreaResultInsert = typeof runAreaResults.$inferInsert;

export type BuildRunResultRowsInput = {
  runId: string;
  workingSet: ExecutionWorkingSet;
  itemErrorsByPropertyKey: Readonly<
    Record<string, readonly ToolExecutorItemError[]>
  >;
  propertyWarningsByPropertyKey: Readonly<Record<string, readonly string[]>>;
};

export class RunOutputAccumulator {
  private readonly itemErrorsByPropertyKey = new Map<
    string,
    ToolExecutorItemError[]
  >();
  private readonly propertyWarningsByPropertyKey = new Map<string, string[]>();

  recordStepOutputs(
    itemErrors: readonly ToolExecutorItemError[],
    warnings: readonly ToolExecutorWarning[],
  ): void {
    for (const itemError of itemErrors) {
      if (!itemError.propertyKey) {
        continue;
      }

      const existing =
        this.itemErrorsByPropertyKey.get(itemError.propertyKey) ?? [];
      existing.push(itemError);
      this.itemErrorsByPropertyKey.set(itemError.propertyKey, existing);
    }

    for (const warning of warnings) {
      if (!warning.propertyKey) {
        continue;
      }

      const existing =
        this.propertyWarningsByPropertyKey.get(warning.propertyKey) ?? [];
      existing.push(warning.message);
      this.propertyWarningsByPropertyKey.set(warning.propertyKey, existing);
    }
  }

  getItemErrorsByPropertyKey(): Record<string, readonly ToolExecutorItemError[]> {
    return Object.fromEntries(this.itemErrorsByPropertyKey);
  }

  getPropertyWarningsByPropertyKey(): Record<string, readonly string[]> {
    return Object.fromEntries(this.propertyWarningsByPropertyKey);
  }
}

export function buildPropertyResultRows(
  input: BuildRunResultRowsInput,
): RunPropertyResultInsert[] {
  return input.workingSet.propertyOrder.map((propertyKey, displayOrder) => {
    const listing = input.workingSet.listingsByKey[propertyKey];
    const detail = input.workingSet.detailsByKey[propertyKey];
    const metrics = input.workingSet.metricsByKey[propertyKey];
    const score = input.workingSet.scoresByKey[propertyKey];
    const itemErrors = input.itemErrorsByPropertyKey[propertyKey] ?? [];
    const executorWarnings =
      input.propertyWarningsByPropertyKey[propertyKey] ?? [];
    const metricWarnings = metrics?.warnings ?? [];
    const warnings = dedupeStrings([...metricWarnings, ...executorWarnings]);

    return {
      runId: input.runId,
      propertyKey,
      displayOrder,
      totalScore: extractTotalScore(score),
      listPriceCents: extractListPriceCents(listing),
      capRate: formatNumericColumn(extractAvailableMetricValue(metrics?.capRate)),
      monthlyCashFlow: formatNumericColumn(
        extractAvailableMetricValue(metrics?.monthlyCashFlow),
      ),
      addressSummaryJson: buildAddressSummary(detail, listing),
      listingJson: listing ?? null,
      detailJson: detail ?? null,
      metricsJson: metrics ?? null,
      scoreJson: score ?? null,
      warningsJson:
        warnings.length > 0 ? (warnings as unknown as JsonObject) : null,
      errorsJson:
        itemErrors.length > 0
          ? ({ items: [...itemErrors] } satisfies RunPropertyResultErrorsJson)
          : null,
    };
  });
}

export function buildAreaResultRows(
  runId: string,
  workingSet: ExecutionWorkingSet,
): RunAreaResultInsert[] {
  return Object.values(workingSet.areaAggregatesByKey).map((aggregate) => ({
    runId,
    areaKey: aggregate.areaKey,
    groupingLevel: aggregate.groupingLevel,
    propertyCount: aggregate.propertyCount,
    rank: aggregate.rank ?? null,
    meetsMinimumSample: aggregate.meetsMinimumSample,
    aggregatesJson: aggregate,
    warningsJson:
      aggregate.warnings && aggregate.warnings.length > 0
        ? (aggregate.warnings as unknown as JsonObject)
        : null,
  }));
}

function dedupeStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function buildAddressSummary(
  detail: PropertyDetail | undefined,
  listing: PropertyListing | undefined,
): RunAddressSummaryJson | null {
  const address = detail?.address ?? listing?.address;

  if (!address) {
    return null;
  }

  const summary: RunAddressSummaryJson = {};

  if (address.line1) {
    summary.line1 = address.line1;
  }

  if (address.line2) {
    summary.line2 = address.line2;
  }

  if (address.city) {
    summary.city = address.city;
  }

  if (address.state) {
    summary.state = address.state;
  }

  if (address.postalCode) {
    summary.postalCode = address.postalCode;
  }

  return Object.keys(summary).length > 0 ? summary : null;
}

function extractTotalScore(score: PropertyScore | undefined): string | null {
  if (!score || score.scoreStatus !== "available") {
    return null;
  }

  return formatNumericColumn(score.totalScore);
}

function extractListPriceCents(
  listing: PropertyListing | undefined,
): number | null {
  const amount = listing?.listPrice?.amount;

  if (!amount) {
    return null;
  }

  return moneyAmountToCents(amount);
}

function extractAvailableMetricValue(
  metric: MetricValue | undefined,
): number | null {
  if (!metric || metric.status !== "available") {
    return null;
  }

  return metric.value;
}

function formatNumericColumn(value: number | null): string | null {
  if (value == null) {
    return null;
  }

  return String(value);
}

export function moneyAmountToCents(amount: string): number {
  const [wholePart = "0", fractionalPart = "00"] = amount.split(".");
  const whole = Number.parseInt(wholePart, 10);
  const fractional = fractionalPart.padEnd(2, "0").slice(0, 2);
  const cents = Number.parseInt(fractional, 10);

  return whole * 100 + cents;
}
