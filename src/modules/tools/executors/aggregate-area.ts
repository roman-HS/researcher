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
import { computeAreaAggregates } from "@/modules/analysis/aggregation/compute-area-aggregates";
import { aggregateAreaResolvedConfigSchema } from "@/modules/tools/definitions/aggregate-area";

/**
 * Roll up property metrics into area-level summaries grouped by ZIP or city.
 *
 * @see Story 6.4.3 — Implement Area Aggregation executor
 */

const INVALID_CONFIG_CODE = "invalid_config" as const;

export const executeAggregateArea: ToolExecutor = async (input) => {
  const parsedConfig = aggregateAreaResolvedConfigSchema.safeParse(input.config);

  if (!parsedConfig.success) {
    return createToolExecutorFailedResult(
      createToolExecutorFatalError(
        INVALID_CONFIG_CODE,
        "Area aggregation configuration is invalid.",
        { debug: { issues: parsedConfig.error.issues } },
      ),
    );
  }

  const targets = selectAggregationTargets(input.workingSet);

  if (targets.length === 0) {
    return createToolExecutorSuccessResult({});
  }

  const result = computeAreaAggregates({
    propertyOrder: input.workingSet.propertyOrder,
    metricsByKey: input.workingSet.metricsByKey,
    detailsByKey: input.workingSet.detailsByKey,
    listingsByKey: input.workingSet.listingsByKey,
    config: parsedConfig.data,
  });

  const warnings = result.propertyWarnings.map((warning) =>
    createToolExecutorWarning(warning.code, warning.message, {
      propertyKey: warning.propertyKey,
    }),
  );

  return createToolExecutorSuccessResult(
    { areaAggregatesByKey: result.areaAggregatesByKey },
    { warnings },
  );
};

function selectAggregationTargets(
  workingSet: ExecutionWorkingSet,
): PropertyKey[] {
  return workingSet.propertyOrder.filter(
    (propertyKey) => workingSet.metricsByKey[propertyKey] !== undefined,
  );
}
