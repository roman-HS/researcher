import { z } from "zod";

import { defineToolDefinition } from "@/contracts/tools";
import {
  toolInputPlaceholderSchema,
  toolOutputPlaceholderSchema,
} from "@/modules/tools/schemas/placeholders";

export const calculateMetricsConfigSchema = z.object({
  downPaymentPercent: z.number().min(0).max(100).default(20),
  interestRateAnnual: z.number().min(0).max(100).default(7),
  loanTermYears: z.number().int().min(1).max(50).default(30),
  vacancyRate: z.number().min(0).max(100).default(5),
  repairsRate: z.number().min(0).max(100).default(5),
  propertyManagementRate: z.number().min(0).max(100).default(8),
  monthlyInsurance: z.number().min(0).default(150),
  monthlyHoa: z.number().min(0).default(0),
  propertyTaxRate: z.number().min(0).max(100).default(1.2),
  closingCostsRate: z.number().min(0).max(100).default(3),
  includeCashFlow: z.boolean().default(true),
});

export type CalculateMetricsConfig = z.infer<typeof calculateMetricsConfigSchema>;

/** Binding-free config values passed to the executor after Story 7.2.4 resolution. */
export const calculateMetricsResolvedConfigSchema = calculateMetricsConfigSchema;

export type CalculateMetricsResolvedConfig = z.infer<
  typeof calculateMetricsResolvedConfigSchema
>;

export const calculateMetricsToolKey = "analysis.calculateMetrics@1" as const;

export const calculateMetricsTool = defineToolDefinition({
  key: calculateMetricsToolKey,
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
