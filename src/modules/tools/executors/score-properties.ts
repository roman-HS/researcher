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
import { computePropertyScore } from "@/modules/analysis/scoring/compute-property-score";
import { scorePropertiesResolvedConfigSchema } from "@/modules/tools/definitions/score-properties";

/**
 * Score properties from upstream metric bundles using configurable weights.
 *
 * @see Story 6.4.2 — Implement Property Scoring executor
 */

const INVALID_CONFIG_CODE = "invalid_config" as const;

export const executeScoreProperties: ToolExecutor = async (input) => {
  const parsedConfig = scorePropertiesResolvedConfigSchema.safeParse(
    input.config,
  );

  if (!parsedConfig.success) {
    return createToolExecutorFailedResult(
      createToolExecutorFatalError(
        INVALID_CONFIG_CODE,
        "Property scoring configuration is invalid.",
        { debug: { issues: parsedConfig.error.issues } },
      ),
    );
  }

  const targets = selectScoringTargets(input.workingSet);

  if (targets.length === 0) {
    return createToolExecutorSuccessResult({});
  }

  const scoresByKey: ExecutionWorkingSet["scoresByKey"] = {};
  const warnings = [];

  for (const propertyKey of targets) {
    const metrics = input.workingSet.metricsByKey[propertyKey];

    if (!metrics) {
      continue;
    }

    const result = computePropertyScore({
      propertyKey,
      metrics,
      config: parsedConfig.data,
    });

    scoresByKey[propertyKey] = result.score;

    for (const warning of result.warnings) {
      warnings.push(
        createToolExecutorWarning(warning.code, warning.message, {
          propertyKey,
        }),
      );
    }
  }

  return createToolExecutorSuccessResult({ scoresByKey }, { warnings });
};

function selectScoringTargets(
  workingSet: ExecutionWorkingSet,
): PropertyKey[] {
  return workingSet.propertyOrder.filter(
    (propertyKey) => workingSet.metricsByKey[propertyKey] !== undefined,
  );
}
