import { listingSearchToolKey } from "@/contracts/providers/zillow/listing-search";
import { comparablesToolKey } from "@/contracts/providers/zillow/comparables";
import { propertyDetailToolKey } from "@/contracts/providers/zillow/property-detail";
import { rentEstimateToolKey } from "@/contracts/providers/zillow/rent-estimate";
import type { ToolExecutor } from "@/contracts/runs";
import type { ToolKey } from "@/contracts/tools";
import { calculateMetricsToolKey } from "@/modules/tools/definitions/calculate-metrics";
import { aggregateAreaToolKey } from "@/modules/tools/definitions/aggregate-area";
import { scorePropertiesToolKey } from "@/modules/tools/definitions/score-properties";
import { ExecutorNotFoundError } from "@/modules/tools/executors/errors";
import { executeAggregateArea } from "@/modules/tools/executors/aggregate-area";
import { executeCalculateMetrics } from "@/modules/tools/executors/calculate-metrics";
import { executeScoreProperties } from "@/modules/tools/executors/score-properties";
import { executeEstimateRent } from "@/modules/tools/executors/estimate-rent";
import { executeFetchComparables } from "@/modules/tools/executors/fetch-comparables";
import { executeListingSearch } from "@/modules/tools/executors/listing-search";
import { executePropertyDetail } from "@/modules/tools/executors/property-detail";
import { createNotImplementedToolExecutor } from "@/modules/tools/executors/not-implemented";
import { generateSummaryToolKey } from "@/modules/tools/definitions/generate-summary";
import { executeGenerateSummary } from "@/modules/tools/executors/generate-summary";
import { V1_TOOL_KEYS, V1_TOOLS } from "@/modules/tools/registry";

function resolveExecutor(toolKey: ToolKey): ToolExecutor {
  if (toolKey === listingSearchToolKey) {
    return executeListingSearch;
  }

  if (toolKey === propertyDetailToolKey) {
    return executePropertyDetail;
  }

  if (toolKey === comparablesToolKey) {
    return executeFetchComparables;
  }

  if (toolKey === rentEstimateToolKey) {
    return executeEstimateRent;
  }

  if (toolKey === calculateMetricsToolKey) {
    return executeCalculateMetrics;
  }

  if (toolKey === scorePropertiesToolKey) {
    return executeScoreProperties;
  }

  if (toolKey === aggregateAreaToolKey) {
    return executeAggregateArea;
  }

  if (toolKey === generateSummaryToolKey) {
    return executeGenerateSummary;
  }

  return createNotImplementedToolExecutor(toolKey);
}

type ExecutorRegistration = {
  toolKey: ToolKey;
  execute: ToolExecutor;
};

function buildExecutorRegistry(registrations: readonly ExecutorRegistration[]) {
  const keys = registrations.map((registration) => registration.toolKey);
  const duplicateKeys = keys.filter(
    (key, index) => keys.indexOf(key) !== index,
  );

  if (duplicateKeys.length > 0) {
    throw new Error(
      `Duplicate executor tool keys in registry: ${[...new Set(duplicateKeys)].join(", ")}`,
    );
  }

  const registeredKeys = new Set(keys);
  const missingToolKeys = V1_TOOL_KEYS.filter((key) => !registeredKeys.has(key));

  if (missingToolKeys.length > 0) {
    throw new Error(
      `Missing executor registrations for V1 tools: ${missingToolKeys.join(", ")}`,
    );
  }

  const orphanKeys = keys.filter((key) => !V1_TOOL_KEYS.includes(key));

  if (orphanKeys.length > 0) {
    throw new Error(
      `Executor registry contains keys not present in V1 tools: ${orphanKeys.join(", ")}`,
    );
  }

  const executorsByKey = new Map<ToolKey, ToolExecutor>(
    registrations.map((registration) => [
      registration.toolKey,
      registration.execute,
    ]),
  );

  return {
    executorKeys: keys,
    executorsByKey,
  };
}

const rawV1Executors: ExecutorRegistration[] = V1_TOOLS.map((tool) => ({
  toolKey: tool.key,
  execute: resolveExecutor(tool.key),
}));

const registry = buildExecutorRegistry(rawV1Executors);

export const V1_EXECUTOR_KEYS = registry.executorKeys;

export function listExecutorKeys(): readonly ToolKey[] {
  return V1_EXECUTOR_KEYS;
}

export function hasExecutor(toolKey: ToolKey | string): toolKey is ToolKey {
  return registry.executorsByKey.has(toolKey as ToolKey);
}

export function getExecutor(toolKey: ToolKey | string): ToolExecutor {
  const executor = registry.executorsByKey.get(toolKey as ToolKey);

  if (!executor) {
    throw new ExecutorNotFoundError(toolKey);
  }

  return executor;
}
