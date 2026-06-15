import { z } from "zod";

import {
  areaAggregateSchema,
  metricBundleSchema,
  propertyScoreSchema,
  workflowSummarySchema,
} from "@/contracts/domain/analysis";
import {
  comparableSetSchema,
  propertyDetailSchema,
  propertyListingSchema,
  rentEstimateSchema,
} from "@/contracts/domain/property";

import { propertyKeySchema } from "@/contracts/runs/property-key";

/**
 * In-memory workflow execution state passed between tool executors.
 *
 * @see Story 6.2.2 — Create execution working-set model
 */

export const EXECUTION_WORKING_SET_VERSION = 1 as const;

const executionWorkingSetMapFields = {
  propertyOrder: z.array(propertyKeySchema).default([]),
  listingsByKey: z
    .record(propertyKeySchema, propertyListingSchema)
    .default({}),
  detailsByKey: z.record(propertyKeySchema, propertyDetailSchema).default({}),
  comparablesByKey: z
    .record(propertyKeySchema, comparableSetSchema)
    .default({}),
  rentEstimatesByKey: z
    .record(propertyKeySchema, rentEstimateSchema)
    .default({}),
  metricsByKey: z.record(propertyKeySchema, metricBundleSchema).default({}),
  scoresByKey: z.record(propertyKeySchema, propertyScoreSchema).default({}),
  areaAggregatesByKey: z
    .record(z.string().min(1), areaAggregateSchema)
    .default({}),
  summary: workflowSummarySchema.optional(),
} as const;

export const executionWorkingSetSchema = z
  .object({
    version: z.literal(EXECUTION_WORKING_SET_VERSION),
    ...executionWorkingSetMapFields,
  })
  .strict();

export type ExecutionWorkingSet = z.infer<typeof executionWorkingSetSchema>;

/**
 * Patch fields intentionally omit schema defaults. Using
 * `executionWorkingSetSchema.partial()` would inject empty defaults during parse
 * and wipe `propertyOrder` when executors only return `*ByKey` updates.
 */
const executionWorkingSetPatchFields = {
  propertyOrder: z.array(propertyKeySchema).optional(),
  listingsByKey: z.record(propertyKeySchema, propertyListingSchema).optional(),
  detailsByKey: z.record(propertyKeySchema, propertyDetailSchema).optional(),
  comparablesByKey: z
    .record(propertyKeySchema, comparableSetSchema)
    .optional(),
  rentEstimatesByKey: z
    .record(propertyKeySchema, rentEstimateSchema)
    .optional(),
  metricsByKey: z.record(propertyKeySchema, metricBundleSchema).optional(),
  scoresByKey: z.record(propertyKeySchema, propertyScoreSchema).optional(),
  areaAggregatesByKey: z
    .record(z.string().min(1), areaAggregateSchema)
    .optional(),
  summary: workflowSummarySchema.optional(),
} as const;

/** Partial update merged into the current working set by the step dispatcher. */
export const executionWorkingSetPatchSchema = z
  .object(executionWorkingSetPatchFields)
  .strict();

export type ExecutionWorkingSetPatch = z.infer<
  typeof executionWorkingSetPatchSchema
>;

function mergeKeyedRecords<TValue>(
  base: Readonly<Record<string, TValue>>,
  patch: Readonly<Record<string, TValue>> | undefined,
): Record<string, TValue> {
  if (!patch) {
    return { ...base };
  }

  return {
    ...base,
    ...patch,
  };
}

/**
 * Merge a patch into the current working set.
 *
 * - `*ByKey` maps shallow-merge by key; patch entries replace the full value
 *   for that key.
 * - `propertyOrder` and `summary` replace wholesale when present on the patch.
 */
export function mergeExecutionWorkingSet(
  base: ExecutionWorkingSet,
  patch: ExecutionWorkingSetPatch,
): ExecutionWorkingSet {
  return executionWorkingSetSchema.parse({
    version: base.version,
    propertyOrder:
      "propertyOrder" in patch ? patch.propertyOrder : base.propertyOrder,
    summary: "summary" in patch ? patch.summary : base.summary,
    listingsByKey: mergeKeyedRecords(base.listingsByKey, patch.listingsByKey),
    detailsByKey: mergeKeyedRecords(base.detailsByKey, patch.detailsByKey),
    comparablesByKey: mergeKeyedRecords(
      base.comparablesByKey,
      patch.comparablesByKey,
    ),
    rentEstimatesByKey: mergeKeyedRecords(
      base.rentEstimatesByKey,
      patch.rentEstimatesByKey,
    ),
    metricsByKey: mergeKeyedRecords(base.metricsByKey, patch.metricsByKey),
    scoresByKey: mergeKeyedRecords(base.scoresByKey, patch.scoresByKey),
    areaAggregatesByKey: mergeKeyedRecords(
      base.areaAggregatesByKey,
      patch.areaAggregatesByKey,
    ),
  });
}

export function createEmptyExecutionWorkingSet(): ExecutionWorkingSet {
  return executionWorkingSetSchema.parse({
    version: EXECUTION_WORKING_SET_VERSION,
  });
}

export function parseExecutionWorkingSet(value: unknown): ExecutionWorkingSet {
  return executionWorkingSetSchema.parse(value);
}

export function parseExecutionWorkingSetPatch(
  value: unknown,
): ExecutionWorkingSetPatch {
  return executionWorkingSetPatchSchema.parse(value);
}
