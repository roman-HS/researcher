import type {
  AreaAggregate,
  MetricBundle,
} from "@/contracts/domain/analysis";
import type { PropertyDetail, PropertyListing } from "@/contracts/domain/property";
import type { Address } from "@/contracts/domain/primitives";
import { aggregateMetricValues } from "@/modules/analysis/aggregation/aggregate-metric-values";
import { resolveAreaKey } from "@/modules/analysis/aggregation/resolve-area-key";
import type {
  AggregateAreaMetricKey,
  AggregateAreaResolvedConfig,
} from "@/modules/tools/definitions/aggregate-area";

/**
 * Deterministic area aggregation from property metric bundles.
 *
 * @see Story 6.4.3 — Implement Area Aggregation executor
 */

export type ComputeAreaAggregatesInput = {
  propertyOrder: readonly string[];
  metricsByKey: Readonly<Record<string, MetricBundle>>;
  detailsByKey: Readonly<Record<string, PropertyDetail>>;
  listingsByKey: Readonly<Record<string, PropertyListing>>;
  config: AggregateAreaResolvedConfig;
};

export type ComputeAreaAggregatesResult = {
  areaAggregatesByKey: Record<string, AreaAggregate>;
  propertyWarnings: ComputeAreaAggregatesPropertyWarning[];
};

export type ComputeAreaAggregatesPropertyWarning = {
  code: string;
  message: string;
  propertyKey: string;
};

type AreaGroup = {
  areaKey: string;
  groupingLevel: "zip" | "city";
  propertyKeys: string[];
  warnings: string[];
};

export function computeAreaAggregates(
  input: ComputeAreaAggregatesInput,
): ComputeAreaAggregatesResult {
  const { groups, propertyWarnings } = groupProperties(input);
  const areaAggregatesByKey: Record<string, AreaAggregate> = {};

  for (const group of groups.values()) {
    const aggregate = buildAreaAggregate(group, input);
    areaAggregatesByKey[group.areaKey] = aggregate;
  }

  rankAreaAggregates(areaAggregatesByKey, input.config.aggregateMetrics);

  return {
    areaAggregatesByKey,
    propertyWarnings,
  };
}

function groupProperties(input: ComputeAreaAggregatesInput): {
  groups: Map<string, AreaGroup>;
  propertyWarnings: ComputeAreaAggregatesPropertyWarning[];
} {
  const groups = new Map<string, AreaGroup>();
  const propertyWarnings: ComputeAreaAggregatesPropertyWarning[] = [];

  for (const propertyKey of input.propertyOrder) {
    const metrics = input.metricsByKey[propertyKey];

    if (!metrics) {
      continue;
    }

    const address = resolvePropertyAddress(
      input.detailsByKey[propertyKey],
      input.listingsByKey[propertyKey],
    );
    const resolved = resolveAreaKey(input.config.groupingLevel, address);

    if (resolved.status === "missing") {
      for (const message of resolved.warnings) {
        propertyWarnings.push({
          code: "missing_grouping_field",
          message,
          propertyKey,
        });
      }

      continue;
    }

    const existing = groups.get(resolved.areaKey);

    if (existing) {
      existing.propertyKeys.push(propertyKey);
      existing.warnings.push(...resolved.warnings);
      continue;
    }

    groups.set(resolved.areaKey, {
      areaKey: resolved.areaKey,
      groupingLevel: resolved.groupingLevel,
      propertyKeys: [propertyKey],
      warnings: [...resolved.warnings],
    });
  }

  return { groups, propertyWarnings };
}

function buildAreaAggregate(
  group: AreaGroup,
  input: ComputeAreaAggregatesInput,
): AreaAggregate {
  const { config } = input;
  const propertyCount = group.propertyKeys.length;
  const meetsMinimumSample = propertyCount >= config.minimumSampleSize;
  const warnings = [...new Set(group.warnings)];

  if (!meetsMinimumSample) {
    warnings.push(
      `Area has ${propertyCount} propert${propertyCount === 1 ? "y" : "ies"}, below the minimum sample size of ${config.minimumSampleSize}.`,
    );
  }

  const metricMedians: NonNullable<AreaAggregate["metricMedians"]> = {};
  const aggregateFields: Partial<
    Pick<
      AreaAggregate,
      AggregateAreaMetricKey
    >
  > = {};

  for (const metricKey of config.aggregateMetrics) {
    const metricValues = group.propertyKeys.map(
      (propertyKey) => input.metricsByKey[propertyKey]?.[metricKey],
    ).filter((value): value is NonNullable<typeof value> => value !== undefined);

    const aggregated = aggregateMetricValues(metricKey, metricValues);
    aggregateFields[metricKey] = aggregated.mean;
    metricMedians[metricKey] = aggregated.median;
  }

  return {
    areaKey: group.areaKey,
    groupingLevel: group.groupingLevel,
    propertyCount,
    minimumSampleSize: config.minimumSampleSize,
    meetsMinimumSample,
    ...aggregateFields,
    metricMedians,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}

function rankAreaAggregates(
  areaAggregatesByKey: Record<string, AreaAggregate>,
  aggregateMetrics: readonly AggregateAreaMetricKey[],
): void {
  const primaryMetric = aggregateMetrics[0];

  if (!primaryMetric) {
    return;
  }

  const ascending = primaryMetric === "grossRentMultiplier";

  const ranked = Object.values(areaAggregatesByKey).sort((left, right) => {
    const leftValue = extractRankingValue(left, primaryMetric, ascending);
    const rightValue = extractRankingValue(right, primaryMetric, ascending);

    if (leftValue !== rightValue) {
      return ascending ? leftValue - rightValue : rightValue - leftValue;
    }

    if (left.propertyCount !== right.propertyCount) {
      return right.propertyCount - left.propertyCount;
    }

    return left.areaKey.localeCompare(right.areaKey);
  });

  ranked.forEach((aggregate, index) => {
    areaAggregatesByKey[aggregate.areaKey] = {
      ...aggregate,
      rank: index + 1,
    };
  });
}

function extractRankingValue(
  aggregate: AreaAggregate,
  metricKey: AggregateAreaMetricKey,
  ascending: boolean,
): number {
  const metricValue = aggregate[metricKey];

  if (metricValue?.status !== "available") {
    return ascending ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  }

  return metricValue.value;
}

function resolvePropertyAddress(
  detail: PropertyDetail | undefined,
  listing: PropertyListing | undefined,
): Address | undefined {
  return detail?.address ?? listing?.address;
}
