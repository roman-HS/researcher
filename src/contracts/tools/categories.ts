import { z } from "zod";

import {
  toolCategorySchema,
  type ToolCategory,
} from "@/contracts/tools/internal";

/**
 * Builder palette category metadata. Keys match `toolCategorySchema`
 *
 * Planned V1 tool assignments:
 * - search: `rapidapi.zillow.searchListings@1`
 * - enrich: property detail, comparables, rent estimate tools
 * - analyze: metrics, scoring, area aggregation tools
 * - summarize: `ai.generateSummary@1`
 */
export const toolCategoryDefinitionSchema = z.object({
  key: toolCategorySchema,
  label: z.string().min(1),
  description: z.string().min(1),
  sortOrder: z.number().int().positive(),
});

export type ToolCategoryDefinition = z.infer<
  typeof toolCategoryDefinitionSchema
>;

/** Palette/API category metadata without ordering fields. */
export const toolCategorySummarySchema = toolCategoryDefinitionSchema.pick({
  key: true,
  label: true,
  description: true,
});

export type ToolCategorySummary = z.infer<typeof toolCategorySummarySchema>;

export const TOOL_CATEGORIES = toolCategoryDefinitionSchema.array().parse([
  {
    key: "search",
    label: "Search",
    description: "Find property listings to start a workflow.",
    sortOrder: 1,
  },
  {
    key: "enrich",
    label: "Enrich",
    description: "Add property details, comparables, and rent estimates.",
    sortOrder: 2,
  },
  {
    key: "analyze",
    label: "Analyze",
    description: "Calculate investment metrics, scores, and area rollups.",
    sortOrder: 3,
  },
  {
    key: "summarize",
    label: "Summarize",
    description: "Turn deterministic results into a readable workflow summary.",
    sortOrder: 4,
  },
]);

const categoryByKey = new Map<ToolCategory, ToolCategoryDefinition>(
  TOOL_CATEGORIES.map((category) => [category.key, category])
);

export function listToolCategories(): readonly ToolCategoryDefinition[] {
  return TOOL_CATEGORIES;
}

export function listToolCategorySummaries(): ToolCategorySummary[] {
  return TOOL_CATEGORIES.map((category) => ({
    key: category.key,
    label: category.label,
    description: category.description,
  }));
}

export function getToolCategoryDefinition(
  key: ToolCategory
): ToolCategoryDefinition {
  const category = categoryByKey.get(key);

  if (!category) {
    throw new Error(`Unknown tool category: ${key}`);
  }

  return category;
}

export function getToolCategorySummary(key: ToolCategory): ToolCategorySummary {
  const {
    key: categoryKey,
    label,
    description,
  } = getToolCategoryDefinition(key);

  return {
    key: categoryKey,
    label,
    description,
  };
}
