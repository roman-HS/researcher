import type { ListToolsResponse } from "@/contracts/tools/responses";

/**
 * Tool metadata passed from the builder page into the React Flow canvas.
 *
 * @see Story 5.2.2 — Implement custom workflow node component
 */

export type WorkflowBuilderToolMetadata = {
  name: string;
  categoryLabel: string;
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
        categoryLabel:
          categoryLabelByKey.get(tool.category) ?? tool.category,
      },
    ]),
  );
}
