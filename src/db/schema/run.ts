import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import type {
  AreaAggregate,
  MetricBundle,
  PropertyScore,
} from "@/contracts/domain/analysis";
import type {
  ComparableSet,
  PropertyDetail,
  PropertyListing,
  RentEstimate,
} from "@/contracts/domain/property";
import type { Address } from "@/contracts/domain/primitives";

import { user } from "./auth";
import {
  entityIdColumn,
  foreignEntityIdColumn,
  jsonPayloadColumn,
  standardTimestampColumns,
  type JsonObject,
} from "./helpers/columns";
import { createStatusEnum } from "./helpers/enums";
import { workspaces } from "./workspace";
import { workflows, workflowVersions } from "./workflow";

/**
 * Postgres enum literals must match `src/contracts/runs/lifecycle.ts`.
 */
export const workflowRunStatusEnum = createStatusEnum("workflow_run_status", [
  "pending",
  "running",
  "succeeded",
  "partial",
  "failed",
  "canceled",
]);

export const workflowRunStepStatusEnum = createStatusEnum(
  "workflow_run_step_status",
  ["pending", "running", "succeeded", "failed", "skipped"],
);

/**
 * Postgres enum literals must match `areaGroupingLevelSchema` in
 * `src/contracts/domain/analysis.ts`.
 */
export const areaGroupingLevelEnum = createStatusEnum("area_grouping_level", [
  "zip",
  "city",
  "other",
]);

export type RunAddressSummaryJson = Pick<
  Address,
  "line1" | "line2" | "city" | "state" | "postalCode"
>;

export type RunPropertyResultErrorsJson = JsonObject;

export const workflowRuns = pgTable(
  "workflow_runs",
  {
    id: entityIdColumn(),
    workspaceId: foreignEntityIdColumn("workspaceId")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    workflowId: foreignEntityIdColumn("workflowId")
      .notNull()
      .references(() => workflows.id, { onDelete: "restrict" }),
    workflowVersionId: foreignEntityIdColumn("workflowVersionId")
      .notNull()
      .references(() => workflowVersions.id, { onDelete: "restrict" }),
    createdByUserId: foreignEntityIdColumn("createdByUserId")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: workflowRunStatusEnum("status").notNull().default("pending"),
    inputJson: jsonPayloadColumn("inputJson").notNull().default({}),
    outputSummaryJson: jsonPayloadColumn("outputSummaryJson"),
    errorJson: jsonPayloadColumn("errorJson"),
    startedAt: timestamp("startedAt", { withTimezone: true, mode: "date" }),
    completedAt: timestamp("completedAt", { withTimezone: true, mode: "date" }),
    ...standardTimestampColumns,
  },
  (table) => [
    index("workflow_runs_workspace_id_idx").on(table.workspaceId),
    index("workflow_runs_workflow_id_idx").on(table.workflowId),
    index("workflow_runs_status_idx").on(table.status),
    index("workflow_runs_created_at_idx").on(table.createdAt),
    index("workflow_runs_workspace_id_status_created_at_idx").on(
      table.workspaceId,
      table.status,
      table.createdAt,
    ),
  ],
);

export const workflowRunSteps = pgTable(
  "workflow_run_steps",
  {
    id: entityIdColumn(),
    runId: foreignEntityIdColumn("runId")
      .notNull()
      .references(() => workflowRuns.id, { onDelete: "cascade" }),
    stepNodeId: text("stepNodeId").notNull(),
    toolKey: text("toolKey").notNull(),
    status: workflowRunStepStatusEnum("status").notNull().default("pending"),
    inputJson: jsonPayloadColumn("inputJson"),
    outputJson: jsonPayloadColumn("outputJson"),
    warningsJson: jsonPayloadColumn("warningsJson"),
    errorJson: jsonPayloadColumn("errorJson"),
    startedAt: timestamp("startedAt", { withTimezone: true, mode: "date" }),
    completedAt: timestamp("completedAt", { withTimezone: true, mode: "date" }),
    ...standardTimestampColumns,
  },
  (table) => [
    index("workflow_run_steps_run_id_idx").on(table.runId),
    index("workflow_run_steps_run_id_status_idx").on(table.runId, table.status),
  ],
);

