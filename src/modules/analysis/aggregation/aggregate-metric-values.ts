import type { MetricReasonCode, MetricValue } from "@/contracts/domain/analysis";
import {
  roundMoney,
  roundRatio,
} from "@/modules/analysis/metrics/formulas";
import type { AggregateAreaMetricKey } from "@/modules/tools/definitions/aggregate-area";

/**
 * Roll up per-property metric values into area-level mean and median.
 *
 * @see Story 6.4.3 — Implement Area Aggregation executor
 */

const RATIO_METRIC_KEYS = new Set<AggregateAreaMetricKey>([
  "capRate",
  "cashOnCashReturn",
  "grossRentMultiplier",
]);

export type AggregatedMetricValues = {
  mean: MetricValue;
  median: MetricValue;
};

export function aggregateMetricValues(
  metricKey: AggregateAreaMetricKey,
  values: readonly MetricValue[],
): AggregatedMetricValues {
  const availableValues = values
    .filter(
      (value): value is Extract<MetricValue, { status: "available" }> =>
        value.status === "available",
    )
    .map((value) => value.value);

  if (availableValues.length === 0) {
    const missingReason = resolveUniformMissingReason(values);

    return {
      mean: {
        status: "missing",
        reasonCode: missingReason,
      },
      median: {
        status: "missing",
        reasonCode: missingReason,
      },
    };
  }

  const meanValue = roundMetricValue(
    metricKey,
    availableValues.reduce((sum, value) => sum + value, 0) /
      availableValues.length,
  );
  const medianValue = roundMetricValue(
    metricKey,
    computeMedian(availableValues),
  );

  return {
    mean: { status: "available", value: meanValue },
    median: { status: "available", value: medianValue },
  };
}

function resolveUniformMissingReason(
  values: readonly MetricValue[],
): MetricReasonCode {
  const reasonCodes = new Set<MetricReasonCode>();

  for (const value of values) {
    if (value.status === "missing" || value.status === "not_applicable") {
      reasonCodes.add(value.reasonCode);
    }
  }

  if (reasonCodes.size === 1) {
    return [...reasonCodes][0]!;
  }

  return "missing_property_details";
}

function computeMedian(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1]! + sorted[middle]!) / 2;
  }

  return sorted[middle]!;
}

function roundMetricValue(
  metricKey: AggregateAreaMetricKey,
  value: number,
): number {
  if (RATIO_METRIC_KEYS.has(metricKey)) {
    return roundRatio(value);
  }

  return roundMoney(value);
}
