import type {
  InspectorComponentKey,
  ToolCategory,
} from "@/contracts/tools/internal";
import type { ListToolsResponse } from "@/contracts/tools/responses";

/**
 * Tool metadata passed from the builder page into the React Flow canvas.
 *
 * @see Story 5.2.2 — Implement custom workflow node component
 * @see Story 5.3.3 — Build selected-step inspector shell
 */

export type WorkflowBuilderToolMetadata = {
  name: string;
  description: string;
  categoryLabel: string;
  categoryKey: ToolCategory;
  iconKey: string;
  inspectorComponentKey: InspectorComponentKey;
  accepts: ListToolsResponse["tools"][number]["accepts"];
  produces: ListToolsResponse["tools"][number]["produces"];
};

export function buildToolMetadataByKey(
  discovery: ListToolsResponse,
): Record<string, WorkflowBuilderToolMetadata> {
  const categoryLabelByKey = new Map(
    discovery.categories.map((category) => [category.key, category.label]),
  );

  return Object.fromEntries(
    discovery.tools.map((tool) => [
      tool.key,
      {
        name: tool.name,
        description: tool.description,
        categoryLabel:
          categoryLabelByKey.get(tool.category) ?? tool.category,
        categoryKey: tool.category,
        iconKey: tool.iconKey,
        inspectorComponentKey: tool.inspectorComponentKey,
        accepts: tool.accepts,
        produces: tool.produces,
      },
    ]),
  );
}
