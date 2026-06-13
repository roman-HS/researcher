import { z } from "zod";

import { defineToolDefinition } from "@/contracts/tools";
import {
  toolInputPlaceholderSchema,
  toolOutputPlaceholderSchema,
} from "@/modules/tools/schemas/placeholders";

export const generateSummaryConfigSchema = z.object({
  includeMarkdown: z.boolean().default(true),
});

export type GenerateSummaryConfig = z.infer<typeof generateSummaryConfigSchema>;

export const generateSummaryTool = defineToolDefinition({
  key: "ai.generateSummary@1",
  name: "Generate Summary",
  description: "Create a readable summary from deterministic workflow results.",
  category: "summarize",
  iconKey: "fileText",
  tags: ["summary", "report", "results"],
  accepts: ["scores", "areaAggregates"],
  produces: ["summary"],
  inspectorComponentKey: "generateSummary",
  configSchema: generateSummaryConfigSchema,
  inputSchema: toolInputPlaceholderSchema,
  outputSchema: toolOutputPlaceholderSchema,
});
