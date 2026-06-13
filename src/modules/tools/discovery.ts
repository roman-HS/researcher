import {
  getToolCategoryDefinition,
  listToolCategorySummaries,
  listToolsResponseSchema,
  type ListToolsResponse,
  type ToolCategory,
} from "@/contracts/tools";
import {
  getDefaultToolConfig,
  getToolManifest,
  listToolDefinitions,
  listToolDefinitionsByCategory,
} from "@/modules/tools/registry";

export type ListToolsForDiscoveryOptions = {
  category?: ToolCategory;
};

function compareDiscoveryTools(
  leftKey: string,
  leftName: string,
  leftCategory: ToolCategory,
  rightKey: string,
  rightName: string,
  rightCategory: ToolCategory,
): number {
  const leftSortOrder = getToolCategoryDefinition(leftCategory).sortOrder;
  const rightSortOrder = getToolCategoryDefinition(rightCategory).sortOrder;

  if (leftSortOrder !== rightSortOrder) {
    return leftSortOrder - rightSortOrder;
  }

  const nameComparison = leftName.localeCompare(rightName, undefined, {
    sensitivity: "base",
  });

  if (nameComparison !== 0) {
    return nameComparison;
  }

  return leftKey.localeCompare(rightKey, undefined, { sensitivity: "base" });
}

export function listToolsForDiscovery(
  options: ListToolsForDiscoveryOptions = {},
): ListToolsResponse {
  const definitions = options.category
    ? listToolDefinitionsByCategory(options.category)
    : [...listToolDefinitions()];

  const tools = definitions
    .map((definition) => {
      const manifest = getToolManifest(definition.key);
      const defaultConfig = getDefaultToolConfig(definition.key);

      return {
        key: manifest.key,
        name: manifest.name,
        description: manifest.description,
        category: manifest.category,
        iconKey: manifest.iconKey,
        tags: manifest.tags,
        accepts: manifest.accepts,
        produces: manifest.produces,
        inspectorComponentKey: manifest.inspectorComponentKey,
        configSchemaJson: manifest.configSchemaJson,
        defaultConfig:
          typeof defaultConfig === "object" &&
          defaultConfig !== null &&
          !Array.isArray(defaultConfig)
            ? (defaultConfig as Record<string, unknown>)
            : {},
      };
    })
    .sort((left, right) =>
      compareDiscoveryTools(
        left.key,
        left.name,
        left.category,
        right.key,
        right.name,
        right.category,
      ),
    );

  return listToolsResponseSchema.parse({
    tools,
    categories: listToolCategorySummaries(),
  });
}
