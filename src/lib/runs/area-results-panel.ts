import type { AreaGroupingLevel } from "@/contracts/domain/analysis";
import type {
  RunDetailAreaResult,
  RunDetailPropertyResult,
} from "@/contracts/runs/responses";
import {
  formatLaunchMetricValue,
  PROPERTY_RESULT_METRIC_FIELDS,
  type PropertyResultMetricFieldDefinition,
  type PropertyResultMetricFieldKey,
} from "@/lib/runs/property-result-detail";
import { resolveAreaKey } from "@/modules/analysis/aggregation/resolve-area-key";

/**
 * Display and filtering helpers for the run area results panel.
 *
 * @see Story 8.3.3 — Build area results panel
 */

export type AreaAggregateMetricDisplay = {
  primary: string;
  secondary: string | null;
};

const GROUPING_LEVEL_LABELS: Record<AreaGroupingLevel, string> = {
  zip: "ZIP code",
  city: "City",
  other: "Other",
};

export function formatAreaGroupingLevelLabel(
  groupingLevel: AreaGroupingLevel,
): string {
  return GROUPING_LEVEL_LABELS[groupingLevel];
}

export function formatAreaKeyDisplay(
  areaKey: string,
  groupingLevel: AreaGroupingLevel,
): string {
  if (groupingLevel === "zip") {
    return `ZIP ${areaKey}`;
  }

  if (groupingLevel === "city") {
    const [city, state] = areaKey.split("|");

    if (city && state) {
      return `${city}, ${state}`;
    }

    return city ?? areaKey;
  }

  return areaKey;
}

export function hasAreaRankColumn(
  areaResults: readonly RunDetailAreaResult[],
): boolean {
  return areaResults.some((areaResult) => areaResult.rank !== null);
}

export function getVisibleAreaMetricFields(
  areaResults: readonly RunDetailAreaResult[],
): PropertyResultMetricFieldDefinition[] {
  return PROPERTY_RESULT_METRIC_FIELDS.filter((field) =>
    areaResults.some((areaResult) => hasAreaMetric(areaResult, field.key)),
  );
}

export function formatAreaAggregateMetricDisplay(
  areaResult: RunDetailAreaResult,
  field: PropertyResultMetricFieldDefinition,
): AreaAggregateMetricDisplay {
  const mean = areaResult.aggregates[field.key];
  const median = areaResult.aggregates.metricMedians?.[field.key];
  const meanFormatted = formatLaunchMetricValue(mean, field.format);
  const medianFormatted = formatLaunchMetricValue(median, field.format);

  if (meanFormatted.value === "—" && medianFormatted.value === "—") {
    return { primary: "—", secondary: null };
  }

  return {
    primary: meanFormatted.value,
    secondary:
      medianFormatted.value !== "—"
        ? `Median: ${medianFormatted.value}`
        : null,
  };
}

export function formatAreaWarningsSummary(
  warnings: readonly string[],
): { display: string; title: string | null } {
  if (warnings.length === 0) {
    return { display: "—", title: null };
  }

  return {
    display: warnings[0] ?? "—",
    title: warnings.join(" · "),
  };
}

export function resolvePropertyResultAreaKey(
  propertyResult: RunDetailPropertyResult,
  groupingLevel: AreaGroupingLevel,
): string | null {
  const addressSummary = propertyResult.addressSummary;

  if (!addressSummary) {
    return null;
  }

  const resolved = resolveAreaKey(groupingLevel, {
    line1: addressSummary.line1,
    line2: addressSummary.line2,
    city: addressSummary.city,
    state: addressSummary.state,
    postalCode: addressSummary.postalCode,
    country: "US",
  });

  return resolved.status === "resolved" ? resolved.areaKey : null;
}

export function propertyResultMatchesArea(
  propertyResult: RunDetailPropertyResult,
  areaResult: RunDetailAreaResult,
): boolean {
  const propertyAreaKey = resolvePropertyResultAreaKey(
    propertyResult,
    areaResult.groupingLevel,
  );

  return propertyAreaKey === areaResult.areaKey;
}

export function filterPropertyResultsByArea(
  propertyResults: readonly RunDetailPropertyResult[],
  areaResult: RunDetailAreaResult | null,
): RunDetailPropertyResult[] {
  if (!areaResult) {
    return [...propertyResults];
  }

  return propertyResults.filter((propertyResult) =>
    propertyResultMatchesArea(propertyResult, areaResult),
  );
}

function hasAreaMetric(
  areaResult: RunDetailAreaResult,
  key: PropertyResultMetricFieldKey,
): boolean {
  return (
    areaResult.aggregates[key] !== undefined ||
    areaResult.aggregates.metricMedians?.[key] !== undefined
  );
}
