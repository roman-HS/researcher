import { z } from "zod";

import { defineToolDefinition } from "@/contracts/tools";
import {
  toolInputPlaceholderSchema,
  toolOutputPlaceholderSchema,
} from "@/modules/tools/schemas/placeholders";

export const calculateMetricsConfigSchema = z.object({
  includeCashFlow: z.boolean().default(true),
});

export type CalculateMetricsConfig = z.infer<typeof calculateMetricsConfigSchema>;

export const calculateMetricsTool = defineToolDefinition({
  key: "analysis.calculateMetrics@1",
  name: "Calculate Metrics",
  description: "Compute investment metrics such as cap rate and cash flow.",
  category: "analyze",
  iconKey: "calculator",
  tags: ["metrics", "analysis", "investment"],
  accepts: ["propertyDetails", "rentEstimates"],
  produces: ["metrics"],
  inspectorComponentKey: "calculateMetrics",
  configSchema: calculateMetricsConfigSchema,
  inputSchema: toolInputPlaceholderSchema,
  outputSchema: toolOutputPlaceholderSchema,
});
