import { z } from "zod";

import { defineToolDefinition } from "@/contracts/tools";
import {
  toolInputPlaceholderSchema,
  toolOutputPlaceholderSchema,
} from "@/modules/tools/schemas/placeholders";

export const aggregateAreaMetricKeys = [
  "capRate",
  "cashOnCashReturn",
  "grossRentMultiplier",
  "monthlyCashFlow",
  "estimatedMonthlyIncome",
  "estimatedMonthlyExpenses",
  "monthlyMortgagePayment",
] as const;

export const aggregateAreaMetricKeySchema = z.enum(aggregateAreaMetricKeys);

export type AggregateAreaMetricKey = z.infer<typeof aggregateAreaMetricKeySchema>;

export const DEFAULT_AGGREGATE_AREA_METRICS = [
  "capRate",
  "cashOnCashReturn",
  "monthlyCashFlow",
] as const satisfies readonly AggregateAreaMetricKey[];

export const aggregateAreaGroupingLevels = ["zip", "city", "other"] as const;

export const aggregateAreaConfigSchema = z.object({
  groupingLevel: z.enum(aggregateAreaGroupingLevels).default("zip"),
  minimumSampleSize: z.number().int().min(1).default(3),
  aggregateMetrics: z
    .array(aggregateAreaMetricKeySchema)
    .min(1, "Select at least one metric to aggregate.")
    .default([...DEFAULT_AGGREGATE_AREA_METRICS]),
});

export type AggregateAreaConfig = z.infer<typeof aggregateAreaConfigSchema>;

/** Binding-free config values passed to the executor after Story 7.2.4 resolution. */
export const aggregateAreaResolvedConfigSchema = aggregateAreaConfigSchema;

export type AggregateAreaResolvedConfig = z.infer<
  typeof aggregateAreaResolvedConfigSchema
>;

export const aggregateAreaToolKey = "analysis.aggregateArea@1" as const;

export const aggregateAreaTool = defineToolDefinition({
  key: aggregateAreaToolKey,
  name: "Aggregate Area",
  description: "Roll up property results into area-level investment summaries.",
  category: "analyze",
  iconKey: "mapPin",
  tags: ["area", "aggregate", "zip"],
  accepts: ["metrics", "scores"],
  produces: ["areaAggregates"],
  inspectorComponentKey: "aggregateArea",
  configSchema: aggregateAreaConfigSchema,
  inputSchema: toolInputPlaceholderSchema,
  outputSchema: toolOutputPlaceholderSchema,
});
