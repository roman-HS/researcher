import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import {
  entityIdColumn,
  foreignEntityIdColumn,
  jsonPayloadColumn,
  standardArchiveColumn,
  standardTimestampColumns,
} from "./helpers/columns";
import { createStatusEnum } from "./helpers/enums";
import { workspaces } from "./workspace";

/**
 * Postgres enum literals must match `src/contracts/workflows/lifecycle.ts`.
 */
export const workflowStatusEnum = createStatusEnum("workflow_status", [
  "active",
  "archived",
]);

export const workflowVersionStateEnum = createStatusEnum("workflow_version_state", [
  "draft",
  "published",
  "archived",
]);

export const workflows = pgTable(
  "workflows",
  {
    id: entityIdColumn(),
    workspaceId: foreignEntityIdColumn("workspaceId")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: workflowStatusEnum("status").notNull().default("active"),
    createdByUserId: foreignEntityIdColumn("createdByUserId")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    ...standardTimestampColumns,
    ...standardArchiveColumn,
  },
  (table) => [
    index("workflows_workspace_id_status_idx").on(
      table.workspaceId,
      table.status,
    ),
    uniqueIndex("workflows_workspace_name_active_unique")
      .on(table.workspaceId, table.name)
      .where(sql`${table.status} = 'active'`),
  ],
);

export const workflowVersions = pgTable(
  "workflow_versions",
  {
    id: entityIdColumn(),
    workflowId: foreignEntityIdColumn("workflowId")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    versionNumber: integer("versionNumber").notNull(),
    state: workflowVersionStateEnum("state").notNull().default("draft"),
    definitionJson: jsonPayloadColumn("definitionJson").notNull().default({}),
    compiledPlanJson: jsonPayloadColumn("compiledPlanJson"),
    publishedAt: timestamp("publishedAt", { withTimezone: true, mode: "date" }),
    createdByUserId: foreignEntityIdColumn("createdByUserId")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    ...standardTimestampColumns,
  },
  (table) => [
    uniqueIndex("workflow_versions_workflow_id_version_number_unique").on(
      table.workflowId,
      table.versionNumber,
    ),
    uniqueIndex("workflow_versions_workflow_id_draft_unique")
      .on(table.workflowId)
      .where(sql`${table.state} = 'draft'`),
    index("workflow_versions_workflow_id_state_idx").on(
      table.workflowId,
      table.state,
    ),
  ],
);

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [workflows.workspaceId],
    references: [workspaces.id],
  }),
  createdBy: one(user, {
    fields: [workflows.createdByUserId],
    references: [user.id],
  }),
  versions: many(workflowVersions),
}));

export const workflowVersionsRelations = relations(
  workflowVersions,
  ({ one }) => ({
    workflow: one(workflows, {
      fields: [workflowVersions.workflowId],
      references: [workflows.id],
    }),
    createdBy: one(user, {
      fields: [workflowVersions.createdByUserId],
      references: [user.id],
    }),
  }),
);
