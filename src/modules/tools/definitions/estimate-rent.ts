import { z } from "zod";

import { defineToolDefinition } from "@/contracts/tools";
import {
  toolInputPlaceholderSchema,
  toolOutputPlaceholderSchema,
} from "@/modules/tools/schemas/placeholders";

export const estimateRentConfigSchema = z.object({
  includeRange: z.boolean().default(true),
});

export type EstimateRentConfig = z.infer<typeof estimateRentConfigSchema>;

export const estimateRentTool = defineToolDefinition({
  key: "rapidapi.zillow.estimateRent@1",
  name: "Estimate Rent",
  description: "Fetch rent estimates to support income-based analysis.",
  category: "enrich",
  iconKey: "dollarSign",
  tags: ["rent", "estimate", "income"],
  accepts: ["propertyDetails"],
  produces: ["rentEstimates"],
  inspectorComponentKey: "estimateRent",
  configSchema: estimateRentConfigSchema,
  inputSchema: toolInputPlaceholderSchema,
  outputSchema: toolOutputPlaceholderSchema,
});
