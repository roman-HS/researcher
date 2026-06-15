import { z } from "zod";

import {
  areaAggregateSchema,
  areaGroupingLevelSchema,
  metricBundleSchema,
  propertyScoreSchema,
  workflowSummarySchema,
} from "@/contracts/domain/analysis";
import {
  addressSchema,
  domainEntityIdSchema,
  isoDateTimeSchema,
} from "@/contracts/domain/primitives";
import {
  comparableSetSchema,
  propertyDetailSchema,
  propertyListingSchema,
  rentEstimateSchema,
} from "@/contracts/domain/property";
import { toolKeySchema } from "@/contracts/tools/internal";
import { workflowRuntimeInputsSchema } from "@/contracts/workflows/runtime-inputs";
import { workflowNameSchema } from "@/contracts/workflows/requests";

import {
  toolExecutorItemErrorSchema,
  toolExecutorResolvedConfigSchema,
  toolExecutorRuntimeInputValuesSchema,
  toolExecutorWarningSchema,
} from "./executors";
import { workflowRunStatusSchema, workflowRunStepStatusSchema } from "./lifecycle";

/**
 * `/api/v1/runs` response DTO schemas.
 *
 * @see Story 7.3.3 — Implement run creation API route
 * @see Story 7.5.1 — Implement list runs service and API
 * @see Story 7.5.2 — Implement get run detail service and API
 * @see Story 8.4.1 — Add rerun with same inputs
 */

export const createRunResponseSchema = z.object({
  runId: domainEntityIdSchema,
  status: workflowRunStatusSchema,
  workflowVersionId: domainEntityIdSchema,
  pollAfterMs: z.number().int().positive(),
});

export type CreateRunResponse = z.infer<typeof createRunResponseSchema>;

export const runListItemSchema = z.object({
  runId: domainEntityIdSchema,
  status: workflowRunStatusSchema,
  workflowId: domainEntityIdSchema,
  workflowName: workflowNameSchema,
  workflowVersionId: domainEntityIdSchema,
  workflowVersionNumber: z.number().int().positive(),
  createdAt: isoDateTimeSchema,
  startedAt: isoDateTimeSchema.nullable(),
  completedAt: isoDateTimeSchema.nullable(),
  propertyResultCount: z.number().int().nonnegative().nullable(),
});

export type RunListItem = z.infer<typeof runListItemSchema>;

export const listRunsResponseSchema = z.array(runListItemSchema);

export type ListRunsResponse = z.infer<typeof listRunsResponseSchema>;

export const runDetailUserFacingErrorSchema = z.object({
  code: z.string().min(1),
  userMessage: z.string().min(1),
  stepNodeId: z.string().min(1).optional(),
  toolKey: z.string().min(1).optional(),
  debug: z.record(z.string(), z.unknown()).optional(),
});

export type RunDetailUserFacingError = z.infer<
  typeof runDetailUserFacingErrorSchema
>;

export const runDetailCountsSchema = z.object({
  propertyCount: z.number().int().nonnegative(),
  failedPropertyCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
});

export type RunDetailCounts = z.infer<typeof runDetailCountsSchema>;

export const runDetailStepOutputSummarySchema = z.object({
  propertyCount: z.number().int().nonnegative(),
});

export type RunDetailStepOutputSummary = z.infer<
  typeof runDetailStepOutputSummarySchema
>;

export const runDetailStepOutputSnapshotSchema = z.object({
  summary: runDetailStepOutputSummarySchema.optional(),
  workingSetPatch: z.record(z.string(), z.unknown()).optional(),
  itemErrors: z.array(toolExecutorItemErrorSchema).optional(),
});

export type RunDetailStepOutputSnapshot = z.infer<
  typeof runDetailStepOutputSnapshotSchema
>;

export const runDetailStepTimelineItemSchema = z.object({
  stepId: domainEntityIdSchema.nullable(),
  stepNodeId: z.string().min(1),
  stepTitle: z.string().min(1),
  toolKey: toolKeySchema,
  status: workflowRunStepStatusSchema,
  startedAt: isoDateTimeSchema.nullable(),
  completedAt: isoDateTimeSchema.nullable(),
  durationMs: z.number().int().nonnegative().nullable(),
  error: runDetailUserFacingErrorSchema.nullable(),
  warnings: z.array(toolExecutorWarningSchema),
  outputSummary: runDetailStepOutputSummarySchema.nullable(),
  inputJson: toolExecutorResolvedConfigSchema.nullable().optional(),
  outputJson: runDetailStepOutputSnapshotSchema.nullable().optional(),
});

export type RunDetailStepTimelineItem = z.infer<
  typeof runDetailStepTimelineItemSchema
>;

const runDetailAddressSummarySchema = addressSchema.pick({
  line1: true,
  line2: true,
  city: true,
  state: true,
  postalCode: true,
});

export const runDetailPropertyResultSchema = z.object({
  propertyResultId: domainEntityIdSchema,
  propertyKey: z.string().min(1),
  displayOrder: z.number().int().nonnegative(),
  totalScore: z.number().nullable(),
  listPriceCents: z.number().int().nullable(),
  capRate: z.number().nullable(),
  monthlyCashFlow: z.number().nullable(),
  addressSummary: runDetailAddressSummarySchema.nullable(),
  listing: propertyListingSchema.nullable(),
  detail: propertyDetailSchema.nullable(),
  rentEstimate: rentEstimateSchema.nullable(),
  comparables: comparableSetSchema.nullable(),
  metrics: metricBundleSchema.nullable(),
  score: propertyScoreSchema.nullable(),
  warnings: z.array(z.string()),
  errors: z.array(toolExecutorItemErrorSchema),
});

export type RunDetailPropertyResult = z.infer<
  typeof runDetailPropertyResultSchema
>;

export const runDetailAreaResultSchema = z.object({
  areaResultId: domainEntityIdSchema,
  areaKey: z.string().min(1),
  groupingLevel: areaGroupingLevelSchema,
  propertyCount: z.number().int().nonnegative(),
  rank: z.number().int().positive().nullable(),
  meetsMinimumSample: z.boolean(),
  aggregates: areaAggregateSchema,
  warnings: z.array(z.string()),
});

export type RunDetailAreaResult = z.infer<typeof runDetailAreaResultSchema>;

export const getRunDetailResponseSchema = z.object({
  runId: domainEntityIdSchema,
  status: workflowRunStatusSchema,
  workflowId: domainEntityIdSchema,
  workflowName: workflowNameSchema,
  workflowVersionId: domainEntityIdSchema,
  workflowVersionNumber: z.number().int().positive(),
  sourceRunId: domainEntityIdSchema.nullable(),
  createdAt: isoDateTimeSchema,
  startedAt: isoDateTimeSchema.nullable(),
  completedAt: isoDateTimeSchema.nullable(),
  inputValues: toolExecutorRuntimeInputValuesSchema,
  runtimeInputs: workflowRuntimeInputsSchema,
  error: runDetailUserFacingErrorSchema.nullable(),
  summary: workflowSummarySchema.nullable(),
  counts: runDetailCountsSchema,
  steps: z.array(runDetailStepTimelineItemSchema),
  propertyResults: z.array(runDetailPropertyResultSchema),
  areaResults: z.array(runDetailAreaResultSchema),
});

export type GetRunDetailResponse = z.infer<typeof getRunDetailResponseSchema>;
