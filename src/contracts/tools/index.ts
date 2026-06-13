/**
 * Tool contracts: `/api/v1/tools` I/O and tool-registry shapes.
 *
 * @see Naming and import rules in `src/contracts/index.ts`
 */

export {
  createToolManifest,
  defineToolDefinition,
  inspectorComponentKeySchema,
  jsonSchemaDocumentSchema,
  resolveExecutorKey,
  toolArtefactTypeSchema,
  toolCategorySchema,
  toolDefinitionMetadataSchema,
  toolIconKeySchema,
  toolKeySchema,
  toolManifestSchema,
  toolTagSchema,
  toolTagsSchema,
  type InspectorComponentKey,
  type JsonSchemaDocument,
  type ToolArtefactType,
  type ToolCategory,
  type ToolDefinition,
  type ToolDefinitionMetadata,
  type ToolIconKey,
  type ToolKey,
  type ToolManifest,
  type ToolTags,
} from "@/contracts/tools/internal";
export {
  TOOL_CATEGORIES,
  getToolCategoryDefinition,
  getToolCategorySummary,
  listToolCategories,
  listToolCategorySummaries,
  toolCategoryDefinitionSchema,
  toolCategorySummarySchema,
  type ToolCategoryDefinition,
  type ToolCategorySummary,
} from "@/contracts/tools/categories";
