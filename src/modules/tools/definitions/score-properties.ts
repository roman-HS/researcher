import { z } from "zod";

import { defineToolDefinition } from "@/contracts/tools";
import {
  toolInputPlaceholderSchema,
  toolOutputPlaceholderSchema,
} from "@/modules/tools/schemas/placeholders";

export const scorePropertiesConfigSchema = z.object({
  minimumScore: z.number().min(0).max(100).default(0),
});

export type ScorePropertiesConfig = z.infer<typeof scorePropertiesConfigSchema>;

export const scorePropertiesTool = defineToolDefinition({
  key: "analysis.scoreProperties@1",
  name: "Score Properties",
  description: "Rank properties using transparent scoring weights and thresholds.",
  category: "analyze",
  iconKey: "star",
  tags: ["score", "ranking", "analysis"],
  accepts: ["metrics"],
  produces: ["scores"],
  inspectorComponentKey: "scoreProperties",
  configSchema: scorePropertiesConfigSchema,
  inputSchema: toolInputPlaceholderSchema,
  outputSchema: toolOutputPlaceholderSchema,
});
