import { z } from "zod";

/**
 * Stable tool identifier: `{segment}.{segment}…@{version}`.
 *
 * @example `rapidapi.zillow.searchListings@1`
 * @example `analysis.calculateMetrics@1`
 */
const toolKeyPattern = /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+@[1-9][0-9]*$/;

export const toolKeySchema = z
  .string()
  .regex(
    toolKeyPattern,
    "Tool key must use lowercase dotted segments followed by @ and a positive version number.",
  );

export type ToolKey = z.infer<typeof toolKeySchema>;

export const toolCategorySchema = z.enum([
  "search",
  "enrich",
  "analyze",
  "summarize",
]);

export type ToolCategory = z.infer<typeof toolCategorySchema>;

export const toolArtefactTypeSchema = z.enum([
  "listings",
  "propertyDetails",
  "comparables",
  "rentEstimates",
  "metrics",
  "scores",
  "areaAggregates",
  "summary",
]);

export type ToolArtefactType = z.infer<typeof toolArtefactTypeSchema>;

export const toolIconKeySchema = z.string().min(1);

export type ToolIconKey = z.infer<typeof toolIconKeySchema>;

export const toolTagSchema = z
  .string()
  .min(1)
  .transform((value) => value.toLowerCase());

export const toolTagsSchema = z.array(toolTagSchema).default([]);

export type ToolTags = z.infer<typeof toolTagsSchema>;

export const inspectorComponentKeySchema = z
  .string()
  .regex(
    /^[a-z][a-zA-Z0-9]*$/,
    "Inspector component key must be camelCase starting with a lowercase letter.",
  );

export type InspectorComponentKey = z.infer<typeof inspectorComponentKeySchema>;

export const jsonSchemaDocumentSchema = z.record(z.string(), z.unknown());

export type JsonSchemaDocument = z.infer<typeof jsonSchemaDocumentSchema>;

const toolDefinitionMetadataFields = {
  key: toolKeySchema,
  name: z.string().min(1),
  description: z.string().min(1),
  category: toolCategorySchema,
  iconKey: toolIconKeySchema,
  tags: toolTagsSchema,
  accepts: z.array(toolArtefactTypeSchema),
  produces: z.array(toolArtefactTypeSchema),
  inspectorComponentKey: inspectorComponentKeySchema,
} as const;

export const toolDefinitionMetadataSchema = z.object({
  ...toolDefinitionMetadataFields,
  executorKey: toolKeySchema.optional(),
});

export type ToolDefinitionMetadata = z.infer<typeof toolDefinitionMetadataSchema>;

export const toolManifestSchema = toolDefinitionMetadataSchema.extend({
  executorKey: toolKeySchema,
  configSchemaJson: jsonSchemaDocumentSchema,
  inputSchemaJson: jsonSchemaDocumentSchema,
  outputSchemaJson: jsonSchemaDocumentSchema,
});

export type ToolManifest = z.infer<typeof toolManifestSchema>;

/**
 * Code-first registry entry for a workflow tool. Execution lives in the executor
 * registry (Story 6.2.x); this shape is metadata and validation only.
 */
export type ToolDefinition<
  TConfig = unknown,
  TInput = unknown,
  TOutput = unknown,
> = ToolDefinitionMetadata & {
  configSchema: z.ZodType<TConfig>;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
};

export function resolveExecutorKey(definition: ToolDefinitionMetadata): ToolKey {
  return definition.executorKey ?? definition.key;
}

export function createToolManifest<
  TConfig,
  TInput,
  TOutput,
>(definition: ToolDefinition<TConfig, TInput, TOutput>): ToolManifest {
  return toolManifestSchema.parse({
    key: definition.key,
    name: definition.name,
    description: definition.description,
    category: definition.category,
    iconKey: definition.iconKey,
    tags: definition.tags ?? [],
    accepts: definition.accepts,
    produces: definition.produces,
    inspectorComponentKey: definition.inspectorComponentKey,
    executorKey: resolveExecutorKey(definition),
    configSchemaJson: z.toJSONSchema(definition.configSchema),
    inputSchemaJson: z.toJSONSchema(definition.inputSchema),
    outputSchemaJson: z.toJSONSchema(definition.outputSchema),
  });
}

export function defineToolDefinition<
  TConfig,
  TInput,
  TOutput,
>(
  definition: ToolDefinition<TConfig, TInput, TOutput>,
): ToolDefinition<TConfig, TInput, TOutput> {
  toolDefinitionMetadataSchema.parse(definition);
  return definition;
}
