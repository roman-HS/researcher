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

/** Binding-free config values passed to the executor after Story 7.2.4 resolution. */
export const estimateRentResolvedConfigSchema = z.object({
  includeRange: z.boolean().default(true),
});

export type EstimateRentResolvedConfig = z.infer<
  typeof estimateRentResolvedConfigSchema
>;

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
