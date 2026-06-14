import { z } from "zod";

import { providerSourceMetadataSchema } from "@/contracts/domain/primitives";

export const metricReasonCodeSchema = z.enum([
  "missing_rent_estimate",
  "missing_list_price",
  "missing_loan_assumptions",
  "missing_property_details",
  "rent_dependent_metric",
  "price_dependent_metric",
  "cash_flow_disabled",
]);

export type MetricReasonCode = z.infer<typeof metricReasonCodeSchema>;

export const metricValueAvailableSchema = z.object({
  status: z.literal("available"),
  value: z.number(),
});

export const metricValueMissingSchema = z.object({
  status: z.literal("missing"),
  reasonCode: metricReasonCodeSchema,
});

export const metricValueNotApplicableSchema = z.object({
  status: z.literal("not_applicable"),
  reasonCode: metricReasonCodeSchema,
});

export const metricValueSchema = z.discriminatedUnion("status", [
  metricValueAvailableSchema,
  metricValueMissingSchema,
  metricValueNotApplicableSchema,
]);

export type MetricValue = z.infer<typeof metricValueSchema>;

const launchMetricFields = {
  capRate: metricValueSchema.optional(),
  cashOnCashReturn: metricValueSchema.optional(),
  grossRentMultiplier: metricValueSchema.optional(),
  monthlyCashFlow: metricValueSchema.optional(),
  estimatedMonthlyIncome: metricValueSchema.optional(),
  estimatedMonthlyExpenses: metricValueSchema.optional(),
  monthlyMortgagePayment: metricValueSchema.optional(),
} as const;

export const metricBundleSchema = z.object({
  propertyKey: z.string().min(1).optional(),
  subjectSource: providerSourceMetadataSchema.optional(),
  ...launchMetricFields,
  warnings: z.array(z.string()).optional(),
  missingMetricCodes: z.array(z.string()).optional(),
});

export type MetricBundle = z.infer<typeof metricBundleSchema>;

export const scoreReasonCodeSchema = z.enum([
  "missing_rent_estimate",
  "missing_list_price",
  "missing_metrics",
  "strong_cash_flow",
  "weak_cash_flow",
  "strong_cap_rate",
  "weak_cap_rate",
  "strong_cash_on_cash",
  "weak_cash_on_cash",
  "high_expense_ratio",
  "low_rent_to_price",
]);

export type ScoreReasonCode = z.infer<typeof scoreReasonCodeSchema>;

export const scoreReasonSeveritySchema = z.enum([
  "positive",
  "negative",
  "neutral",
]);

export type ScoreReasonSeverity = z.infer<typeof scoreReasonSeveritySchema>;

export const scoreReasonSchema = z.object({
  code: scoreReasonCodeSchema,
  severity: scoreReasonSeveritySchema,
  message: z.string(),
});

export type ScoreReason = z.infer<typeof scoreReasonSchema>;

export const scoreComponentSchema = z.object({
  metricKey: z.string(),
  weight: z.number(),
  contribution: z.number(),
  reasonCodes: z.array(scoreReasonCodeSchema).optional(),
});

export type ScoreComponent = z.infer<typeof scoreComponentSchema>;

const propertyScoreLinkageFields = {
  propertyKey: z.string().min(1).optional(),
  subjectSource: providerSourceMetadataSchema.optional(),
} as const;

export const propertyScoreAvailableSchema = z.object({
  scoreStatus: z.literal("available"),
  ...propertyScoreLinkageFields,
  totalScore: z.number().min(0).max(100),
  components: z.array(scoreComponentSchema),
  reasons: z.array(scoreReasonSchema),
});

export const propertyScoreUnavailableSchema = z.object({
  scoreStatus: z.literal("unavailable"),
  ...propertyScoreLinkageFields,
  unavailableReasonCodes: z.array(scoreReasonCodeSchema).min(1),
  components: z.array(scoreComponentSchema).optional(),
  reasons: z.array(scoreReasonSchema).optional(),
});

export const propertyScoreSchema = z.discriminatedUnion("scoreStatus", [
  propertyScoreAvailableSchema,
  propertyScoreUnavailableSchema,
]);

export type PropertyScore = z.infer<typeof propertyScoreSchema>;

export const areaGroupingLevelSchema = z.enum(["zip", "city", "other"]);

export type AreaGroupingLevel = z.infer<typeof areaGroupingLevelSchema>;

export const areaAggregateSchema = z.object({
  areaKey: z.string().min(1),
  groupingLevel: areaGroupingLevelSchema,
  propertyCount: z.number().int().nonnegative(),
  minimumSampleSize: z.number().int().nonnegative(),
  meetsMinimumSample: z.boolean(),
  ...launchMetricFields,
  metricMedians: z.record(z.string().min(1), metricValueSchema).optional(),
  warnings: z.array(z.string()).optional(),
  rank: z.number().int().positive().optional(),
});

export type AreaAggregate = z.infer<typeof areaAggregateSchema>;

export const summarySectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  bullets: z.array(z.string()),
});

export type SummarySection = z.infer<typeof summarySectionSchema>;

export const topPropertySummarySchema = z.object({
  propertyKey: z.string().min(1).optional(),
  subjectSource: providerSourceMetadataSchema.optional(),
  rank: z.number().int().positive(),
  score: z.number().min(0).max(100).optional(),
  highlightReasonCodes: z.array(scoreReasonCodeSchema),
});

export type TopPropertySummary = z.infer<typeof topPropertySummarySchema>;

export const workflowSummarySchema = z.object({
  title: z.string(),
  sections: z.array(summarySectionSchema),
  topProperties: z.array(topPropertySummarySchema),
  warnings: z.array(z.string()),
  missingDataNotes: z.array(z.string()),
  markdown: z.string().optional(),
});

export type WorkflowSummary = z.infer<typeof workflowSummarySchema>;