export const runPropertyResults = pgTable(
  "run_property_results",
  {
    id: entityIdColumn(),
    runId: foreignEntityIdColumn("runId")
      .notNull()
      .references(() => workflowRuns.id, { onDelete: "cascade" }),
    propertyKey: text("propertyKey").notNull(),
    displayOrder: integer("displayOrder").notNull(),
    totalScore: numeric("totalScore", { precision: 5, scale: 2 }),
    listPriceCents: bigint("listPriceCents", { mode: "number" }),
    capRate: numeric("capRate", { precision: 8, scale: 4 }),
    monthlyCashFlow: numeric("monthlyCashFlow", { precision: 14, scale: 2 }),
    addressSummaryJson: jsonPayloadColumn<RunAddressSummaryJson>(
      "addressSummaryJson",
    ),
    listingJson: jsonPayloadColumn<PropertyListing>("listingJson"),
    detailJson: jsonPayloadColumn<PropertyDetail>("detailJson"),
    rentEstimateJson: jsonPayloadColumn<RentEstimate>("rentEstimateJson"),
    comparablesJson: jsonPayloadColumn<ComparableSet>("comparablesJson"),
    metricsJson: jsonPayloadColumn<MetricBundle>("metricsJson"),
    scoreJson: jsonPayloadColumn<PropertyScore>("scoreJson"),
    warningsJson: jsonPayloadColumn("warningsJson"),
    errorsJson: jsonPayloadColumn<RunPropertyResultErrorsJson>("errorsJson"),
    ...standardTimestampColumns,
  },
  (table) => [
    index("run_property_results_run_id_idx").on(table.runId),
    index("run_property_results_run_id_display_order_idx").on(
      table.runId,
      table.displayOrder,
    ),
    index("run_property_results_run_id_total_score_idx").on(
      table.runId,
      table.totalScore,
    ),
  ],
);

export const runAreaResults = pgTable(
  "run_area_results",
  {
    id: entityIdColumn(),
    runId: foreignEntityIdColumn("runId")
      .notNull()
      .references(() => workflowRuns.id, { onDelete: "cascade" }),
    areaKey: text("areaKey").notNull(),
    groupingLevel: areaGroupingLevelEnum("groupingLevel").notNull(),
    propertyCount: integer("propertyCount").notNull(),
    rank: integer("rank"),
    meetsMinimumSample: boolean("meetsMinimumSample").notNull(),
    aggregatesJson: jsonPayloadColumn<AreaAggregate>("aggregatesJson").notNull(),
    warningsJson: jsonPayloadColumn("warningsJson"),
    ...standardTimestampColumns,
  },
  (table) => [
    index("run_area_results_run_id_idx").on(table.runId),
    index("run_area_results_run_id_rank_idx").on(table.runId, table.rank),
  ],
);

export const runIdempotencyKeys = pgTable(
  "run_idempotency_keys",
  {
    id: entityIdColumn(),
    workspaceId: foreignEntityIdColumn("workspaceId")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    userId: foreignEntityIdColumn("userId")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    idempotencyKey: text("idempotencyKey").notNull(),
    requestHash: text("requestHash").notNull(),
    runId: foreignEntityIdColumn("runId")
      .notNull()
      .references(() => workflowRuns.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }),
    ...standardTimestampColumns,
  },
  (table) => [
    uniqueIndex("run_idempotency_keys_workspace_user_key_unique").on(
      table.workspaceId,
      table.userId,
      table.idempotencyKey,
    ),
    index("run_idempotency_keys_run_id_idx").on(table.runId),
  ],
);

export const workflowRunsRelations = relations(workflowRuns, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [workflowRuns.workspaceId],
    references: [workspaces.id],
  }),
  workflow: one(workflows, {
    fields: [workflowRuns.workflowId],
    references: [workflows.id],
  }),
  workflowVersion: one(workflowVersions, {
    fields: [workflowRuns.workflowVersionId],
    references: [workflowVersions.id],
  }),
  createdBy: one(user, {
    fields: [workflowRuns.createdByUserId],
    references: [user.id],
  }),
  steps: many(workflowRunSteps),
  propertyResults: many(runPropertyResults),
  areaResults: many(runAreaResults),
  idempotencyKeys: many(runIdempotencyKeys),
}));

export const workflowRunStepsRelations = relations(
  workflowRunSteps,
  ({ one }) => ({
    run: one(workflowRuns, {
      fields: [workflowRunSteps.runId],
      references: [workflowRuns.id],
    }),
  }),
);

export const runPropertyResultsRelations = relations(
  runPropertyResults,
  ({ one }) => ({
    run: one(workflowRuns, {
      fields: [runPropertyResults.runId],
      references: [workflowRuns.id],
    }),
  }),
);

export const runAreaResultsRelations = relations(runAreaResults, ({ one }) => ({
  run: one(workflowRuns, {
    fields: [runAreaResults.runId],
    references: [workflowRuns.id],
  }),
}));

export const runIdempotencyKeysRelations = relations(
  runIdempotencyKeys,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [runIdempotencyKeys.workspaceId],
      references: [workspaces.id],
    }),
    user: one(user, {
      fields: [runIdempotencyKeys.userId],
      references: [user.id],
    }),
    run: one(workflowRuns, {
      fields: [runIdempotencyKeys.runId],
      references: [workflowRuns.id],
    }),
  }),
);
