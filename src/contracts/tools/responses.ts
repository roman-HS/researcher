import { z } from "zod";

import { toolCategorySummarySchema } from "@/contracts/tools/categories";
import {
  inspectorComponentKeySchema,
  jsonSchemaDocumentSchema,
  toolArtefactTypeSchema,
  toolCategorySchema,
  toolIconKeySchema,
  toolKeySchema,
  toolTagsSchema,
} from "@/contracts/tools/internal";

export const toolDiscoveryItemSchema = z.object({
  key: toolKeySchema,
  name: z.string().min(1),
  description: z.string().min(1),
  category: toolCategorySchema,
  iconKey: toolIconKeySchema,
  tags: toolTagsSchema,
  accepts: z.array(toolArtefactTypeSchema),
  produces: z.array(toolArtefactTypeSchema),
  inspectorComponentKey: inspectorComponentKeySchema,
  configSchemaJson: jsonSchemaDocumentSchema,
  defaultConfig: z.record(z.string(), z.unknown()),
});

export type ToolDiscoveryItem = z.infer<typeof toolDiscoveryItemSchema>;

export const listToolsResponseSchema = z.object({
  tools: z.array(toolDiscoveryItemSchema),
  categories: z.array(toolCategorySummarySchema),
});

export type ListToolsResponse = z.infer<typeof listToolsResponseSchema>;
