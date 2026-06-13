import {
  createToolManifest,
  defineToolDefinition,
  type ToolCategory,
  type ToolDefinition,
  type ToolKey,
  type ToolManifest,
} from "@/contracts/tools";
import { aggregateAreaTool } from "@/modules/tools/definitions/aggregate-area";
import { calculateMetricsTool } from "@/modules/tools/definitions/calculate-metrics";
import { estimateRentTool } from "@/modules/tools/definitions/estimate-rent";
import { fetchComparablesTool } from "@/modules/tools/definitions/fetch-comparables";
import { generateSummaryTool } from "@/modules/tools/definitions/generate-summary";
import { listingSearchTool } from "@/modules/tools/definitions/listing-search";
import { propertyDetailTool } from "@/modules/tools/definitions/property-detail";
import { scorePropertiesTool } from "@/modules/tools/definitions/score-properties";
import { ToolNotFoundError } from "@/modules/tools/errors";

const rawV1Tools = [
  listingSearchTool,
  propertyDetailTool,
  fetchComparablesTool,
  estimateRentTool,
  calculateMetricsTool,
  scorePropertiesTool,
  aggregateAreaTool,
  generateSummaryTool,
] as const;

function buildRegistry(tools: readonly ToolDefinition[]) {
  const validatedTools = tools.map((tool) => defineToolDefinition(tool));

  const keys = validatedTools.map((tool) => tool.key);
  const duplicateKeys = keys.filter((key, index) => keys.indexOf(key) !== index);

  if (duplicateKeys.length > 0) {
    throw new Error(
      `Duplicate tool keys in registry: ${[...new Set(duplicateKeys)].join(", ")}`,
    );
  }

  const toolsByKey = new Map<ToolKey, ToolDefinition>(
    validatedTools.map((tool) => [tool.key, tool]),
  );

  const manifestsByKey = new Map<ToolKey, ToolManifest>(
    validatedTools.map((tool) => [tool.key, createToolManifest(tool)]),
  );

  return {
    tools: validatedTools,
    toolsByKey,
    manifestsByKey,
  };
}

const registry = buildRegistry(rawV1Tools);

export const V1_TOOLS = registry.tools;

export const V1_TOOL_KEYS = V1_TOOLS.map((tool) => tool.key);

export function listToolDefinitions(): readonly ToolDefinition[] {
  return V1_TOOLS;
}

export function listToolDefinitionsByCategory(
  category: ToolCategory,
): ToolDefinition[] {
  return V1_TOOLS.filter((tool) => tool.category === category);
}

export function hasToolKey(toolKey: ToolKey | string): toolKey is ToolKey {
  return registry.toolsByKey.has(toolKey as ToolKey);
}

export function getToolDefinition(toolKey: ToolKey | string): ToolDefinition {
  const tool = registry.toolsByKey.get(toolKey as ToolKey);

  if (!tool) {
    throw new ToolNotFoundError(toolKey);
  }

  return tool;
}

export function getToolManifest(toolKey: ToolKey | string): ToolManifest {
  const manifest = registry.manifestsByKey.get(toolKey as ToolKey);

  if (!manifest) {
    throw new ToolNotFoundError(toolKey);
  }

  return manifest;
}

export function getDefaultToolConfig(toolKey: ToolKey | string): unknown {
  return getToolDefinition(toolKey).configSchema.parse({});
}
