import "server-only";

import {
  createToolExecutorFailedResult,
  createToolExecutorFatalError,
  createToolExecutorSuccessResult,
  createToolExecutorWarning,
  type ExecutionWorkingSet,
  type PropertyKey,
  type ToolExecutor,
} from "@/contracts/runs";
import { computeMetricBundle } from "@/modules/analysis/metrics/compute-metric-bundle";
import {
  calculateMetricsResolvedConfigSchema,
} from "@/modules/tools/definitions/calculate-metrics";

/**
 * Compute deterministic investment metrics from property, rent, and assumption data.
 *
 * @see Story 6.4.1 — Implement Metrics Calculation executor
 */

const INVALID_CONFIG_CODE = "invalid_config" as const;
const NO_PROPERTY_DETAILS_FOR_METRICS_CODE =
  "no_property_details_for_metrics" as const;

export const executeCalculateMetrics: ToolExecutor = async (input) => {
  const parsedConfig = calculateMetricsResolvedConfigSchema.safeParse(
    input.config,
  );

  if (!parsedConfig.success) {
    return createToolExecutorFailedResult(
      createToolExecutorFatalError(
        INVALID_CONFIG_CODE,
        "Metrics calculation configuration is invalid.",
        { debug: { issues: parsedConfig.error.issues } },
      ),
    );
  }

  if (Object.keys(input.workingSet.detailsByKey).length === 0) {
    return createToolExecutorFailedResult(
      createToolExecutorFatalError(
        NO_PROPERTY_DETAILS_FOR_METRICS_CODE,
        "No property details are available to calculate metrics for.",
      ),
    );
  }

  const targets = selectMetricCalculationTargets(input.workingSet);

  if (targets.length === 0) {
    return createToolExecutorSuccessResult({});
  }

  const metricsByKey: ExecutionWorkingSet["metricsByKey"] = {};
  const warnings = [];

  for (const propertyKey of targets) {
    const detail = input.workingSet.detailsByKey[propertyKey];

    if (!detail) {
      continue;
    }

    const result = computeMetricBundle({
      propertyKey,
      detail,
      listing: input.workingSet.listingsByKey[propertyKey],
      rentEstimate: input.workingSet.rentEstimatesByKey[propertyKey],
      config: parsedConfig.data,
    });

    metricsByKey[propertyKey] = result.bundle;

    for (const warning of result.warnings) {
      warnings.push(
        createToolExecutorWarning(warning.code, warning.message, {
          propertyKey,
        }),
      );
    }
  }

  return createToolExecutorSuccessResult({ metricsByKey }, { warnings });
};

function selectMetricCalculationTargets(
  workingSet: ExecutionWorkingSet,
): PropertyKey[] {
  return workingSet.propertyOrder.filter(
    (propertyKey) => workingSet.detailsByKey[propertyKey] !== undefined,
  );
}
