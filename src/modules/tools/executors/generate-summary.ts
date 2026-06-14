import "server-only";

import {
  createToolExecutorFailedResult,
  createToolExecutorFatalError,
  createToolExecutorSuccessResult,
  createToolExecutorWarning,
  type ToolExecutor,
} from "@/contracts/runs";
import { computeWorkflowSummary } from "@/modules/analysis/summary/compute-workflow-summary";
import { generateSummaryResolvedConfigSchema } from "@/modules/tools/definitions/generate-summary";

/**
 * Generate a deterministic final run summary from structured workflow results.
 *
 * @see Story 6.4.4 — Implement Summary executor
 */

const INVALID_CONFIG_CODE = "invalid_config" as const;

export const executeGenerateSummary: ToolExecutor = async (input) => {
  const parsedConfig = generateSummaryResolvedConfigSchema.safeParse(input.config);

  if (!parsedConfig.success) {
    return createToolExecutorFailedResult(
      createToolExecutorFatalError(
        INVALID_CONFIG_CODE,
        "Summary configuration is invalid.",
        { debug: { issues: parsedConfig.error.issues } },
      ),
    );
  }

  const result = computeWorkflowSummary({
    propertyOrder: input.workingSet.propertyOrder,
    metricsByKey: input.workingSet.metricsByKey,
    scoresByKey: input.workingSet.scoresByKey,
    areaAggregatesByKey: input.workingSet.areaAggregatesByKey,
    detailsByKey: input.workingSet.detailsByKey,
    listingsByKey: input.workingSet.listingsByKey,
    config: parsedConfig.data,
  });

  const warnings = result.warnings.map((warning) =>
    createToolExecutorWarning(warning.code, warning.message),
  );

  return createToolExecutorSuccessResult(
    { summary: result.summary },
    { warnings },
  );
};
